# Document Metadata Mutation Checker

A full-stack tool that extracts metadata from documents and flags anomalies using rule-based validation.

> **Disclaimer**: For informational purposes only. Not forensic evidence. Do not use as sole basis for authenticity determinations.

---

## Tools & Libraries

| Layer | Tool | Purpose |
|-------|------|---------|
| Backend | FastAPI | REST API framework |
| Backend | PyMuPDF (`fitz`) | PDF metadata extraction |
| Backend | python-docx | DOCX metadata extraction |
| Backend | Pillow | Image + EXIF extraction |
| Backend | Pydantic | Data validation & schemas |
| Backend | Uvicorn | ASGI server |
| Frontend | React 18 | UI library |
| Frontend | Vite | Build tool & dev server |
| Frontend | Tailwind CSS | Styling |

---

## Metadata Fields Extracted

**PDF**
`title` · `author` · `subject` · `keywords` · `creator` · `producer` · `creation_date` · `modification_date` · `encrypted` · `page_count`

**DOCX**
`title` · `author` · `subject` · `keywords` · `category` · `comments` · `created` · `modified` · `last_modified_by` · `revision` · `paragraph_count`

**Images (JPEG, PNG, TIFF, BMP)**
`format` · `mode` · `dimensions` · EXIF: `datetime_original` · `datetime_digitized` · `software` · `make` · `model`

---

## Validation Rules

| # | Rule | Severity | Confidence |
|---|------|----------|------------|
| 1 | **Missing Creation Date** — no timestamp present | Medium | High |
| 2 | **Invalid Chronology** — modification date precedes creation date | High | High |
| 3 | **Creator/Producer Mismatch** — e.g. Word creator + PyPDF2 producer | Medium | Medium |
| 4 | **Online Editing Tool Detected** — SmallPDF, iLovePDF, etc. | Medium | High |
| 5 | **Missing Author** — no author field present | Low | Medium |
| 6 | **Encrypted Document** — prevents internal inspection | Low | High |
| 7 | **Future Date** — timestamp set beyond current date | High | High |

---

## Scoring Logic

Each triggered rule contributes points:

```
score += severity_weight × confidence_multiplier
```

| Severity | Weight | Confidence | Multiplier |
|----------|--------|------------|------------|
| High     | 30 pts | High       | 1.0×       |
| Medium   | 15 pts | Medium     | 0.7×       |
| Low      | 5 pts  | Low        | 0.4×       |

**Risk levels** (out of 100):

| Score | Level |
|-------|-------|
| 70–100 | 🔴 Critical |
| 45–69  | 🟠 High |
| 20–44  | 🟡 Medium |
| 0–19   | 🟢 Low |

Scoring is intentionally conservative — a single weak signal does not escalate risk. Multiple corroborating findings are required to reach High or Critical.

---

## Limitations

- **Not forensic-grade**: Cannot detect steganography, deep structural manipulation, or forged digital signatures
- **Metadata only**: Does not analyze document content, layout, or embedded objects
- **Rule-based**: Fixed patterns; no ML-based anomaly detection
- **False positives**: Legitimate editing workflows (e.g. converting via third-party tools) can trigger findings
- **Single file**: No batch processing
- **No persistence**: Analyses are not stored; no historical comparison
- **English only**: UI and explanations are English-only
- **Limited image support**: No RAW format; EXIF availability varies by device

---

## What I Would Improve With More Time

**Detection quality**
- ML model trained on manipulated vs. genuine documents for probabilistic scoring
- Deep PDF structure analysis (object streams, cross-reference tables, incremental updates)
- Content-metadata consistency checks via OCR + NLP
- Digital signature verification

**Functionality**
- Batch upload and comparative analysis across documents
- Historical tracking — detect changes to the same document over time
- Custom user-defined validation rules

**Production readiness**
- Async job queue for large files (Celery + Redis)
- Rate limiting, authentication, and audit logging
- Docker + Nginx configuration
- Automated test suite (pytest, React Testing Library, Playwright E2E)
- Monitoring and alerting (Sentry, Datadog)

**UX**
- Real-time streaming of findings as they're discovered
- Side-by-side document comparison mode
- Exportable reports in PDF and DOCX formats