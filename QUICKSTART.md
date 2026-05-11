# Quick Start Guide

Get the Document Metadata Mutation Checker running in under 5 minutes.

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- Terminal/Command Prompt

## Step 1: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv

# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Start the backend server
uvicorn main:app --reload
```

✅ Backend running on **http://localhost:8000** — keep this terminal open.

## Step 2: Frontend Setup

Open a **new terminal window** and run:

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start the development server
npm run dev
```

✅ Frontend running on **http://localhost:5173**

## Step 3: Use the Application

1. Open your browser to **http://localhost:5173**
2. Drag and drop a document (PDF, DOCX, or image)
3. Wait for analysis to complete
4. Review the risk report and findings
5. Download JSON report if needed

## Supported File Types

| Format | Extensions |
|--------|------------|
| PDF | `.pdf` |
| Word Document | `.docx` |
| Image | `.jpg`, `.jpeg`, `.png`, `.tiff`, `.bmp` |

Maximum file size: **50 MB**

## Troubleshooting

### Backend won't start

**`ModuleNotFoundError: No module named 'fastapi'`**
Activate the virtual environment first, then re-run `pip install -r requirements.txt`.

**`Address already in use`**
Port 8000 is occupied. Stop the conflicting service or change the port in `main.py`.

### Frontend won't start

**`command not found: npm`**
Install Node.js from https://nodejs.org/

**Port 5173 already in use**
Stop other Vite projects or change the port in `vite.config.js`.

### CORS errors in browser console

Make sure both servers are running — backend on port 8000, frontend on port 5173.

### File upload fails

**`Unsupported file type`** — Only PDF, DOCX, and image formats are supported.

**`File size exceeds maximum`** — File must be under 50 MB.

## Test Scenarios

| Scenario | Expected Result |
|----------|----------------|
| Standard PDF from Word/Adobe | Clean report, low risk |
| Photo from phone (with EXIF) | EXIF fields populated |
| Word DOCX | Author/revision metadata shown |
| File close to 50 MB | Accepted and analyzed |
| `.txt` or `.xlsx` file | Rejected with clear error |

## Quick Reference

| Component | URL | Port |
|-----------|-----|------|
| Frontend  | http://localhost:5173 | 5173 |
| Backend   | http://localhost:8000 | 8000 |
| API Docs  | http://localhost:8000/docs | 8000 |

## Stopping the Servers

Press `Ctrl+C` in each terminal to stop. To deactivate the Python virtual environment:

```bash
deactivate
```

## Next Steps

- Read **README.md** for full architecture details
- Review **API docs** at `http://localhost:8000/docs`
- Check the validation rules section in README to understand findings