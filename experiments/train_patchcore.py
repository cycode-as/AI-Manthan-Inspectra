import sys
import gc
from pathlib import Path

import torch
from anomalib.data import MVTecAD
from anomalib.models import Patchcore
from anomalib.engine import Engine

ROOT = Path("datasets/MVTecAD")
MODEL_ROOT = Path("models/patchcore")

CATEGORIES = [
    "metal_nut", "bottle", "cable",
    "leather", "screw", "transistor", "wood"
]

def train_category(category):
    if category not in CATEGORIES:
        raise ValueError(f"Unknown category: {category}")

    print("\n" + "=" * 60)
    print(f"TRAINING PATCHCORE: {category}")
    print("=" * 60)

    category_path = ROOT / category

    if not (category_path / "train" / "good").exists():
        raise FileNotFoundError(f"Training data missing: {category}")

    output_dir = MODEL_ROOT / category
    output_dir.mkdir(parents=True, exist_ok=True)

    datamodule = MVTecAD(
        root=ROOT,
        category=category,
        train_batch_size=1,
        eval_batch_size=1,
    )

    datamodule.prepare_data()
    datamodule.setup()

    model = Patchcore(
        backbone="wide_resnet50_2",
        layers=["layer2", "layer3"],
        pre_trained=True,
        coreset_sampling_ratio=0.1,
        num_neighbors=9,
    )

    engine = Engine(
        accelerator="gpu",
        devices=1,
        max_epochs=1,
        default_root_dir=output_dir,
    )

    print("Starting GPU training...")

    engine.fit(
        model=model,
        datamodule=datamodule,
    )

    checkpoint = output_dir / "model.ckpt"
    engine.trainer.save_checkpoint(str(checkpoint))

    if not checkpoint.exists():
        raise RuntimeError("Checkpoint was not created.")

    print(f"\nTraining completed: {category}")
    print(f"Checkpoint: {checkpoint.resolve()}")
    print(f"Checkpoint size: {checkpoint.stat().st_size / (1024 * 1024):.2f} MB")

    del engine, model, datamodule
    gc.collect()
    torch.cuda.empty_cache()

def main():
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU is not available.")

    if len(sys.argv) != 2:
        print("Usage: python experiments/train_patchcore.py <category>")
        print("Available categories:", ", ".join(CATEGORIES))
        sys.exit(1)

    train_category(sys.argv[1])

if __name__ == "__main__":
    main()
