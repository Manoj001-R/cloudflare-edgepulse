"""Application Configuration using Pydantic Settings v2."""
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # General
    PROJECT_NAME: str = "EdgePulse"
    VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:8787"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    # Demo Mode
    DEMO_MODE: bool = False

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./edgepulse.db"

    # LLM Settings
    LLM_PROVIDER: str = "openai"  # 'openai' | 'cloudflare' | 'custom'
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"

    CLOUDFLARE_ACCOUNT_ID: str = ""
    CLOUDFLARE_API_TOKEN: str = ""
    CLOUDFLARE_MODEL: str = "@cf/meta/llama-3.1-8b-instruct"

    # Latency Classification Thresholds (ms)
    LATENCY_LOW_THRESHOLD_MS: float = 300.0
    LATENCY_MODERATE_THRESHOLD_MS: float = 1000.0
    LATENCY_HIGH_THRESHOLD_MS: float = 2000.0

    # Rate Limiting
    RATE_LIMIT_INCIDENT_PER_MINUTE: int = 20
    RATE_LIMIT_CHAT_PER_MINUTE: int = 60
    RATE_LIMIT_TOOLS_PER_MINUTE: int = 40

    # Security & HTTP Constraints
    REQUEST_TIMEOUT_SECONDS: float = 10.0
    MAX_RESPONSE_BYTES: int = 2 * 1024 * 1024  # 2MB
    MAX_REDIRECTS: int = 5
    ALLOWED_PORTS: str = "80,443"

    @property
    def allowed_ports_list(self) -> List[int]:
        return [int(p.strip()) for p in self.ALLOWED_PORTS.split(",") if p.strip().isdigit()]


settings = Settings()
