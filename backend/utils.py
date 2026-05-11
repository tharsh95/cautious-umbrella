"""Utility / validation helpers."""
from typing import Optional

ALLOWED_EXTENSIONS = {"pdf", "docx", "jpg", "jpeg", "png", "tiff", "bmp"}

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

MIME_MAP = {
    "pdf":  "PDF Document",
    "docx": "Word Document (DOCX)",
    "jpg":  "JPEG Image",
    "jpeg": "JPEG Image",
    "png":  "PNG Image",
    "tiff": "TIFF Image",
    "bmp":  "BMP Image",
}


def validate_file(filename: Optional[str], file_size: int) -> Optional[str]:
    """
    Validate file name and size.
    Returns an error string if invalid, None if OK.
    """
    if not filename or "." not in filename:
        return "Invalid or missing filename."

    if file_size == 0:
        return "Uploaded file is empty."

    if file_size > MAX_FILE_SIZE:
        return (
            f"File size ({file_size / (1024*1024):.1f} MB) exceeds the "
            f"{MAX_FILE_SIZE // (1024*1024)} MB limit."
        )

    ext = filename.lower().rsplit(".", 1)[-1]
    if ext not in ALLOWED_EXTENSIONS:
        return (
            f"Unsupported file type '.{ext}'. "
            f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
        )

    return None


def friendly_file_type(filename: str) -> str:
    """Return a human-readable file type label."""
    ext = filename.lower().rsplit(".", 1)[-1]
    return MIME_MAP.get(ext, "Unknown File Type")