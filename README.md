# MilletDataNet

**A small dataset, an honest fix, a traceable result.**

Class-imbalanced pearl millet leaf classification with real diffusion-based
synthetic augmentation, full dataset provenance/versioning, live-triggered
training runs, and a simulated IoT sensor reference architecture — built as
a scoped research prototype, not a toy demo.

> 80 real leaf images. 3 classes, one badly underrepresented. Macro-F1 improved
> from **0.868 → 0.920** with class-weighted rebalancing, with a real (if
> scoped-down) diffusion augmentation pipeline layered on top.

---

## What this actually is

MilletDataNet demonstrates the full lifecycle of a small agricultural
computer vision dataset: ingesting real labeled leaf images, exposing a
genuine class-imbalance failure mode, fixing it with class-weighted
resampling, augmenting the minority class with a real diffusion model,
and wrapping the entire thing in a provenance/versioning service so every
label, every synthetic image, and every training run is auditable and
traceable — the way a real 6-month field data collection program would
need it to be.

Every number in this repo comes from a script that actually ran. Nothing
is hardcoded to look impressive. See
[`docs/FINDINGS_AND_ROADMAP.md`](docs/FINDINGS_AND_ROADMAP.md) for an
unflinching breakdown of what's fully built versus intentionally scoped
down, and why.

---

## Architecture

```
                     ┌─────────────────────┐
                     │   React Dashboard    │
                     │  (Vite, port 5173)   │
                     │                       │
                     │  Overview             │
                     │  Training Runs ───────┼──▶ trigger live training
                     │  Dataset & Provenance │
                     │  Sensor Stream        │
                     └──────────┬────────────┘
                                │ REST (fetch)
                                ▼
                     ┌─────────────────────┐
                     │  FastAPI Provenance   │
                     │  Service (port 8000)  │
                     │                       │
                     │  SQLite: dataset_     │
                     │  versions, images,    │
                     │  training_runs,       │
                     │  annotation_audit_log,│
                     │  sensor_readings      │
                     └──────────┬────────────┘
                                │ subprocess (background thread)
                                ▼
                     ┌─────────────────────┐
                     │   PyTorch Training    │
                     │   ResNet18, 5-fold CV │
                     │                       │
                     │  train_baseline.py    │
                     │  train_augmented.py   │
                     │  train_with_synthetic │
                     └───────────────────────┘

                     ┌─────────────────────┐
                     │  IoT Simulation Layer │
                     │                       │
                     │  simulator.py ────────┼──▶ MQTT (Mosquitto)
                     │  mqtt_subscriber.py ◀─┼──   port 1883
                     │       │               │
                     │       ▼               │
                     │  writes to sensor_    │
                     │  readings table       │
                     └───────────────────────┘
```

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite, React Router, custom SVG charts (no chart library dependency) |
| Backend | FastAPI, SQLite, Python `subprocess`/`threading` for live training jobs |
| ML | PyTorch, torchvision (ResNet18), scikit-learn (stratified 5-fold CV, metrics) |
| Augmentation | Diffusion text-to-image via Hugging Face Inference Providers (FLUX.1-dev) |
| IoT | Mosquitto (MQTT broker), `paho-mqtt` publisher/subscriber |
| Data | Real pearl millet leaf images (Zenodo, CC-BY-4.0) |

---

## Running it locally

You'll need **4 terminals** running concurrently, plus a local Mosquitto
MQTT broker installed and running on port 1883.

### 1 — Provenance service (FastAPI)

```powershell
cd milletdatanet
python -m uvicorn provenance_service.main:app --reload --port 8000
```
Runs on `http://localhost:8000`. Seeds the SQLite database on first boot
from `data_pipeline/raw/pearl_millet/growth_stage_manifest.csv` and
`docs/*.json` training results.

### 2 — Dashboard (React + Vite)

```powershell
cd milletdatanet/dashboard
npm install   # first time only
npm run dev
```
Runs on `http://localhost:5173`. Requires the provenance service (step 1)
to be running — the dashboard fetches from `http://localhost:8000`
directly.

