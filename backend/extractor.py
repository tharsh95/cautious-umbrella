"""Metadata extraction from various document formats."""
import io
import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional

import fitz  # PyMuPDF
from docx import Document
from PIL import Image


# ---------------------------------------------------------------------------
# PDF date parser
# ---------------------------------------------------------------------------

def _parse_pdf_date(raw: Optional[str]) -> Optional[str]:
    """
    Convert a PDF date string (D:YYYYMMDDHHmmSSOHH'mm') to an ISO-8601 string.
    Returns None if the string is absent or cannot be parsed.
    """
    if not raw:
        return None

    s = raw.strip()
    if s.upper().startswith("D:"):
        s = s[2:]

    digits = re.match(r"(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?", s)
    if not digits:
        return None

    year   = digits.group(1)
    month  = digits.group(2) or "01"
    day    = digits.group(3) or "01"
    hour   = digits.group(4) or "00"
    minute = digits.group(5) or "00"
    second = digits.group(6) or "00"

    try:
        naive = datetime(int(year), int(month), int(day),
                         int(hour), int(minute), int(second))
    except ValueError:
        return None

    tz_part = s[len(digits.group(0)):]
    if tz_part.startswith("Z") or tz_part == "":
        return naive.isoformat()

    tz_match = re.match(r"([+-])(\d{2})'?(\d{2})?'?", tz_part)
    if tz_match:
        sign   = 1 if tz_match.group(1) == "+" else -1
        tz_h   = int(tz_match.group(2))
        tz_m   = int(tz_match.group(3) or "0")
        offset = timedelta(hours=tz_h, minutes=tz_m) * sign
        aware  = naive.replace(tzinfo=timezone(offset))
        return aware.isoformat()

    return naive.isoformat()


# ---------------------------------------------------------------------------
# Extractors
# ---------------------------------------------------------------------------

