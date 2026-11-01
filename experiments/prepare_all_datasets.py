from pathlib import Path
from anomalib.data import MVTecAD

ROOT = Path("datasets/MVTecAD")

CATEGORIES = [
    "metal_nut",
    "bottle",
    "cable",
    "leather",
    "screw",
    "transistor",
    "wood",
]

def main():
    for category in CATEGORIES:
        print("\n" + "=" * 55)
        print(f"Preparing category: {category}")
        print("=" * 55)

        category_path = ROOT / category

        required = [
            category_path / "train" / "good",
            category_path / "test",
            category_path / "ground_truth",
        ]

        for folder in required:
            if not folder.exists():
                raise FileNotFoundError(f"Missing folder: {folder}")

        datamodule = MVTecAD(
            root=ROOT,
            category=category,
            train_batch_size=1,
            eval_batch_size=1,
        )

        datamodule.prepare_data()
        datamodule.setup()

        train_loader = datamodule.train_dataloader()
        test_loader = datamodule.test_dataloader()

        print(f"Training batches: {len(train_loader)}")
        print(f"Testing batches: {len(test_loader)}")

        first_batch = next(iter(train_loader))
        print(f"First image shape: {first_batch['image'].shape}")

        del datamodule, train_loader, test_loader

    print("\nAll seven categories prepared successfully.")

if __name__ == "__main__":
    main()