### 3 — MQTT subscriber (IoT sensor stream)

```powershell
cd milletdatanet
python iot_simulation\mqtt_subscriber.py
```
Listens on `milletdatanet/sensors` and writes incoming readings into the
`sensor_readings` table. Requires a local Mosquitto broker already running
on `localhost:1883`.

### 4 — MQTT simulator (publishes fake sensor readings)

```powershell
cd milletdatanet
python iot_simulation\simulator.py
```
Publishes 60 simulated readings over 60 seconds, explicitly tagged
`"SIMULATED - reference architecture, not live hardware"` in every
message. Run this any time you want fresh data on the **Sensor Stream**
dashboard page — it polls every 3 seconds.

---

## Triggering a live training run

From the **Training Runs** page in the dashboard, click any of:

- **Run Baseline (unweighted)**
- **Run Augmented (class-weighted + oversampled)**
- **Run Synthetic (+ diffusion)**

This calls `POST /training/trigger` on the backend, which spawns the
actual PyTorch training script (`ml/train_baseline.py`,
`ml/train_augmented.py`, or `ml/train_with_synthetic.py`) as a background
process — real 5-fold stratified cross-validation on CPU, typically
2–8 minutes depending on which script and your machine. When it finishes,
a new row is appended to the training run history automatically; nothing
is overwritten, so re-running the same technique multiple times builds up
real historical comparison data, the same way MLflow or Weights & Biases
would.

Training runs server-side regardless of the browser tab — closing or
switching tabs does not stop it, it only pauses the dashboard's status
polling, which resumes automatically when you return.

---

## Regenerating synthetic images

```powershell
cd milletdatanet
$env:HF_TOKEN = "your_huggingface_token"
python data_pipeline\augmentation\synthetic\generate_synthetic.py
```

Uses Hugging Face Inference Providers to call FLUX.1-dev for text-to-image
generation of synthetic minority-class (`drecro`) images. See
[`docs/FINDINGS_AND_ROADMAP.md`](docs/FINDINGS_AND_ROADMAP.md) §2.1–2.2
for an honest account of why this is text-to-image rather than the
img2img-conditioned approach originally scoped, and what upgrading it
would require.

---

## Project structure

```
milletdatanet/
├── dashboard/                    # React + Vite frontend
│   └── src/
│       ├── pages/                # Overview, Training, Provenance, Sensors
│       ├── components/           # Layout, StatCard, GrowthBar, ProvenancePanel, ThemeToggle
│       └── lib/api.js            # shared fetch hook + comparison helpers
├── data_pipeline/
│   ├── raw/pearl_millet/         # real leaf images + manifest CSV
│   └── augmentation/synthetic/   # generated synthetic images + generation script
├── ml/
│   ├── train_baseline.py
│   ├── train_augmented.py
│   ├── train_with_synthetic.py
│   └── models/                   # saved .pt checkpoints
├── provenance_service/
│   └── main.py                   # FastAPI app, all endpoints, SQLite schema
├── iot_simulation/
│   ├── simulator.py               # MQTT publisher (simulated sensor stream)
│   └── mqtt_subscriber.py         # MQTT subscriber → writes to DB
└── docs/
    ├── FINDINGS_AND_ROADMAP.md    # honest scope, gaps, and production roadmap
    ├── baseline_results.json
    ├── augmented_results.json
    └── synthetic_augmented_results.json
```

---

## Honest scope

This is a research prototype built to demonstrate an approach, not a
production system. **[`docs/FINDINGS_AND_ROADMAP.md`](docs/FINDINGS_AND_ROADMAP.md)**
covers exactly what's real, what's intentionally scoped down (synthetic
image count, text-to-image vs. img2img, no FID quantification yet,
in-process job execution instead of a real task queue), and what a
production version would require. Read that before assuming any number
here is bulletproof — it isn't meant to be, and pretending otherwise
would defeat the point of the provenance layer this project is actually
about.

---

## Dataset attribution

Pearl Millet Leaf Dataset, Zenodo record 17086194 (CC-BY-4.0).

---

Built by [Yashas Sadananda](https://github.com/yxshas565)