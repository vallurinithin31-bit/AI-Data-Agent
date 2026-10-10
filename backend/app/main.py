from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.api.datasets import router as datasets_router
from backend.app.api.analysis import router as analysis_router
from backend.app.api.custom_export import router as custom_export_router
from backend.app.api.data_generation import router as data_generation_router
from backend.app.tools.data_loader import restore_persisted_datasets

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Restore persisted user-uploaded datasets on startup (no auto-generated demo data)
    restore_persisted_datasets()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Autonomous AI Data Analyst Agent Backend API",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(datasets_router, prefix=settings.API_V1_STR)
app.include_router(analysis_router, prefix=settings.API_V1_STR)
app.include_router(custom_export_router, prefix=settings.API_V1_STR)
app.include_router(data_generation_router, prefix=settings.API_V1_STR)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "endpoints": {
            "datasets": f"{settings.API_V1_STR}/datasets",
            "analysis": f"{settings.API_V1_STR}/analysis",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
