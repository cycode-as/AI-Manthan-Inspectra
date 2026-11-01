import logging
import time
from pathlib import Path

try:
    import torch
    from anomalib.data import PredictDataset
    from anomalib.engine import Engine
    from anomalib.models import Patchcore
except ImportError as err:
    torch = None
    PredictDataset = None
    Engine = None
    Patchcore = None
    _import_error = err
else:
    _import_error = None

from ai_engine.config import (
    MODEL_ROOT,
    CATEGORIES,
    MODEL_VERSION,
)

logger = logging.getLogger(__name__)

_engines = {}
_models = {}

CATEGORY_MAP = {
    "metal": "metal_nut",
}


def normalize_category(category: str) -> str:
    cat = category.strip().lower()
    return CATEGORY_MAP.get(cat, cat)


def save_anomaly_heatmap(
    anomaly_map,
    original_image_path: Path | str,
    output_path: Path | str,
) -> str | None:
    """
    Takes a genuine pixel-level anomaly map tensor/array from PatchCore,
    normalizes it, resizes it to match the original image dimensions,
    applies the standard Jet colormap, and saves it as a valid PNG image.

    Returns the output path string on success, or None on failure.
    """
    try:
        from PIL import Image
        import numpy as np

        if hasattr(anomaly_map, "detach"):
            anomaly_map = anomaly_map.detach()
        if hasattr(anomaly_map, "cpu"):
            anomaly_map = anomaly_map.cpu().numpy()

        if not isinstance(anomaly_map, np.ndarray):
            return None

        am = np.squeeze(anomaly_map)
        if am.ndim != 2:
            return None

        # Min-max normalization of actual pixel anomaly values from the model
        am_min, am_max = float(am.min()), float(am.max())
        if am_max > am_min:
            am_norm = (am - am_min) / (am_max - am_min)
        else:
            am_norm = np.zeros_like(am, dtype=np.float32)

        # Match the exact resolution of the original image
        orig_img = Image.open(str(original_image_path))
        orig_w, orig_h = orig_img.size

        # Resize anomaly map to original dimensions using bilinear interpolation
        am_uint8 = (np.clip(am_norm, 0.0, 1.0) * 255.0).astype(np.uint8)
        am_pil = Image.fromarray(am_uint8, mode="L")
        am_resized_pil = am_pil.resize((orig_w, orig_h), resample=Image.Resampling.BILINEAR)
        am_resized = np.array(am_resized_pil, dtype=np.float32) / 255.0

        # Apply standard Jet colormap: Blue (0.0) -> Cyan -> Green -> Yellow -> Red (1.0)
        v = np.clip(am_resized, 0.0, 1.0)
        r = np.clip(np.where(v < 0.5, 0.0, (v - 0.5) / 0.25), 0.0, 1.0)
        g = np.clip(np.where(v < 0.25, v / 0.25, np.where(v < 0.75, 1.0, 1.0 - (v - 0.75) / 0.25)), 0.0, 1.0)
        b = np.clip(np.where(v < 0.25, 1.0, np.where(v < 0.5, 1.0 - (v - 0.25) / 0.25, 0.0)), 0.0, 1.0)
        rgb = (np.stack([r, g, b], axis=-1) * 255.0).astype(np.uint8)

        heatmap_img = Image.fromarray(rgb, mode="RGB")
        heatmap_img.save(str(output_path), format="PNG")
        return str(output_path)
    except Exception as exc:
        logger.warning("Could not generate heatmap from anomaly map: %s", exc)
        return None


def _load_category_model(category):
    if _import_error is not None:
        raise RuntimeError(
            f"AI engine dependencies are not installed: {_import_error}. "
            "Please install PyTorch and Anomalib."
        )

    model_category = normalize_category(category)
    if model_category not in CATEGORIES:
        raise ValueError(
            f"Unsupported category: '{category}'. "
            f"Supported categories: {', '.join(sorted(CATEGORIES))}."
        )

    checkpoint = MODEL_ROOT / model_category / "model.ckpt"

    if not checkpoint.is_file():
        raise FileNotFoundError(
            f"Checkpoint not found for category '{category}' (model category: '{model_category}'). "
            f"Expected checkpoint at: {checkpoint.resolve()}. "
            f"Please train or provide the model weights in 'models/patchcore/{model_category}/model.ckpt'."
        )

    if model_category not in _models:
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
            default_root_dir=MODEL_ROOT / model_category / "inference",
        )

        _models[model_category] = model
        _engines[model_category] = engine

    return _models[model_category], _engines[model_category], checkpoint


def inspect_image(image_path: str, category: str, output_heatmap_path: str | None = None) -> dict:
    image_path = Path(image_path)

    if not image_path.is_file():
        raise FileNotFoundError(f"Image not found: {image_path}")

    model_category = normalize_category(category)
    if model_category not in CATEGORIES:
        raise ValueError(f"Unsupported category: {category}")

    model, engine, checkpoint = _load_category_model(category)

    dataset = PredictDataset(
        path=str(image_path),
        image_size=(256, 256),
    )

    if len(dataset) == 0:
        raise ValueError("No valid image found.")

    if torch and torch.cuda.is_available():
        torch.cuda.synchronize()

    start_time = time.perf_counter()

    predictions = engine.predict(
        model=model,
        dataset=dataset,
        ckpt_path=str(checkpoint),
        return_predictions=True,
    )

    if torch and torch.cuda.is_available():
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

    saved_heatmap_path = None
    if output_heatmap_path:
        anomaly_map = getattr(result, "anomaly_map", None)
        if anomaly_map is None:
            anomaly_map = getattr(result, "heat_map", None)
        if anomaly_map is not None:
            saved_heatmap_path = save_anomaly_heatmap(
                anomaly_map=anomaly_map,
                original_image_path=image_path,
                output_path=output_heatmap_path,
            )

    return {
        "category": category,
        "prediction": prediction,
        "anomaly_score": float(score),
        "heatmap_path": saved_heatmap_path,
        "inference_time_ms": round(inference_time, 2),
        "model_version": MODEL_VERSION,
    }