class MetadataExtractor:
    """Extracts metadata from PDF, image, and DOCX files."""

    @staticmethod
    def extract_pdf_metadata(file_bytes: bytes) -> Dict[str, Any]:
        """Extract metadata from a PDF file and return a normalised dict."""
        try:
            doc  = fitz.open(stream=file_bytes, filetype="pdf")
            meta = doc.metadata

            # PDF version from the file header
            pdf_version: Optional[str] = None
            if len(file_bytes) >= 8:
                header = file_bytes[:10].decode("ascii", errors="ignore")
                m = re.match(r"%PDF-(\d+\.\d+)", header)
                if m:
                    pdf_version = m.group(1)

            encryption_raw = meta.get("encryption")
            is_encrypted   = bool(encryption_raw)

            # Keep raw date strings for format validation check
            raw_created  = meta.get("creationDate") or None
            raw_modified = meta.get("modDate") or None

            # Incremental update detection via raw byte scanning
            eof_count  = len(re.findall(b'%%EOF', file_bytes))
            prev_count = len(re.findall(rb'/Prev\s+\d+', file_bytes))
            incremental_updates = max(0, eof_count - 1)

            result: Dict[str, Any] = {
                "created_date":       _parse_pdf_date(raw_created),
                "modified_date":      _parse_pdf_date(raw_modified),
                "raw_created_date":   raw_created,
                "raw_modified_date":  raw_modified,
                "author":             meta.get("author") or None,
                "creator":            meta.get("creator") or None,
                "producer":           meta.get("producer") or None,
                "title":              meta.get("title") or None,
                "subject":            meta.get("subject") or None,
                "page_count":         doc.page_count,
                "is_encrypted":       is_encrypted,
                "pdf_version":        pdf_version,
                "incremental_updates": incremental_updates,
                "prev_xref_count":    prev_count,
            }

            doc.close()
            return result

        except Exception as exc:
            raise ValueError(f"Failed to extract PDF metadata: {exc}") from exc

    @staticmethod
    def extract_image_metadata(file_bytes: bytes) -> Dict[str, Any]:
        """Extract metadata from an image file (JPEG, PNG, TIFF, BMP)."""
        try:
            img = Image.open(io.BytesIO(file_bytes))

            exif_data: Dict[str, Any] = {}
            if hasattr(img, "_getexif") and callable(img._getexif):
                raw_exif = img._getexif()
                if raw_exif:
                    from PIL.ExifTags import TAGS
                    exif_data = {
                        TAGS.get(tag, tag): val
                        for tag, val in raw_exif.items()
                        if tag in TAGS
                    }

            dt_original  = exif_data.get("DateTimeOriginal")
            dt_digitized = exif_data.get("DateTimeDigitized")
            dt_modified  = exif_data.get("DateTime")

            def _parse_exif_dt(s: Optional[str]) -> Optional[str]:
                if not s:
                    return None
                try:
                    return datetime.strptime(s, "%Y:%m:%d %H:%M:%S").isoformat()
                except ValueError:
                    return None

            result: Dict[str, Any] = {
                "created_date":     _parse_exif_dt(dt_original or dt_digitized),
                "modified_date":    _parse_exif_dt(dt_modified),
                "raw_created_date": dt_original or dt_digitized or None,
                "raw_modified_date": dt_modified or None,
                "author":           exif_data.get("Artist") or None,
                "creator":          exif_data.get("Software") or None,
                "producer":         None,
                "title":            exif_data.get("ImageDescription") or None,
                "subject":          None,
                "page_count":       None,
                "is_encrypted":     False,
                "pdf_version":      None,
                "extra": {
                    "image_format": img.format,
                    "color_mode":   img.mode,
                    "width":        img.width,
                    "height":       img.height,
                    "camera_make":  exif_data.get("Make"),
                    "camera_model": exif_data.get("Model"),
                    "software":     exif_data.get("Software"),
                } if exif_data else {
                    "image_format": img.format,
                    "color_mode":   img.mode,
                    "width":        img.width,
                    "height":       img.height,
                },
            }

            img.close()
            return result

        except Exception as exc:
            raise ValueError(f"Failed to extract image metadata: {exc}") from exc

    @staticmethod
    def extract_docx_metadata(file_bytes: bytes) -> Dict[str, Any]:
        """Extract metadata from a DOCX file."""
        try:
            doc   = Document(io.BytesIO(file_bytes))
            props = doc.core_properties

            def _dt(d: Optional[datetime]) -> Optional[str]:
                return d.isoformat() if d else None

            result: Dict[str, Any] = {
                "created_date":     _dt(props.created),
                "modified_date":    _dt(props.modified),
                "raw_created_date": str(props.created) if props.created else None,
                "raw_modified_date": str(props.modified) if props.modified else None,
                "author":           props.author or None,
                "creator":          props.author or None,
                "producer":         None,
                "title":            props.title or None,
                "subject":          props.subject or None,
                "page_count":       None,
                "is_encrypted":     False,
                "pdf_version":      None,
                "extra": {
                    "last_modified_by": props.last_modified_by or None,
                    "revision":         props.revision,
                    "keywords":         props.keywords or None,
                    "category":         props.category or None,
                    "paragraph_count":  len(doc.paragraphs),
                },
            }

            return result

        except Exception as exc:
            raise ValueError(f"Failed to extract DOCX metadata: {exc}") from exc

    @staticmethod
    def extract(file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Dispatch to the correct extractor based on file extension."""
        lower = filename.lower()
        if lower.endswith(".pdf"):
            return MetadataExtractor.extract_pdf_metadata(file_bytes)
        if lower.endswith((".jpg", ".jpeg", ".png", ".tiff", ".bmp")):
            return MetadataExtractor.extract_image_metadata(file_bytes)
        if lower.endswith(".docx"):
            return MetadataExtractor.extract_docx_metadata(file_bytes)
        raise ValueError(f"Unsupported file type: {filename}")