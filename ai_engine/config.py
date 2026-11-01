from pathlib import Path
import torch

PROJECT_ROOT = Path(__file__).resolve().parent.parent

MODEL_ROOT = PROJECT_ROOT / "models" / "patchcore"
DATASET_ROOT = PROJECT_ROOT / "datasets" / "MVTecAD"

CATEGORIES = [
    "metal_nut",
    "bottle",
    "cable",
    "leather",
    "screw",
    "transistor",
    "wood",
]

MODEL_VERSION = "patchcore-v1"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
