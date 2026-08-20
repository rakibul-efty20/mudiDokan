import logging

from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_role
from app.db_models import User, UserRole
from app.forecast_model import GroceryForecastModel, get_forecast_model
from app.schemas import ForecastRequest, ForecastResponse, ItemsResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/forecast", tags=["forecast"])

STAFF = (UserRole.shopkeeper, UserRole.admin)


@router.post("/predict", response_model=ForecastResponse)
def predict_seasonal_demand(
    payload: ForecastRequest,
    model: GroceryForecastModel = Depends(get_forecast_model),
    _user: User = Depends(require_role(*STAFF)),
) -> ForecastResponse:
    try:
        result = model.predict_year(payload)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from None
    except Exception:
        logger.exception("Prediction failed for payload: %s", payload)
        raise HTTPException(status_code=500, detail="Prediction failed") from None
    return ForecastResponse(**result)


@router.get("/items", response_model=ItemsResponse)
def list_forecastable_items(
    model: GroceryForecastModel = Depends(get_forecast_model),
    _user: User = Depends(require_role(*STAFF)),
) -> ItemsResponse:
    return ItemsResponse(all_items=model.all_items)
