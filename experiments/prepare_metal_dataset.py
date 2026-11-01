
from pathlib import Path

from anomalib.data import MVTecAD

ROOT = Path("datasets/MVTecAD")

def main():
    ROOT.mkdir(parents=True, exist_ok=True)

    datamodule = MVTecAD(
        root=ROOT,
        category="metal_nut",
        train_batch_size=1,
        eval_batch_size=1,
    )

    print("Preparing MVTec AD metal_nut dataset...")
    datamodule.prepare_data()
    datamodule.setup()

    print("Dataset preparation completed.")

    train_loader = datamodule.train_dataloader()
    test_loader = datamodule.test_dataloader()

    print("Training batches:", len(train_loader))
    print("Testing batches:", len(test_loader))

    first_batch = next(iter(train_loader))
    print("First training batch keys:", first_batch.keys())
    print("First training image shape:", first_batch["image"].shape)

if __name__ == "__main__":
    main()
