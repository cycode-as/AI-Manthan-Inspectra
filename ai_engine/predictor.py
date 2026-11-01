import time
from pathlib import Path

import torch
from anomalib.data import PredictDataset
from anomalib.engine import Engine
from anomalib.models import Patchcore

from ai_engine.config import (
    MODEL_ROOT,
    CATEGORIES,
    MODEL_VERSION,
)

_engines = {}
_models = {}


def _load_category_model(category):
    if category not in CATEGORIES:
        raise ValueError(f"Unsupported category: {category}")

    checkpoint = MODEL_ROOT / category / "model.ckpt"

    if not checkpoint.is_file():
        raise FileNotFoundError(
            f"Checkpoint not found for category: {category}"
        )

    if category not in _models:
        model = Patchcore(
            backbone="wide_resnet50_2",
            layers=["layer2", "layer3"],
            pre_trained=True,
            coreset_sampling_ratio=0.1,
            num_neighbors=9,
            visualizer=False,
        )

        engine = Engine(
            accelerator="auto",
            devices=1,
            default_root_dir=MODEL_ROOT / category / "inference",
        )

        _models[category] = model
        _engines[category] = engine

    return _models[category], _engines[category], checkpoint


def inspect_image(image_path: str, category: str) -> dict:
    image_path = Path(image_path)

    if not image_path.is_file():
        raise FileNotFoundError(f"Image not found: {image_path}")

    if category not in CATEGORIES:
        raise ValueError(f"Unsupported category: {category}")

    model, engine, checkpoint = _load_category_model(category)

    dataset = PredictDataset(
        path=str(image_path),
        image_size=(256, 256),
    )

    if len(dataset) == 0:
        raise ValueError("No valid image found.")

    if torch.cuda.is_available():
        torch.cuda.synchronize()

    start_time = time.perf_counter()

    predictions = engine.predict(
        model=model,
        dataset=dataset,
        ckpt_path=str(checkpoint),
        return_predictions=True,
    )

    if torch.cuda.is_available():
        torch.cuda.synchronize()

    inference_time = (time.perf_counter() - start_time) * 1000

    if not predictions:
        raise RuntimeError("The model returned no prediction.")

    result = predictions[0]

    label = result.pred_label
    score = result.pred_score

    if hasattr(label, "item"):
        label = label.item()

    if hasattr(score, "item"):
        score = score.item()

    prediction = "ANOMALY" if int(label) == 1 else "NORMAL"

    return {
        "category": category,
        "prediction": prediction,
        "anomaly_score": float(score),
        "heatmap_path": None,
        "inference_time_ms": round(inference_time, 2),
        "model_version": MODEL_VERSION,
    }
