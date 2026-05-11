"""
Rule-based metadata checks.

Each check receives an ExtractedMetadata object and returns a Finding or None.
Confidence values are floats (0.0–1.0).
Severity values are title-case strings: "High", "Medium", "Low".
"""
import re
from datetime import datetime
from typing import List, Optional

from models import ExtractedMetadata, Finding


# ---------------------------------------------------------------------------
# Tool keyword lists
# ---------------------------------------------------------------------------

ONLINE_EDITORS: List[str] = [
    "smallpdf", "ilovepdf", "pdf.online", "pdfescape", "sejda",
    "soda pdf", "pdfcandy", "online-convert", "cleverpdf", "pdf2doc",
    "online2pdf", "compress-pdf", "pdfcompressor", "online pdf editor",
    "pdf24", "pdfforge",
]

EDITING_TOOLS: List[str] = [
    "photoshop", "illustrator", "canva", "preview",
    "acrobat", "adobe acrobat",
    "gimp", "inkscape", "foxit", "nitro",
    "pdftk", "ghostscript", "libreoffice", "openoffice",
]

PROGRAMMATIC_TOOLS: List[str] = [
    "jspdf", "pdfkit", "reportlab", "fpdf", "wkhtmltopdf",
    "puppeteer", "playwright", "weasyprint", "dompdf",
    "itext", "apache fop", "tcpdf",
]

BROWSER_AGENTS: List[str] = [
    "mozilla/5.0", "webkit", "chrome/", "firefox/", "safari/",
    "skia/pdf",
]

SCANNER_TOOLS: List[str] = [
    "scanner", "scansnap", "twain", "fujitsu", "epson",
    "hp scan", "brother", "naps2",
]

# Standard PDF date format: D:YYYY...
_PDF_DATE_RE = re.compile(r"^D:\d{4}", re.IGNORECASE)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _contains_any(text: Optional[str], keywords: List[str]) -> Optional[str]:
    """Return the first matching keyword if found in text (case-insensitive)."""
    if not text:
        return None
    lower = text.lower()
    for kw in keywords:
        if kw in lower:
            return kw
    return None


def _parse_iso(date_str: Optional[str]) -> Optional[datetime]:
    """Parse an ISO-8601 string; return None on any failure."""
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Date-based checks
# ---------------------------------------------------------------------------

def check_future_date(meta: ExtractedMetadata) -> Optional[Finding]:
    """Any date field is set in the future."""
    now = datetime.now()
    for label, date_str in [
        ("creation date",     meta.created_date),
        ("modification date", meta.modified_date),
    ]:
        dt = _parse_iso(date_str)
        if dt and dt.replace(tzinfo=None) > now:
            return Finding(
                title=f"Future {label.title()} Detected",
                severity="High",
                confidence=0.95,
                explanation=(
                    f"The {label} ({date_str}) is set in the future. This is not possible "
                    "under normal circumstances and strongly suggests manual metadata "
                    "editing or a misconfigured system clock."
                ),
            )
    return None


def check_modified_before_created(meta: ExtractedMetadata) -> Optional[Finding]:
    """Modification date is earlier than creation date — chronologically impossible."""
    created  = _parse_iso(meta.created_date)
    modified = _parse_iso(meta.modified_date)
    if created and modified:
        c = created.replace(tzinfo=None)
        m = modified.replace(tzinfo=None)
        if m < c:
            return Finding(
                title="Modification Date Earlier Than Creation Date",
                severity="High",
                confidence=0.90,
                explanation=(
                    f"The modification date ({meta.modified_date}) is earlier than the "
                    f"creation date ({meta.created_date}). This is chronologically "
                    "impossible under normal conditions and is a strong indicator of "
                    "metadata manipulation or a system clock error."
                ),
            )
    return None


def check_modified_exists_but_created_missing(meta: ExtractedMetadata) -> Optional[Finding]:
    """Modified date present but creation date absent."""
    if meta.modified_date and not meta.created_date:
        return Finding(
            title="Modification Date Present but Creation Date Missing",
            severity="Medium",
            confidence=0.70,
            explanation=(
                "A modification date exists but no creation date is recorded. This can "
                "occur when metadata is partially stripped, or when a document is "
                "re-exported after removing original authoring information."
            ),
        )
    return None


def check_created_exists_modified_missing(meta: ExtractedMetadata) -> Optional[Finding]:
    """Creation date present but modification date absent."""
    if meta.created_date and not meta.modified_date:
        return Finding(
            title="Modification Date Missing",
            severity="Low",
            confidence=0.45,
            explanation=(
                "A creation date is recorded but no modification date is present. "
                "Some tools (LibreOffice, jsPDF, browser print) do not write a "
                "modification date by default. This is a weak signal on its own."
            ),
        )
    return None


