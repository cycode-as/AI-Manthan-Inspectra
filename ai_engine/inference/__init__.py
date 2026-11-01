"""
ai_engine.inference
-------------------
Inference interface for Inspectra 2.0.
"""
from ai_engine.inference.result_schema import InspectionResult

def inspect_image(image_path: str, category: str) -> dict:
    from ai_engine.predictor import inspect_image as _inspect_image
    return _inspect_image(image_path, category)

__all__ = ["inspect_image", "InspectionResult"]
