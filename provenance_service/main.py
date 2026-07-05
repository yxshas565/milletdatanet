import json
import sqlite3
import os
import hashlib
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import threading
import sys

DB_PATH = "provenance_service/provenance.db"
app = FastAPI(title="MilletDataNet Provenance Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

training_jobs = {}  # job_id -> {"status": "running"|"done"|"error", "script": str, "log": str, "started_at": str}
job_counter = 0
job_lock = threading.Lock()

SCRIPT_MAP = {
    "baseline": "ml/train_baseline.py",
    "augmented": "ml/train_augmented.py",
    "synthetic": "ml/train_with_synthetic.py",
}

def run_training_job(job_id, script_path, run_type):
    training_jobs[job_id]["status"] = "running"
    try:
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True, text=True, timeout=1800
        )
        training_jobs[job_id]["log"] = (result.stdout or "") + "\n" + (result.stderr or "")

        if result.returncode != 0:
            training_jobs[job_id]["status"] = "error"
            return

        result_file_map = {
            "baseline": "docs/baseline_results.json",
            "augmented": "docs/augmented_results.json",
            "synthetic": "docs/synthetic_augmented_results.json",
        }
        technique_map = {
            "baseline": "unweighted_baseline",
            "augmented": "class_weighted_oversampled",
            "synthetic": "class_weighted_oversampled_plus_diffusion_synthetic",
        }
        result_file = result_file_map[run_type]
        if not os.path.exists(result_file):
            training_jobs[job_id]["status"] = "error"
            training_jobs[job_id]["log"] += f"\n\nExpected results file not found: {result_file}"
            return

        with open(result_file) as f:
            data = json.load(f)

        conn = get_conn()
        ds_row = conn.execute("SELECT id FROM dataset_versions WHERE version_tag='pearl-millet-v1'").fetchone()
        ds_id = ds_row["id"] if ds_row else None
        conn.execute(
            "INSERT INTO training_runs (model_name, dataset_version_id, macro_f1, per_class_report, confusion_matrix, technique, created_at) VALUES (?,?,?,?,?,?,?)",
            (data["model"], ds_id, data["macro_f1"], json.dumps(data["per_class_report"]),
             json.dumps(data["confusion_matrix"]), technique_map[run_type], datetime.utcnow().isoformat())
        )
        conn.commit()
        new_run_id = conn.execute("SELECT last_insert_rowid() as id").fetchone()["id"]
        conn.close()

        training_jobs[job_id]["status"] = "done"
        training_jobs[job_id]["new_run_id"] = new_run_id
        training_jobs[job_id]["macro_f1"] = data["macro_f1"]

    except subprocess.TimeoutExpired:
        training_jobs[job_id]["status"] = "error"
        training_jobs[job_id]["log"] = "Training exceeded 30 minute timeout."
    except Exception as e:
        training_jobs[job_id]["status"] = "error"
        training_jobs[job_id]["log"] = str(e)


def get_conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    conn.execute("""CREATE TABLE IF NOT EXISTS dataset_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version_tag TEXT, manifest_checksum TEXT, notes TEXT, created_at TEXT)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_version_id INTEGER, filepath TEXT, source TEXT,
        label TEXT, label_method TEXT, created_at TEXT)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS training_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_name TEXT, dataset_version_id INTEGER, macro_f1 REAL,
        per_class_report TEXT, confusion_matrix TEXT, technique TEXT, created_at TEXT)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS annotation_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_id INTEGER, previous_label TEXT, new_label TEXT,
        changed_by TEXT, changed_at TEXT, reason TEXT)""")
    conn.commit()
    conn.close()

def seed_dataset_version():
    conn = get_conn()
    existing = conn.execute("SELECT COUNT(*) c FROM dataset_versions").fetchone()["c"]
    if existing > 0:
        conn.close()
        return
    manifest_path = "data_pipeline/raw/pearl_millet/growth_stage_manifest.csv"
    checksum = "unavailable"
    if os.path.exists(manifest_path):
        with open(manifest_path, "rb") as f:
            checksum = hashlib.sha256(f.read()).hexdigest()[:16]
    conn.execute(
        "INSERT INTO dataset_versions (version_tag, manifest_checksum, notes, created_at) VALUES (?,?,?,?)",
        ("pearl-millet-v1", checksum, "Initial version: 80 real images, healthy/sclpgr/drecro", datetime.utcnow().isoformat())
    )
    conn.commit()

    ds_id = conn.execute("SELECT id FROM dataset_versions WHERE version_tag='pearl-millet-v1'").fetchone()["id"]
    import csv
    if os.path.exists(manifest_path):
        with open(manifest_path) as f:
            rows = list(csv.DictReader(f))
        for r in rows:
            conn.execute(
                "INSERT INTO images (dataset_version_id, filepath, source, label, label_method, created_at) VALUES (?,?,?,?,?,?)",
                (ds_id, r['filepath'], 'real', r['growth_stage'], 'auto_from_source_class', datetime.utcnow().isoformat())
            )
    conn.commit()
    conn.close()