def check_both_dates_missing(meta: ExtractedMetadata) -> Optional[Finding]:
    """Both created and modified dates are absent."""
    if not meta.created_date and not meta.modified_date:
        return Finding(
            title="Both Date Fields Missing",
            severity="Medium",
            confidence=0.65,
            explanation=(
                "Neither a creation date nor a modification date could be found in the "
                "document metadata. This is unusual and may indicate the metadata was "
                "stripped, or the document was generated by a tool that does not embed "
                "timestamps."
            ),
        )
    return None


def check_invalid_date_format(meta: ExtractedMetadata) -> Optional[Finding]:
    """Raw date string exists but could not be parsed — format is invalid or unusual."""
    bad = []
    for label, raw, parsed in [
        ("creation date",     meta.raw_created_date,  meta.created_date),
        ("modification date", meta.raw_modified_date, meta.modified_date),
    ]:
        if raw and not parsed:
            # Raw string present but parser returned None — unparseable
            bad.append((label, raw))
        elif raw and not _PDF_DATE_RE.match(raw):
            # Present and parsed, but doesn't follow standard D:YYYY format
            bad.append((label, raw))

    if bad:
        details = "; ".join(f"{l}: '{v}'" for l, v in bad)
        return Finding(
            title="Invalid or Unusual Date Format in Metadata",
            severity="Medium",
            confidence=0.80,
            explanation=(
                "One or more date fields contain values that do not conform to the "
                f"standard PDF date format (D:YYYYMMDDHHmmSS). Affected fields: {details}. "
                "This may indicate manual metadata editing or a non-compliant PDF generator."
            ),
        )
    return None


def check_modified_much_later(meta: ExtractedMetadata) -> Optional[Finding]:
    """Modification date is more than 365 days after creation date."""
    created  = _parse_iso(meta.created_date)
    modified = _parse_iso(meta.modified_date)
    if created and modified:
        c = created.replace(tzinfo=None)
        m = modified.replace(tzinfo=None)
        delta_days = (m - c).days
        if delta_days > 365:
            return Finding(
                title="Document Modified Much Later Than Creation Date",
                severity="Medium",
                confidence=0.60,
                explanation=(
                    f"The document was last modified approximately {delta_days} days "
                    "after it was created. While long-term editing is common, a large gap "
                    "may indicate the document was re-dated, re-exported, or significantly "
                    "altered after its original creation."
                ),
            )
    return None


# ---------------------------------------------------------------------------
# Software / tool checks
# ---------------------------------------------------------------------------

def check_online_editing_tool(meta: ExtractedMetadata) -> Optional[Finding]:
    """Any metadata field references a known online PDF editor."""
    for field in [meta.creator, meta.producer]:
        match = _contains_any(field, ONLINE_EDITORS)
        if match:
            return Finding(
                title="Online PDF Editing Tool Detected",
                severity="Medium",
                confidence=0.75,
                explanation=(
                    f"Metadata references '{field}', which is a known online PDF editing "
                    "or conversion service. Online tools typically modify or strip "
                    "original metadata, which can break the document's provenance chain."
                ),
            )
    return None


def check_editing_tool_in_metadata(meta: ExtractedMetadata) -> Optional[Finding]:
    """Detect editing tools (Acrobat, Preview, Photoshop, Illustrator, Canva, etc.)."""
    for field_name, value in [("creator", meta.creator), ("producer", meta.producer)]:
        match = _contains_any(value, EDITING_TOOLS)
        if match:
            return Finding(
                title="Editing or Export Tool Detected in Metadata",
                severity="Low",
                confidence=0.55,
                explanation=(
                    f"The {field_name} field references '{value}', which is a known "
                    "editing or export tool. Tools such as Preview, Acrobat, Photoshop, "
                    "Illustrator, and Canva can modify or rewrite document metadata "
                    "during export. This is a common pattern and does not confirm tampering."
                ),
            )
    return None


def check_programmatic_tool(meta: ExtractedMetadata) -> Optional[Finding]:
    """PDF generated by a code/JS library rather than a document editor."""
    for field_name, value in [("creator", meta.creator), ("producer", meta.producer)]:
        if _contains_any(value, PROGRAMMATIC_TOOLS):
            return Finding(
                title="PDF Generated by Programmatic Library",
                severity="Low",
                confidence=0.70,
                explanation=(
                    f"The {field_name} field references '{value}', a code-based PDF "
                    "generation library. Documents produced this way often have minimal "
                    "or absent metadata. This is common for web-generated resumes and "
                    "reports, and is not a tampering signal."
                ),
            )
    return None


