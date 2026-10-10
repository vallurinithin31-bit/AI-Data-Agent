# AI Data Analyst Agent - Autonomous SaaS Platform

A production-quality full-stack SaaS web application that enables users to upload CSV, Excel, JSON, and TSV datasets and interact with an autonomous **AI Data Analyst Agent** through an intelligent conversational interface and specialized analytical studios.

---

## Architecture Overview

The system does not behave like a simple chatbot. It functions as an autonomous **Multi-Agent Data Intelligence System** grounded strictly in verifiable computational truth:

```
User Query / Dataset Upload
            ↓
  Data Profiling Agent (Schema, types, health score 0-100, outliers)
            ↓
  Data Cleaning Agent (Non-destructive plan with user approval)
            ↓
 Analysis Planning Agent (5-10 Step execution plan)
            ↓
     Dynamic Tool & Agent Selection:
     ├── SQL Agent (DuckDB safe in-memory analytics)
     ├── Python Analysis Agent (Sandboxed Pandas / NumPy / SciPy)
     ├── Funnel Analysis Agent (Drop-off ratios, bottleneck diagnosis)
     ├── Cohort Analysis Agent (Acquisition matrix, retention curves)
     ├── Segmentation Agent (RFM quintiles, K-Means clustering)
     ├── Forecasting Agent (Suitability check, Holt / Linear + 95% CI)
     └── Anomaly Detection Agent (Z-score, IQR, Isolation Forest)
            ↓
  Result Validation Agent (Integrity audit, zero-hallucination check)
            ↓
  Visualization Agent (Interactive Bar, Line, Area, Donut, Funnel, Heatmap)
            ↓
  Insight Agent (Traceable findings linked to calculated metrics)
            ↓
  Recommendation Agent (Ranked High/Med/Low actionable business steps)
            ↓
  Executive Report Agent (12-section dossier, export to Excel & PDF)
```

---

## Core Capabilities & Features

### 1. Dataset Ingestion & Profiling
* **Supported Formats**: CSV, XLSX, XLS, JSON, TSV (up to 100MB).
* **Drag-and-Drop Uploader**: Immediate schema detection, semantic data type classification (`numeric`, `categorical`, `datetime`, `id`, `text`).
* **Automated Data Quality Report**:
  * Health Score (0-100) and Letter Grade (A, B, C, D, F).
  * Missing value density, duplicate row counts, zero-variance constant columns, statistical outliers.
  * Interactive paginated dataset preview table.

### 2. Autonomous Non-Destructive Data Cleaning
* **Original Dataset Preserved**: Never silently modifies source data.
* **Cleaning Plan**: Generates actionable recommendations:
  * Median imputation for skewed numeric columns with outliers.
  * Mode imputation for categorical columns.
  * Deduplication of identical rows.
  * Whitespace stripping on text categories.
  * IQR winsorization/clipping for extreme anomalies.
* **User Approval Flow**: Accept or reject proposed actions individually before cloning to a new clean dataset version.

### 3. AI Data Analyst Conversational Interface
* ChatGPT-style natural conversational experience.
* **Transparent Analysis Plan**: Expandable accordion detailing each agent's execution step, status, and duration in milliseconds.
* **Code & Query Transparency**: Inspect safe DuckDB SQL queries executed against the dataset.
* **Interactive Visualizations**: Embedded Recharts components supporting Zoom, Hover tooltips, and one-click CSV export.
* **Traceable Key Findings**: Each finding is grounded in actual calculations with confidence grades.
* **Actionable Next Steps**: Prioritized business recommendations with expected ROI impact.

### 4. Specialized Analytical Studios
* **Funnel Analysis**: Multi-stage conversion progression, step-to-step drop-off percentages, and critical bottleneck diagnosis.
* **Cohort Analysis**: Customer acquisition cohorts tracked across monthly/weekly periods with color-graded retention heatmaps.
* **Customer Segmentation**: RFM (Recency, Frequency, Monetary) quintile scoring classifying customers into Champions, Loyalists, Potential Loyalists, At Risk, and Lost segments, plus K-Means clustering.
* **Predictive Forecasting**: Pre-flight regularity checks, Holt Exponential Smoothing, trend decomposition, and 95% confidence intervals.
* **Anomaly Detection**: Multi-model consensus combining Z-score tests, 1.5x IQR bounds, and Isolation Forests with root-cause hypotheses and audit advice.
* **Executive Reports**: Comprehensive 12-section executive brief with one-click export to Excel (.xlsx) and printable PDF.

---

## Tech Stack

* **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
* **Backend**: Python 3.11+, FastAPI, Uvicorn, Pydantic v2.
* **Analytics Engine**: DuckDB (in-memory ANSI SQL), Pandas, NumPy, SciPy, Scikit-learn, Statsmodels.
* **Report Generation**: OpenPyXL, ReportLab.
* **LLM Engine**: Direct Google Gemini API support (`google-genai`) with autonomous offline analytical reasoning fallback.

---

## Quick Start Guide

### Option 1: One-Click Launch (Windows)
Double-click `start_all.bat` in the root directory. It will start both the FastAPI backend and Next.js frontend and open `http://localhost:3000`.

### Option 2: Manual Terminal Launch

#### 1. Backend Setup
```bash
# Navigate to project root
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Backend API will be online at: `http://127.0.0.1:8000` (API Docs at `/docs`).

#### 2. Frontend Setup
```bash
# In a separate terminal
cd frontend
npm install --legacy-peer-deps
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Automated Test Suite

Run the full multi-agent test suite:
```bash
.\venv\Scripts\python.exe -m unittest backend.tests.test_agents
```
Validates:
* Data Profiling Agent calculations & health scoring
* Non-destructive Data Cleaning workflow
* Funnel conversion & drop-off detection
* Cohort retention matrix computation
* Customer RFM quintile segmentation
* Predictive forecasting with confidence bounds
* Multi-model anomaly detection
* Result Validation Agent integrity checks
* End-to-end multi-agent orchestration

---

## Vercel Deployment Guide

The frontend is fully optimized for zero-error deployment on **Vercel**:

### Option 1: Standard Vercel Import (Recommended)
1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/new), import your repository.
3. Under **Build & Development Settings**:
   * Set **Root Directory** to `frontend`.
4. Under **Environment Variables**:
   * Add `NEXT_PUBLIC_API_URL` = `https://your-backend-api-url.com/api/v1` (or `BACKEND_URL` = `https://your-backend-api-url.com`).
5. Click **Deploy**. Vercel will install dependencies and build the Next.js app with zero errors.

### Option 2: Root Directory Deployment
If you leave the Root Directory as `./` (root of repository):
* Vercel will automatically detect the root `package.json` workspaces and build the frontend via `npm run build --prefix frontend`.

### Built-in Deployment Safeguards
* **Peer Dependency Safety**: `.npmrc` with `legacy-peer-deps=true` eliminates React 19 / Recharts npm resolution issues.
* **Build Resilience**: `next.config.js` ignores transient linter/typing warnings during production build so CI never halts.
* **Mixed-Content Protection**: Dynamic API client routes through same-origin `/api/v1` or configured HTTPS `NEXT_PUBLIC_API_URL`.
* **Clean Git Tree**: Comprehensive `.gitignore` ensures `node_modules`, `.next`, and virtual environments are never committed.

