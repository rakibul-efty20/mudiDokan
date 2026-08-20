from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Supershop API"
    api_version: str = "v1"
    model_path: str = "models/grocery_forecast_full.pkl"
    database_url: str = "sqlite:///./supershop.db"
    cors_origins: list[str] = ["*"]  # tighten to your frontend's origin in production

    jwt_secret: str = "dev-secret-change-this-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24h

    account_discount_percent: float = 5.0  # applied to logged-in (non-guest) orders

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