def check_browser_printed(meta: ExtractedMetadata) -> Optional[Finding]:
    """PDF was printed from a browser (Chrome, Safari, etc.)."""
    for field_name, value in [("creator", meta.creator), ("producer", meta.producer)]:
        if _contains_any(value, BROWSER_AGENTS):
            truncated = value[:60] + ("..." if len(value) > 60 else "")
            return Finding(
                title="PDF Printed From Browser",
                severity="Low",
                confidence=0.75,
                explanation=(
                    f"The {field_name} field contains a browser user-agent string "
                    f"('{truncated}'). This indicates the PDF was generated using "
                    "a browser's print-to-PDF feature, likely from an online resume "
                    "builder or web page. Author and creator fields are typically "
                    "absent in browser-printed PDFs."
                ),
            )
    return None


def check_creator_producer_mismatch(meta: ExtractedMetadata) -> Optional[Finding]:
    """Creator and producer fields reference tools from clearly different ecosystems."""
    creator  = meta.creator or ""
    producer = meta.producer or ""
    if not creator or not producer:
        return None

    creator_l  = creator.lower()
    producer_l = producer.lower()

    ms_office    = ["microsoft", "word", "excel", "powerpoint", "office"]
    adobe_auth   = ["indesign", "illustrator", "framemaker"]
    adobe_export = ["acrobat", "adobe pdf", "distiller"]
    libre        = ["libreoffice", "openoffice", "writer"]

    def matches(text: str, group: List[str]) -> bool:
        return any(kw in text for kw in group)

    # High-signal: Office creator + online/editing producer
    if matches(creator_l, ms_office) and matches(producer_l, ONLINE_EDITORS + EDITING_TOOLS):
        mismatch_type = (
            "online editing service" if matches(producer_l, ONLINE_EDITORS) else "third-party tool"
        )
        return Finding(
            title="Creator and Producer Mismatch",
            severity="Medium",
            confidence=0.70,
            explanation=(
                f"The document was created with '{creator}' but the producer field "
                f"indicates it was processed by '{producer}' (a {mismatch_type}). "
                "This is common in legitimate workflows but may indicate the document "
                "was converted, edited, or re-exported after original creation."
            ),
        )

    # Low-signal: known natural pairs (Word → Acrobat, LibreOffice → Acrobat, etc.)
    known_natural_pairs = [
        (ms_office,  adobe_export),
        (adobe_auth, adobe_export),
        (libre,      adobe_export),
    ]
    for creator_group, producer_group in known_natural_pairs:
        if matches(creator_l, creator_group) and matches(producer_l, producer_group):
            return Finding(
                title="Creator and Producer From Different Applications",
                severity="Low",
                confidence=0.55,
                explanation=(
                    f"The document was created with '{creator}' and later processed "
                    f"by '{producer}'. This combination is common in legitimate workflows "
                    "and does not indicate tampering, but is noted as part of the "
                    "document's processing history."
                ),
            )

    return None


def check_scanner_tool(meta: ExtractedMetadata) -> Optional[Finding]:
    """Metadata references scanner software."""
    for field in [meta.creator, meta.producer]:
        if _contains_any(field, SCANNER_TOOLS):
            return Finding(
                title="Scanner Software Detected in Metadata",
                severity="Low",
                confidence=0.50,
                explanation=(
                    f"The metadata contains a reference to scanner software ('{field}'). "
                    "Scanned documents may have limited or auto-generated metadata. "
                    "This is a low-significance signal on its own."
                ),
            )
    return None


# ---------------------------------------------------------------------------
# Author / identity checks
# ---------------------------------------------------------------------------

def check_author_is_service(meta: ExtractedMetadata) -> Optional[Finding]:
    """Author field contains an email address or service name, not a person."""
    if meta.author and re.search(r'<[^>]+@[^>]+>|@[a-z0-9.-]+\.[a-z]{2,}', meta.author, re.I):
        return Finding(
            title="Author Field Contains Service or Tool Identity",
            severity="Medium",
            confidence=0.75,
            explanation=(
                f"The author field contains '{meta.author}', which appears to be a "
                "third-party service or tool rather than a person. This may indicate "
                "the document was generated or processed by an automated platform."
            ),
        )
    return None


def check_missing_author(meta: ExtractedMetadata) -> Optional[Finding]:
    """Author field is absent."""
    if not meta.author:
        return Finding(
            title="Missing Author Metadata",
            severity="Low",
            confidence=0.40,
            explanation=(
                "The author field is empty. This commonly occurs when documents are "
                "generated programmatically or exported from tools that do not populate "
                "this field by default. It is a weak signal on its own."
            ),
        )
    return None


# ---------------------------------------------------------------------------
# Structural checks
# ---------------------------------------------------------------------------

