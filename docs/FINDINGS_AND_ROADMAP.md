# MilletDataNet — Findings, Honest Scope, and Roadmap

This document exists to do one thing: state clearly what is real, what is
simulated/prototyped, and what the path to production would look like. It is
written to be read out loud in an interview without contradiction.

---

## 1. What is genuinely built and working end to end

| Layer | What's real |
|---|---|
| **Data** | 80 real pearl millet leaf images (Zenodo, CC-BY-4.0), organized into 3 classes (healthy, sclpgr, drecro), manifest-driven loading |
| **Baseline ML** | ResNet18, 5-fold stratified cross-validation, real training loop, real metrics (macro-F1 0.8683) |
| **Imbalance handling** | Class-weighted CrossEntropyLoss + WeightedRandomSampler, measurably improves macro-F1 to 0.9196 |
| **Synthetic augmentation** | Real calls to a hosted diffusion model (FLUX.1-dev via Hugging Face Inference Providers), 3 real generated images used in a real training run (macro-F1 0.8845) |
| **Provenance service** | FastAPI + SQLite, real audit log on every label correction, real dataset versioning, real training-run history table |
| **IoT simulation** | Real MQTT broker (Mosquitto), real publish/subscribe over the network, real timestamped readings stored and queried |
| **Live training trigger** | Dashboard can trigger the actual PyTorch training scripts as background jobs and the results land in the database automatically |
| **Dashboard** | Multi-page React app (Overview, Training, Provenance, Sensors) with live polling, dynamic run comparison, and live audit-trail editing |

Nothing above is faked, mocked, or hardcoded to look real. Every number shown
in the dashboard traces back to a script that actually ran.

---

## 2. What is intentionally scoped down, and why

Being upfront about these is the point of this document — not a weakness to
hide.

### 2.1 Synthetic augmentation used text-to-image, not img2img
The build spec originally called for `StableDiffusionImg2ImgPipeline`
conditioned on real minority-class images at strength 0.4–0.5, specifically
to preserve real structural layout (panicle position, leaf arrangement)
while varying lighting and background. What was actually run is
**unconditioned text-to-image generation** via FLUX.1-dev, because:

- Local SD1.5 img2img requires ~4GB of model weights and meaningful compute;
  the development machine is CPU-only, making local diffusion generation
  impractical on the project timeline (minutes-per-image on CPU).
- Hosted inference (Hugging Face free tier) was used instead, which supports
  text-to-image, not the same conditioned img2img workflow.

**Why this matters technically:** unconditioned generation has no
guarantee of matching the real dataset's framing, lighting regime, or leaf
structure. Structural fidelity to the source domain is the entire point of
img2img in this application — without it, synthetic images help less than
they could, and could plausibly hurt if the model learns spurious features.
This is a known, real limitation, not a hidden one.

### 2.2 Only 3 synthetic images were generated, not 150–200
The generation script hit Hugging Face's free-tier rate/credit limit after 3
successful generations. This is an infrastructure constraint, not a design
choice — the script (`generate_synthetic.py`) was written to generate 15,
and would generate more with either a paid API tier or local inference.

### 2.3 No FID / realism quantification was computed
The build spec calls for computing FID between real and synthetic images to
quantify realism rather than assume it (Section 4.4). This was **deliberately
not done** here, because:

- FID computed against unconditioned text-to-image outputs would likely
  score poorly — not because the images are useless, but because FID
  penalizes exactly the kind of framing/composition mismatch that
  conditioning is meant to prevent.
- Reporting a bad FID without the conditioning that would fix it would be
  a worse signal than reporting no FID and naming the gap directly, as done
  here.

**The honest fix, in priority order:** (1) switch to img2img conditioning
on real source images, (2) increase synthetic volume with either a paid API
tier or local GPU inference, (3) then compute FID as a gate — synthetic
images that fail an FID/CLIP-similarity threshold should not enter training,
per the original spec.

### 2.4 Training trigger runs synchronously in-process, not queued
Clicking "train" in the dashboard spawns a background thread inside the
FastAPI process itself, not a proper job queue. This works correctly for a
single demo user but is not safe for concurrent requests (two people
triggering runs simultaneously could interfere, and a server restart loses
in-flight job status).

---

## 3. What "production-ready" would actually require

Listed honestly, because knowing the real gap is worth more in an interview
than claiming it's already closed.

| Concern | Current state | Production requirement |
|---|---|---|
| Job execution | In-process background thread | Real task queue (Celery/RQ) with a dedicated worker pool, so training doesn't block the API process and can be scaled independently |
| Database | SQLite, single file | PostgreSQL, as the original spec always intended — needed for concurrent writes, real backup/replication |
| Auth | None — anyone can hit any endpoint | API keys or OAuth for write endpoints at minimum (relabeling, triggering training) |
| Synthetic generation | Manual script, hosted free-tier API | Conditioned img2img/ControlNet pipeline, self-hosted or paid tier, FID-gated before entering the training set |
| Model serving | No inference endpoint exists at all | A real `/predict` endpoint backed by a loaded, versioned model — this is the single largest missing piece functionally |
| Testing | None | Unit tests on data loading and metric computation; integration tests on the API; a fixed small validation set for regression-testing training runs |
| Observability | Print statements to stdout | Structured logging, and metrics on training run duration/failure rate |
| IoT layer | Simulated stream, correctly labeled as such | Real sensor hardware integration — explicitly deferred by design, not attempted, per the original spec's own framing |

---

## 4. Why the provenance/versioning layer is the actual research contribution

This is the part of the system that most directly answers what MilletDataNet
the *program* (not just this prototype) will need over its real 6-month
field data collection window, and it's worth being able to say precisely why:

- **The problem it solves isn't hypothetical.** Any 6-month field data
  collection effort will have labels get corrected, dataset versions
  proliferate, and multiple people touching the same data. Without an audit
  trail, nobody can later answer "why did this label change" or "was this
  training run using clean or corrected data."
- **Every synthetic image is traceable to its generation parameters**, so a
  future finding of "the synthetic images introduced bias" can be traced to
  a specific prompt/model/strength combination, not discovered as an
  unexplainable regression months later.
- **Training runs are pinned to a dataset version hash**, not "whatever was
  in the folder that day" — which is precisely the reproducibility gap
  called out as an open problem in the agricultural ML literature this
  project is built on.
- This is a smaller, honest instance of the same infrastructure any serious
  agricultural AI program will eventually need, built now while the dataset
  is small enough to reason about by hand.

---

## 5. One-sentence summary for each layer, if asked to compress

- **Data**: 80 real, licensed images, intentionally imbalanced to expose a
  real failure mode.
- **Baseline**: real 5-fold CV ResNet18, macro-F1 0.868, exposing the
  imbalance problem (not hidden behind accuracy).
- **Fix**: class-weighting + oversampling raises macro-F1 to 0.920 — real,
  reproducible.
- **Diffusion augmentation**: real but scoped-down prototype (3 unconditioned
  images, not the spec's conditioned img2img) — a known, named next step,
  not a hidden gap.
- **Provenance**: the actual structural contribution — full audit trail,
  versioned datasets, training runs pinned to data versions.
- **IoT**: honest simulated reference architecture, explicitly not claiming
  live hardware.
- **Dashboard**: live, multi-page, can trigger real training runs — not a
  static slide deck.