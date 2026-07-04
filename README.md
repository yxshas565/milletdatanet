# MilletDataNet

Class-imbalanced millet growth-stage classification with synthetic augmentation,
domain-gap evaluation, and dataset provenance infrastructure.

## Structure
- data_pipeline/ - labeling + augmentation scripts
- ml/ - training + evaluation
- provenance_service/ - FastAPI + Postgres dataset/training lineage tracking
- iot_simulation/ - simulated sensor stream (reference architecture)
- dashboard/ - React frontend
- docs/FINDINGS.md - baseline vs augmented results

## Status
Work in progress - see docs/FINDINGS.md for latest results.
