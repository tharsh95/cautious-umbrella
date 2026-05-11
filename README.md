# Document Metadata Mutation Checker

A professional full-stack application for analyzing document metadata to identify potential anomalies and inconsistencies. Extracts metadata from PDF, DOCX, and image files, runs rule-based validation checks, and generates structured risk reports.

> **Important**: This tool provides metadata analysis for informational purposes only. It does not constitute forensic evidence and should not be used as the sole basis for authenticity determinations.

## Features

- **Multi-format Support**: PDF, DOCX, JPEG, PNG, TIFF, BMP
- **Comprehensive Metadata Extraction**: Leverages PyMuPDF, python-docx, and Pillow
- **Rule-based Validation Engine**: 7+ validation rules for anomaly detection
- **Risk Scoring System**: Balanced scoring with severity and confidence weighting
- **Modern UI**: Clean, responsive interface with drag-and-drop upload
- **Structured Reports**: Detailed findings with exportable JSON reports

## Architecture Overview

### Backend (FastAPI)

```
backend/
├── main.py          # FastAPI application, endpoints, error handling
├── extractor.py     # Metadata extraction for PDF/DOCX/images
├── checks.py        # Rule-based validation logic
├── scorer.py        # Risk scoring and reasoning engine
├── models.py        # Pydantic data models
├── utils.py         # File validation utilities
└── requirements.txt # Python dependencies
```

**Key Design Decisions**:
- Modular architecture with clear separation of concerns
- Pydantic models for type safety and validation
- Stateless API design for scalability
- Comprehensive error handling with meaningful messages

### Frontend (React + Vite)

```
frontend/
├── src/
│   ├── components/
│   │   ├── Header.jsx          # Application header
│   │   ├── UploadArea.jsx      # Drag-and-drop upload interface
│   │   ├── ReportView.jsx      # Main report container
│   │   ├── RiskScoreCard.jsx   # Risk visualization
│   │   ├── FindingsCard.jsx    # Findings display
│   │   └── MetadataCard.jsx    # Metadata display
│   ├── App.jsx                 # Main application component
│   ├── main.jsx                # React entry point
│   └── index.css               # Tailwind CSS imports
├── index.html
├── package.json
└── vite.config.js
```

**Key Design Decisions**:
- Component-based architecture for maintainability
- Single-page application with state management via React hooks
- Tailwind CSS for rapid, consistent styling
- No external state management libraries (keeping it simple)

## Metadata Fields Extracted

### PDF Documents
- Title, Author, Subject, Keywords
- Creator (authoring application)
- Producer (PDF generation tool)
- Creation Date, Modification Date
- Encryption status
- Page count

### DOCX Documents
- Title, Author, Subject, Keywords, Category, Comments
- Created date, Modified date
- Last Modified By
- Revision number
- Paragraph count

### Images (JPEG, PNG, TIFF, BMP)
- Format, Mode, Dimensions
- EXIF data (if available):
  - DateTime Original, DateTime Digitized
  - Software, Camera Make/Model

## Validation Rules

### 1. Missing Creation Date
**Severity**: Medium | **Confidence**: High

Detects documents lacking creation timestamps. While some tools omit this naturally, absence may indicate metadata stripping or programmatic generation.

### 2. Invalid Chronology
**Severity**: High | **Confidence**: High

Identifies documents where modification date precedes creation date — a chronological impossibility indicating manipulation.

### 3. Creator/Producer Mismatch
**Severity**: Medium | **Confidence**: Medium

Flags suspicious combinations (e.g., Word creator with PyPDF producer) that may indicate conversion or processing through multiple tools.

### 4. Online Editing Tools
**Severity**: Medium | **Confidence**: High

Detects usage of online converters/editors (SmallPDF, iLovePDF, etc.) which typically modify or strip metadata.

### 5. Missing Author Information
**Severity**: Low | **Confidence**: Medium

Notes absence of author/creator fields, limiting origin traceability.

### 6. Document Encryption
**Severity**: Low | **Confidence**: High

Flags encrypted PDFs, which prevent internal structure inspection.

### 7. Future Dates
**Severity**: High | **Confidence**: High

Identifies timestamps set in the future — impossible without clock manipulation or manual editing.

## Scoring Logic

### Severity Weights

| Severity | Points |
|----------|--------|
| High     | 30     |
| Medium   | 15     |
| Low      | 5      |

### Confidence Multipliers

| Confidence | Multiplier |
|------------|------------|
| High       | 1.0×       |
| Medium     | 0.7×       |
| Low        | 0.4×       |

