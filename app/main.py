import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.forecast_model import ModelLoadError, get_forecast_model
from app.routers import admin, auth, catalog, forecast, orders

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)  # no-op if app.seed already ran
    try:
        get_forecast_model()
    except ModelLoadError:
        logger.exception("Forecast model failed to load at startup")
        raise
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = f"/api/{settings.api_version}"
app.include_router(auth.router, prefix=api)
app.include_router(catalog.router, prefix=api)
app.include_router(orders.router, prefix=api)
app.include_router(forecast.router, prefix=api)
app.include_router(admin.router, prefix=api)


@app.get(f"{api}/health")
def health():
    try:
        get_forecast_model()
        loaded = True
    except Exception:
        loaded = False
    return {"status": "ok" if loaded else "degraded", "model_loaded": loaded}


# Registered after the API routers, so /api/v1/* and /docs resolve there
# first — this only catches whatever those routes don't claim.
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
