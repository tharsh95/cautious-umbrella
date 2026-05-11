"""Main FastAPI application — Document Metadata Mutation Checker."""
import traceback

from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from checks import MetadataChecker
from extractor import MetadataExtractor
from models import AnalysisReport, ExtractedMetadata
from scorer import RiskScorer
from utils import friendly_file_type, validate_file


app = FastAPI(
    title="Document Metadata Mutation Checker",
    description=(
        "Analyzes document metadata for potential anomalies and "
        "mutation indicators. Supports PDF, DOCX, JPG, and PNG."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Document Metadata Mutation Checker", "version": "1.0.0"}


@app.post("/api/analyze", response_model=AnalysisReport)
async def analyze_document(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None),
):
    """
    Upload a document and receive a structured metadata analysis report.

    Accepted formats: PDF, DOCX, JPG, PNG, TIFF, BMP.
    Pass an optional `password` form field for password-protected PDFs.
    """
    # ------------------------------------------------------------------ #
    # 1. Read file with a hard size guard                                  #
    # ------------------------------------------------------------------ #
    MAX_BYTES = 20 * 1024 * 1024          # 20 MB
    file_bytes = await file.read(MAX_BYTES + 1)

    if len(file_bytes) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum allowed size is 20 MB."
        )

    # ------------------------------------------------------------------ #
    # 2. Validate                                                          #
    # ------------------------------------------------------------------ #
    error = validate_file(file.filename, len(file_bytes))
    if error:
        raise HTTPException(status_code=400, detail=error)

    # ------------------------------------------------------------------ #
    # 3. Extract metadata                                                  #
    # ------------------------------------------------------------------ #
    try:
        raw = MetadataExtractor.extract(file_bytes, file.filename, password=password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Metadata extraction failed: {exc}")

    # ------------------------------------------------------------------ #
    # 4. Build ExtractedMetadata model                                     #
    # ------------------------------------------------------------------ #
    # Always use friendly label for consistency (not content_type from client)
    file_type_label = friendly_file_type(file.filename)

    extracted = ExtractedMetadata(
        file_name=file.filename,
        file_size_bytes=len(file_bytes),
        file_type=file_type_label,
        pdf_version=raw.get("pdf_version"),
        created_date=raw.get("created_date"),
        modified_date=raw.get("modified_date"),
        raw_created_date=raw.get("raw_created_date"),
        raw_modified_date=raw.get("raw_modified_date"),
        author=raw.get("author"),
        creator=raw.get("creator"),
        producer=raw.get("producer"),
        title=raw.get("title"),
        subject=raw.get("subject"),
        page_count=raw.get("page_count"),
        is_encrypted=raw.get("is_encrypted", False),
        incremental_updates=raw.get("incremental_updates"),
        prev_xref_count=raw.get("prev_xref_count"),
        extra=raw.get("extra"),
    )

    # ------------------------------------------------------------------ #
    # 5. Run rule-based checks                                             #
    # ------------------------------------------------------------------ #
    findings = MetadataChecker.run_all_checks(extracted)

    # ------------------------------------------------------------------ #
    # 6. Score                                                             #
    # ------------------------------------------------------------------ #
    score, level, summary, recommended_action = RiskScorer.calculate(findings)

    # ------------------------------------------------------------------ #
    # 7. Build and return report                                           #
    # ------------------------------------------------------------------ #
    report = AnalysisReport(
        document_name=file.filename,
        file_type=file_type_label,
        metadata_risk_score=score,
        metadata_risk_level=level,
        summary=summary,
        extracted_metadata=extracted,
        findings=findings,
        recommended_action=recommended_action,
    )

    return report


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)