### Risk Levels

| Level    | Score Range | Description |
|----------|-------------|-------------|
| Critical | 70–100      | Multiple high-severity findings or clear manipulation indicators |
| High     | 45–69       | Significant anomalies suggesting potential alteration |
| Medium   | 20–44       | Unusual patterns that warrant attention |
| Low      | 0–19        | Minor observations, common in normal workflows |

**Design Philosophy**: The scoring system is intentionally conservative. Weak signals alone don't trigger high-risk classifications. Multiple corroborating findings are required for elevated risk levels.

## Installation & Setup

### Prerequisites
- Python 3.8+ (backend)
- Node.js 16+ (frontend)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

Backend runs on `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend runs on `http://localhost:5173`

### Production Build

```bash
cd frontend
npm run build
```

Build output goes to `frontend/dist/`

## API Documentation

### `POST /api/analyze`

Upload and analyze a document.

**Request**:
- Content-Type: `multipart/form-data`
- Body: `file` (binary)

**Response**:
```json
{
  "filename": "document.pdf",
  "file_type": "PDF Document",
  "analyzed_at": "2024-01-15T10:30:00Z",
  "metadata": {
    "format": "PDF",
    "author": "John Doe",
    "creation_date": "D:20240115103000"
  },
  "findings": [
    {
      "rule_id": "missing_creation_date",
      "title": "Missing Creation Date",
      "severity": "medium",
      "confidence": "high",
      "explanation": "The document lacks a creation date timestamp...",
      "metadata_fields": {
        "creation_date": null
      }
    }
  ],
  "risk_score": {
    "score": 45,
    "level": "medium",
    "reasoning": "Detected 2 metadata anomalies..."
  },
  "summary": "Analysis identified 2 metadata observations..."
}
```

**Error Responses**:
- `400`: Invalid file type or validation error
- `500`: Server error during processing

## Sample API Response

```json
{
  "filename": "suspicious_document.pdf",
  "file_type": "PDF Document",
  "analyzed_at": "2024-01-15T14:23:45.123456Z",
  "metadata": {
    "format": "PDF",
    "title": "Contract Agreement",
    "author": null,
    "subject": null,
    "creator": "Microsoft Word",
    "producer": "PyPDF2",
    "creation_date": "D:20240120143000+05'30'",
    "modification_date": "D:20240115120000+05'30'",
    "keywords": null,
    "encrypted": null,
    "page_count": 3
  },
  "findings": [
    {
      "rule_id": "invalid_chronology",
      "title": "Invalid Date Chronology",
      "severity": "high",
      "confidence": "high",
      "explanation": "The modification date (2024-01-15T12:00:00) is earlier than the creation date (2024-01-20T14:30:00). This is chronologically impossible and suggests metadata manipulation.",
      "metadata_fields": {
        "creation_date": "D:20240120143000+05'30'",
        "modification_date": "D:20240115120000+05'30'"
      }
    },
    {
      "rule_id": "creator_producer_mismatch",
      "title": "Creator/Producer Mismatch",
      "severity": "medium",
      "confidence": "medium",
      "explanation": "The creator application (Microsoft Word) does not typically pair with the producer (PyPDF2). This may indicate the PDF was converted or processed through multiple tools.",
      "metadata_fields": {
        "creator": "Microsoft Word",
        "producer": "PyPDF2"
      }
    },
    {
      "rule_id": "missing_author",
      "title": "Missing Author Information",
      "severity": "low",
      "confidence": "medium",
      "explanation": "The document does not specify an author. While some tools omit this by default, its absence means the document's origin cannot be traced through metadata alone.",
      "metadata_fields": {
        "author": null
      }
    }
  ],
  "risk_score": {
    "score": 56,
    "level": "high",
    "reasoning": "Detected 3 metadata anomalies with a combined score of 56/100. Multiple indicators suggest the document's metadata may have been altered or is inconsistent with typical document creation workflows. Further investigation is recommended to understand the document's provenance."
  },
  "summary": "Analysis identified 3 metadata anomalies. 1 high-severity finding indicates patterns inconsistent with unmodified documents. These findings suggest further investigation may be warranted. Review individual findings below for details."
}
```

## Usage

1. Start both servers (backend on `:8000`, frontend on `:5173`)
2. Open browser to `http://localhost:5173`
3. Upload a document via drag-and-drop or file picker
4. Review the report with risk score and findings
5. Download JSON for record-keeping or further analysis

## Code Quality