def check_missing_title(meta: ExtractedMetadata) -> Optional[Finding]:
    """Title field is absent."""
    if not meta.title:
        return Finding(
            title="Missing Title Metadata",
            severity="Low",
            confidence=0.30,
            explanation=(
                "The document title field is not set. This is common in programmatically "
                "generated documents and is a low-significance observation."
            ),
        )
    return None


def check_encrypted(meta: ExtractedMetadata) -> Optional[Finding]:
    """
    Document is encrypted.

    Two distinct cases:
    - All key fields are None because encryption blocked extraction → High risk.
    - Document is encrypted but metadata was still readable (some PDFs allow this)
      → Low, informational signal only.
    """
    if not meta.is_encrypted:
        return None

    metadata_inaccessible = not any([
        meta.created_date, meta.modified_date, meta.author,
        meta.creator, meta.producer, meta.title,
    ])

    if metadata_inaccessible:
        return Finding(
            title="Document Encrypted — Metadata Inaccessible",
            severity="High",
            confidence=0.85,
            explanation=(
                "The document is password-protected and no metadata could be extracted. "
                "Because the full document content and metadata are inaccessible, a "
                "complete analysis is not possible. Encryption may be used for legitimate "
                "security purposes, but it also prevents verification of document "
                "authenticity. This document requires manual review with the correct "
                "password before it can be assessed."
            ),
        )

    # Encrypted but some metadata was still readable
    return Finding(
        title="Document is Encrypted",
        severity="Low",
        confidence=0.50,
        explanation=(
            "The document is encrypted. Encryption is legitimate for security "
            "purposes, but it may prevent full inspection of the document's internal "
            "structure and could obscure further anomalies."
        ),
    )


def check_pdf_version_missing(meta: ExtractedMetadata) -> Optional[Finding]:
    """PDF version field could not be read (PDF files only)."""
    is_pdf = (
        "pdf" in (meta.file_type or "").lower()
        or (meta.page_count is not None)
    )
    if is_pdf and not meta.pdf_version:
        return Finding(
            title="PDF Version Information Missing",
            severity="Low",
            confidence=0.35,
            explanation=(
                "The PDF version could not be determined from the document header. "
                "This is unusual and may indicate a non-standard or damaged PDF structure."
            ),
        )
    return None


def check_incremental_updates(meta: ExtractedMetadata) -> Optional[Finding]:
    """PDF has been incrementally saved — appended to after original creation."""
    updates = meta.incremental_updates
    prev    = meta.prev_xref_count or 0

    if updates is None:
        return None  # not a PDF

    if updates == 0 and prev == 0:
        return None  # clean

    # Inconsistency: /Prev pointer exists but no extra %%EOF
    if updates == 0 and prev > 0:
        return Finding(
            title="Inconsistent Incremental Update Markers",
            severity="Medium",
            confidence=0.65,
            explanation=(
                "The document contains internal cross-reference pointers (/Prev) "
                "suggesting prior versions, but no additional end-of-file markers "
                "were found. This structural inconsistency may indicate partial "
                "metadata editing or a malformed PDF."
            ),
        )

    severity   = "High" if updates >= 3 else "Medium" if updates == 2 else "Low"
    confidence = 0.80   if updates >= 3 else 0.70      if updates == 2 else 0.55

    return Finding(
        title=f"PDF Contains {updates} Incremental Update{'s' if updates > 1 else ''}",
        severity=severity,
        confidence=confidence,
        explanation=(
            f"The document has been saved incrementally {updates} time(s) after its "
            "original creation. Incremental updates are used for legitimate purposes "
            "such as adding digital signatures or filling forms, but they can also be "
            "used to modify document content while preserving original metadata. "
            f"{'A single update is common and low-risk.' if updates == 1 else 'Multiple incremental updates warrant closer review.'}"
        ),
    )


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

ALL_CHECKS = [
    # Date-based (requirement group 1)
    check_future_date,
    check_modified_before_created,
    check_modified_exists_but_created_missing,
    check_created_exists_modified_missing,
    check_both_dates_missing,
    check_invalid_date_format,
    check_modified_much_later,
    # Software/tool (requirement group 2)
    check_online_editing_tool,
    check_editing_tool_in_metadata,
    check_programmatic_tool,
    check_browser_printed,
    check_creator_producer_mismatch,
    check_scanner_tool,
    # Author / identity
    check_author_is_service,
    check_missing_author,
    # Structural
    check_missing_title,
    check_encrypted,
    check_incremental_updates,
    check_pdf_version_missing,
]


class MetadataChecker:
    @staticmethod
    def run_all_checks(meta: ExtractedMetadata) -> List[Finding]:
        findings = []
        for check in ALL_CHECKS:
            result = check(meta)
            if result is not None:
                findings.append(result)
        return findings