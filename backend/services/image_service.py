"""
services/image_service.py
--------------------------
Handles image validation and storage for uploaded inspection images.

Responsibilities:
  - Enforce file size limit (10 MB)
  - Enforce allowed extensions (.jpg, .jpeg, .png)
  - Enforce allowed MIME content types
  - Verify actual image content using Pillow (catches corrupt files)
  - Generate a safe, unique temporary filename (no path traversal)
  - Save the image to backend/uploads/
  - Rename to the final naming convention once the DB ID is known:
      original_{inspection_id}.{ext}

This module does NOT interact with the database.
"""

import io
import logging
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from config import (
    UPLOAD_DIR,
    MAX_UPLOAD_BYTES,
    ALLOWED_EXTENSIONS,
    ALLOWED_CONTENT_TYPES,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom exception — carries an error code aligned with the error contract
# ---------------------------------------------------------------------------
class ImageValidationError(Exception):
    """
    Raised when an uploaded file fails any validation step.

    Attributes
    ----------
    code    : Machine-readable error code (used in the JSON error response).
    message : Human-readable explanation (shown to the frontend).
    status  : HTTP status code to return.
    """

    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code    = code
        self.message = message
        self.status  = status


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def validate_and_save(upload: UploadFile) -> Path:
    """
    Validate the uploaded file and save it to UPLOAD_DIR as a temporary file.

    The temporary filename is:  tmp_{upload.filename_stem}_{uuid4_hex}.{ext}
    Call finalize_image_filename() once you have the DB inspection ID to
    rename it to the permanent convention.

    Parameters
    ----------
    upload : UploadFile
        The raw file received from the multipart form.

    Returns
    -------
    Path
        Absolute path of the saved temporary file.

    Raises
    ------
    ImageValidationError
        On any validation failure (size, type, content, corruption).
    """
    # ------------------------------------------------------------------
    # 1. Read the full file into memory so we can measure its size and
    #    pass it to Pillow without seeking a real file handle.
    # ------------------------------------------------------------------
    contents: bytes = await upload.read()

    # ------------------------------------------------------------------
    # 2. Size check  →  413
    # ------------------------------------------------------------------
    if len(contents) > MAX_UPLOAD_BYTES:
        raise ImageValidationError(
            code    = "FILE_TOO_LARGE",
            message = f"File size exceeds the 10 MB limit "
                      f"({len(contents) / (1024*1024):.1f} MB received).",
            status  = 413,
        )

    if len(contents) == 0:
        raise ImageValidationError(
            code    = "EMPTY_FILE",
            message = "Uploaded file is empty.",
            status  = 400,
        )

    # ------------------------------------------------------------------
    # 3. Extension check  →  400
    #    We extract the extension from the original filename.
    #    .suffix already includes the dot, e.g. '.jpg'
    # ------------------------------------------------------------------
    original_name = upload.filename or "upload"
    ext = Path(original_name).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise ImageValidationError(
            code    = "UNSUPPORTED_FILE_TYPE",
            message = f"File extension '{ext}' is not supported. "
                      f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}.",
            status  = 400,
        )

    # ------------------------------------------------------------------
    # 4. MIME / content-type check  →  400
    #    Browsers set this but it can be spoofed, so it's a first-pass
    #    check only — Pillow verification below is the real gate.
    # ------------------------------------------------------------------
    content_type = (upload.content_type or "").lower()
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise ImageValidationError(
            code    = "UNSUPPORTED_CONTENT_TYPE",
            message = f"Content type '{content_type}' is not accepted. "
                      f"Upload a JPEG or PNG image.",
            status  = 400,
        )

    # ------------------------------------------------------------------
    # 5. Pillow deep validation  →  422
    #    This catches corrupt files, truncated uploads, and files that
    #    have a valid extension but aren't actually images.
    # ------------------------------------------------------------------
    try:
        img = Image.open(io.BytesIO(contents))
        img.verify()          # Checks file integrity without decoding pixels
    except UnidentifiedImageError:
        raise ImageValidationError(
            code    = "INVALID_IMAGE",
            message = "Uploaded file is not a valid image.",
            status  = 422,
        )
    except Exception as exc:
        logger.warning("Image verification failed: %s", exc)
        raise ImageValidationError(
            code    = "CORRUPT_IMAGE",
            message = "Uploaded image appears to be corrupt or truncated.",
            status  = 422,
        )

    # ------------------------------------------------------------------
    # 6. Generate a safe temporary filename
    #    - No user-supplied name reaches the filesystem directly.
    #    - uuid4 hex ensures uniqueness even under concurrent uploads.
    # ------------------------------------------------------------------
    import uuid
    safe_stem = uuid.uuid4().hex
    tmp_filename = f"tmp_{safe_stem}{ext}"
    tmp_path = UPLOAD_DIR / tmp_filename

    # ------------------------------------------------------------------
    # 7. Write to disk
    # ------------------------------------------------------------------
    try:
        tmp_path.write_bytes(contents)
    except OSError as exc:
        logger.error("Failed to write uploaded image to disk: %s", exc)
        raise ImageValidationError(
            code    = "STORAGE_ERROR",
            message = "Could not save the uploaded image. Please try again.",
            status  = 500,
        )

    logger.info("Saved temporary upload: %s (%d bytes)", tmp_filename, len(contents))
    return tmp_path


def finalize_image_filename(tmp_path: Path, inspection_id: int) -> Path:
    """
    Rename a temporary upload to the permanent naming convention:
        original_{inspection_id}.{ext}

    Called after the inspection record has been inserted into the DB
    and the real ID is known.

    Parameters
    ----------
    tmp_path      : Path  - Current path of the temporary file.
    inspection_id : int   - The DB primary key for this inspection.

    Returns
    -------
    Path
        New absolute path of the renamed file.

    Raises
    ------
    OSError
        If the rename fails (disk full, permissions, etc.).
    """
    ext          = tmp_path.suffix.lower()
    final_name   = f"original_{inspection_id}{ext}"
    final_path   = UPLOAD_DIR / final_name
    # replace() overwrites an existing file — needed on Windows where
    # rename() raises FileExistsError if the target already exists.
    tmp_path.replace(final_path)
    logger.info("Finalized image: %s → %s", tmp_path.name, final_name)
    return final_path


def cleanup_file(path: Path) -> None:
    """
    Silently delete a file. Used to clean up temp files when something
    goes wrong mid-workflow so we don't leave orphaned files in uploads/.

    Parameters
    ----------
    path : Path  - File to delete. Does nothing if it doesn't exist.
    """
    try:
        if path.exists():
            path.unlink()
            logger.info("Cleaned up file: %s", path.name)
    except OSError as exc:
        # Log but don't raise — cleanup failure is not fatal
        logger.warning("Could not clean up file %s: %s", path, exc)