### Backend
- **Type Safety**: Pydantic models for all data structures
- **Error Handling**: Comprehensive try-catch with meaningful errors
- **Modularity**: Each module has a single, clear responsibility
- **Documentation**: Docstrings for all classes and non-trivial functions
- **Validation**: Input validation at API boundary

### Frontend
- **Component Structure**: Small, focused, reusable components
- **State Management**: Minimal state, lifted where needed
- **Error Handling**: User-friendly error messages
- **Responsive Design**: Mobile-friendly with Tailwind
- **Accessibility**: Semantic HTML, keyboard navigation support

## Limitations

### Current Scope
- **Analysis only**: No document modification or repair capabilities
- **Metadata-focused**: Does not analyze document content or structure
- **Rule-based**: Not machine learning; limited to predefined patterns
- **Single file**: No batch processing support

### Known Limitations
1. **Not Forensic-Grade**: Cannot detect sophisticated manipulation techniques (steganography, deep structural changes)
2. **Context-Free**: Cannot evaluate document authenticity without knowing legitimate workflow
3. **False Positives**: Legitimate editing workflows can trigger findings
4. **Format Limitations**: Limited EXIF support for images; no RAW format support
5. **Language**: English-only explanations and UI

## Roadmap

### Core Functionality
1. **Machine Learning**: Train models on known manipulated vs. genuine documents
2. **Content Analysis**: OCR + NLP to detect content-metadata inconsistencies
3. **Batch Processing**: Multi-file upload and comparative analysis
4. **Historical Tracking**: Database to track documents over time and detect changes

### Advanced Features
5. **PDF Structure Analysis**: Deep inspection of internal PDF structure for signs of manipulation
6. **Digital Signature Verification**: Check and validate embedded signatures
7. **Cross-Document Analysis**: Detect relationships and inconsistencies across multiple files
8. **Custom Rules**: Allow users to define custom validation rules

### Enterprise Features
9. **User Authentication**: Multi-user support with role-based access
10. **Audit Trail**: Complete logging of all analyses performed
11. **API Rate Limiting**: Protect against abuse
12. **Report Templates**: Customizable report formats (PDF, DOCX exports)

### UX Improvements
13. **Real-time Analysis**: Stream findings as they're discovered
14. **Comparison Mode**: Side-by-side comparison of multiple documents
15. **Educational Mode**: Tutorials and explanations of each rule
16. **Mobile App**: Native mobile application for on-the-go analysis

### Performance & Scale
17. **Async Processing**: Background job queue for large files
18. **Caching**: Cache extracted metadata for faster re-analysis
19. **CDN Integration**: Serve static assets via CDN
20. **Microservices**: Split extractors into separate services for scaling

## Testing

### Manual Testing Checklist
- [ ] Upload valid PDF with complete metadata
- [ ] Upload PDF with manipulated dates
- [ ] Upload DOCX from different editors (Word, LibreOffice, Google Docs)
- [ ] Upload images with/without EXIF data
- [ ] Test file size limits (>50 MB should fail)
- [ ] Test unsupported formats (.txt, .xlsx)
- [ ] Test corrupted files
- [ ] Verify all findings display correctly
- [ ] Test JSON download functionality
- [ ] Test responsive design on mobile

### Automated Testing (Future)
```bash
# Backend
pytest backend/tests/

# Frontend
npm run test
```

## Security Considerations

- **File Validation**: Size and type checking before processing
- **CORS**: Configured for local development only
- **No File Storage**: Files processed in-memory, never saved to disk
- **Input Sanitization**: All user inputs validated via Pydantic
- **Dependency Security**: Regular updates recommended

**Before deploying to production**:
1. Update CORS origins to your domain
2. Add rate limiting (e.g., via Nginx or FastAPI middleware)
3. Implement authentication if needed
4. Use HTTPS for all communication
5. Add monitoring and logging
6. Scan dependencies for vulnerabilities

## Technology Stack

### Backend
- **FastAPI**: Modern, high-performance Python web framework
- **PyMuPDF (fitz)**: PDF processing and metadata extraction
- **python-docx**: DOCX metadata extraction
- **Pillow**: Image processing and EXIF data extraction
- **Pydantic**: Data validation and serialization
- **Uvicorn**: ASGI server

### Frontend
- **React 18**: UI library
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework

## License

This project is provided as-is for educational and assessment purposes.

## Acknowledgments

Built as a technical assessment demonstrating full-stack development capabilities with a focus on clean architecture, practical engineering, and thoughtful problem-solving.

---

**Questions or Issues?** This is a demonstration project. For production use, significant enhancements would be required (see [Roadmap](#roadmap)).