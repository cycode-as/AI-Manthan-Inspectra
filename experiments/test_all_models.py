from pathlib import Path
from ai_engine.predictor import inspect_image
from ai_engine.config import CATEGORIES, DATASET_ROOT

for category in CATEGORIES:
    test_folder = DATASET_ROOT / category / "test"

    normal_images = list((test_folder / "good").glob("*"))

    defect_images = [
        image
        for image in test_folder.rglob("*")
        if image.is_file()
        and image.suffix.lower() in [".png", ".jpg", ".jpeg", ".bmp"]
        and "good" not in image.parts
        and "ground_truth" not in image.parts
    ]

    print("\nCATEGORY:", category)

    if normal_images:
        print("NORMAL TEST:")
        print(inspect_image(str(normal_images[0]), category))

    if defect_images:
        print("DEFECT TEST:")
        print(inspect_image(str(defect_images[0]), category))
