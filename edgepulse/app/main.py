"""FastAPI Application Entry Point for EdgePulse."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.chat import router as chat_router
from app.api.diagnostics import router as diagnostics_router
from app.api.health import router as health_router
from app.api.incidents import router as incidents_router
from app.api.stats import router as stats_router
from app.core.config import settings
from app.core.logging import log_event, logger
from app.db.database import init_db
from app.utils.errors import EdgePulseException


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    log_event("application_starting", env=settings.APP_ENV, version=settings.VERSION)
    await init_db()
    yield
    log_event("application_shutting_down")


app = FastAPI(
    title="EdgePulse — AI Internet Incident Investigator",
    description=(
        "Production-ready backend for EdgePulse. Uses LLMs to safely classify incidents, "
        "orchestrate allowlisted diagnostic probes (DNS, HTTP, Latency, Security Headers, HTTPS), "
        "synthesize root cause analysis, and provide interactive follow-up investigations."
    ),
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------------------------------------
# Global Exception Handlers
# -------------------------------------------------------------

@app.exception_handler(EdgePulseException)
async def edgepulse_exception_handler(request: Request, exc: EdgePulseException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_error = errors[0]["msg"] if errors else "Invalid request payload"
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": first_error,
                "details": errors,
            }
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Handle structured details if already formatted
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred while processing the request.",
            }
        },
    )


# -------------------------------------------------------------
# Router Registrations
# -------------------------------------------------------------
app.include_router(health_router)
app.include_router(incidents_router)
app.include_router(chat_router)
app.include_router(diagnostics_router)
app.include_router(stats_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
