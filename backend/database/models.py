"""
database/models.py
------------------
SQLAlchemy ORM model for the inspections table.

Each row represents one complete inspection: the uploaded image, the AI
engine's prediction, the decision engine's verdict, and file paths for
serving the original image and the AI-generated heatmap.
"""

from datetime import datetime
from sqlalchemy import Integer, String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from database.database import Base


class Inspection(Base):
    """
    Stores every inspection result produced by the system.

    Columns
    -------
    id                  Auto-incrementing primary key.
    filename            Original filename supplied by the uploader.
    category            Product category (e.g. 'metal').
    prediction          AI engine output: 'ANOMALY' or 'NORMAL'.
    anomaly_score       Confidence score from AI engine [0.0 – 1.0].
    decision            Decision engine verdict: PASS / NEEDS REVIEW / REJECT.
    original_image_path Server-side path to the saved original image.
    heatmap_path        Server-side path to the AI-generated heatmap image.
    inference_time_ms   Time taken by the AI engine in milliseconds.
    model_version       Version string of the AI model that ran the inference.
    created_at          UTC timestamp when the inspection was recorded.
    """

    __tablename__ = "inspections"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, autoincrement=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    prediction: Mapped[str] = mapped_column(String(50), nullable=False)
    anomaly_score: Mapped[float] = mapped_column(Float, nullable=False)
    decision: Mapped[str] = mapped_column(String(50), nullable=False)
    original_image_path: Mapped[str] = mapped_column(String(512), nullable=False)
    heatmap_path: Mapped[str] = mapped_column(String(512), nullable=False)
    inference_time_ms: Mapped[float] = mapped_column(Float, nullable=False)
    model_version: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    def to_dict(self) -> dict:
        """
        Returns a plain dict safe for JSON serialisation.
        Used by history/analytics routes that need to serialise records.
        """
        return {
            "inspection_id": self.id,
            "filename": self.filename,
            "category": self.category,
            "prediction": self.prediction,
            "anomaly_score": self.anomaly_score,
            "decision": self.decision,
            "original_image_url": f"/uploads/{self.original_image_path.split('/')[-1]}",
            "heatmap_url": f"/uploads/{self.heatmap_path.split('/')[-1]}",
            "inference_time_ms": self.inference_time_ms,
            "model_version": self.model_version,
            "created_at": self.created_at.isoformat(),
        }
