"""Pydantic models matching the assessment's required JSON output format."""
from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class Finding(BaseModel):
    """Represents a single metadata anomaly finding."""
    title: str
    severity: str        # "High", "Medium", "Low"
    confidence: float    # 0.0 to 1.0
    explanation: str


class ExtractedMetadata(BaseModel):
    """Metadata extracted from the document."""
    file_name: str
    file_size_bytes: int
    file_type: str
    pdf_version: Optional[str] = None
    created_date: Optional[str] = None
    modified_date: Optional[str] = None
    # Raw unparsed date strings — used by check_invalid_date_format
    raw_created_date: Optional[str] = None
    raw_modified_date: Optional[str] = None
    author: Optional[str] = None
    creator: Optional[str] = None
    producer: Optional[str] = None
    title: Optional[str] = None
    subject: Optional[str] = None
    page_count: Optional[int] = None
    is_encrypted: bool = False
    incremental_updates: Optional[int] = None   # PDF only: number of incremental saves
    prev_xref_count: Optional[int] = None       # PDF only: /Prev xref pointer count
    extra: Optional[Dict[str, Any]] = None


class AnalysisReport(BaseModel):
    """
    Complete analysis report.
    Field names match the assessment's example JSON output exactly.
    """
    document_name: str
    file_type: str
    metadata_risk_score: int          # 0-100
    metadata_risk_level: str          # "Low" | "Medium" | "High"
    summary: str
    extracted_metadata: ExtractedMetadata
    findings: List[Finding]
    recommended_action: str