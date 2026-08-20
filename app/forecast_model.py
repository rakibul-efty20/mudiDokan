import logging
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.config import settings
from app.schemas import ForecastRequest

logger = logging.getLogger(__name__)

ITEM_PREFIX = "itemDescription_"


class ModelLoadError(RuntimeError):
    pass


class GroceryForecastModel:
    """All 167 catalog items are individually modeled — unlike the standalone
    grocery-forecast-api build, there's no top-N feature cutoff here, so
    there's no "unrecognized item" fallback case to handle."""

    def __init__(self, model_path: str):
        path = Path(model_path)
        if not path.exists():
            raise ModelLoadError(f"Model file not found at '{path.resolve()}'.")
        try:
            artifact = joblib.load(path)
            self.model = artifact["model"]
            self.feature_order: list[str] = artifact["features"]
            self.all_items: list[str] = artifact["all_items"]
        except Exception as exc:  # noqa: BLE001
            raise ModelLoadError(f"Failed to load model artifact: {exc}") from exc

        logger.info("Model loaded from %s. %d items.", path, len(self.all_items))

    def _row(self, item: str, year: int, month: int) -> pd.DataFrame:
        derived = {f: 0 for f in self.feature_order}
        derived["year"] = year
        derived["month_sin"] = np.sin(2 * np.pi * month / 12)
        derived["month_cos"] = np.cos(2 * np.pi * month / 12)
        item_key = f"{ITEM_PREFIX}{item}"
        if item_key not in derived:
            raise KeyError(f"'{item}' is not in the trained catalog")
        derived[item_key] = 1
        return pd.DataFrame([derived])[self.feature_order]

    def predict_year(self, payload: ForecastRequest) -> dict:
        monthly = []
        for month in range(1, 13):
            row = self._row(payload.item, payload.year, month)
            qty = float(self.model.predict(row)[0])
            monthly.append({"month": month, "quantity": round(max(qty, 0), 1)})
        return {
            "item": payload.item,
            "year": payload.year,
            "monthly": monthly,
            "total": round(sum(m["quantity"] for m in monthly), 1),
        }


@lru_cache
def get_forecast_model() -> GroceryForecastModel:
    return GroceryForecastModel(settings.model_path)