def seed_training_runs():
    conn = get_conn()
    existing = conn.execute("SELECT COUNT(*) c FROM training_runs").fetchone()["c"]
    if existing > 0:
        conn.close()
        return
    ds_row = conn.execute("SELECT id FROM dataset_versions WHERE version_tag='pearl-millet-v1'").fetchone()
    ds_id = ds_row["id"] if ds_row else None
    for fname, technique in [("docs/baseline_results.json", "unweighted_baseline"),
                              ("docs/augmented_results.json", "class_weighted_oversampled"),
                              ("docs/synthetic_augmented_results.json", "class_weighted_oversampled_plus_diffusion_synthetic")]:
        if os.path.exists(fname):
            with open(fname) as f:
                data = json.load(f)
            conn.execute(
                "INSERT INTO training_runs (model_name, dataset_version_id, macro_f1, per_class_report, confusion_matrix, technique, created_at) VALUES (?,?,?,?,?,?,?)",
                (data["model"], ds_id, data["macro_f1"], json.dumps(data["per_class_report"]),
                 json.dumps(data["confusion_matrix"]), technique, datetime.utcnow().isoformat())
            )
    conn.commit()
    conn.close()

init_db()
seed_dataset_version()
seed_training_runs()

@app.get("/")
def root():
    return {"service": "MilletDataNet Provenance", "status": "running"}

@app.get("/datasets/versions")
def get_dataset_versions():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM dataset_versions ORDER BY id").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/datasets/{version_id}/card")
def dataset_card(version_id: int):
    conn = get_conn()
    version = conn.execute("SELECT * FROM dataset_versions WHERE id=?", (version_id,)).fetchone()
    if not version:
        conn.close()
        return {"error": "not found"}
    images = conn.execute("SELECT label, COUNT(*) c FROM images WHERE dataset_version_id=? GROUP BY label", (version_id,)).fetchall()
    conn.close()
    return {
        "version": dict(version),
        "class_distribution": {r["label"]: r["c"] for r in images},
        "source": "Zenodo record 17086194 (PESGL pearl millet leaf dataset, CC-BY-4.0)",
        "known_limitations": "Small sample size, especially drecro class (n=9); leaf-level close-ups only, no whole-plant or growth-stage context"
    }

@app.get("/images/{image_id}/provenance")
def image_provenance(image_id: int):
    conn = get_conn()
    img = conn.execute("SELECT * FROM images WHERE id=?", (image_id,)).fetchone()
    if not img:
        conn.close()
        return {"error": "not found"}
    audit = conn.execute("SELECT * FROM annotation_audit_log WHERE image_id=? ORDER BY changed_at", (image_id,)).fetchall()
    conn.close()
    return {"image": dict(img), "audit_trail": [dict(a) for a in audit]}

@app.post("/images/{image_id}/relabel")
def relabel_image(image_id: int, new_label: str = Form(...), changed_by: str = Form(...), reason: str = Form(...)):
    conn = get_conn()
    img = conn.execute("SELECT * FROM images WHERE id=?", (image_id,)).fetchone()
    if not img:
        conn.close()
        return {"error": "not found"}
    conn.execute(
        "INSERT INTO annotation_audit_log (image_id, previous_label, new_label, changed_by, changed_at, reason) VALUES (?,?,?,?,?,?)",
        (image_id, img["label"], new_label, changed_by, datetime.utcnow().isoformat(), reason)
    )
    conn.execute("UPDATE images SET label=? WHERE id=?", (new_label, image_id))
    conn.commit()
    conn.close()
    return {"status": "relabeled", "image_id": image_id, "new_label": new_label}

@app.get("/training/runs")
def get_runs():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM training_runs ORDER BY id").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/training/compare")
def compare_runs():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM training_runs ORDER BY id").fetchall()
    conn.close()
    if len(rows) < 2:
        return {"error": "Need at least 2 training runs to compare"}
    baseline = dict(rows[0])
    augmented = dict(rows[-1])
    return {
        "baseline": {"technique": baseline["technique"], "macro_f1": baseline["macro_f1"]},
        "augmented": {"technique": augmented["technique"], "macro_f1": augmented["macro_f1"]},
        "macro_f1_improvement": round(augmented["macro_f1"] - baseline["macro_f1"], 4)
    }

@app.get("/dataset/card")
def dataset_card_legacy():
    return dataset_card(1)


@app.get("/sensors/readings")
def get_sensor_readings():
    conn = get_conn()
    try:
        rows = conn.execute("SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 100").fetchall()
    except sqlite3.OperationalError:
        conn.close()
        return []
    conn.close()
    return [dict(r) for r in rows]


@app.post("/training/trigger")
def trigger_training(run: str = Form(...)):
    global job_counter
    if run not in SCRIPT_MAP:
        return {"error": f"unknown run type '{run}', expected one of {list(SCRIPT_MAP.keys())}"}
    script_path = SCRIPT_MAP[run]
    if not os.path.exists(script_path):
        return {"error": f"script not found at {script_path}"}

    with job_lock:
        job_counter += 1
        job_id = job_counter
    training_jobs[job_id] = {
        "status": "queued", "script": run, "log": "",
        "started_at": datetime.utcnow().isoformat()
    }
    thread = threading.Thread(target=run_training_job, args=(job_id, script_path, run), daemon=True)
    thread.start()
    return {"job_id": job_id, "status": "queued", "run": run}

@app.get("/training/status/{job_id}")
def training_status(job_id: int):
    job = training_jobs.get(job_id)
    if not job:
        return {"error": "job not found"}
    return {"job_id": job_id, **job}