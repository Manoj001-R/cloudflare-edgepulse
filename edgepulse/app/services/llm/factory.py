"""LLM Provider Factory based on environment configuration."""
from app.core.config import settings
from app.services.llm.base import LLMProvider
from app.services.llm.cloudflare_provider import CloudflareProvider
from app.services.llm.openai_provider import OpenAIProvider


class LLMProviderFactory:
    @staticmethod
    def get_provider() -> LLMProvider:
        provider_type = settings.LLM_PROVIDER.lower().strip()
        if provider_type == "cloudflare":
            return CloudflareProvider(
                account_id=settings.CLOUDFLARE_ACCOUNT_ID,
                api_token=settings.CLOUDFLARE_API_TOKEN,
                model=settings.CLOUDFLARE_MODEL,
            )
        # Default to OpenAI / OpenAI-compatible
        return OpenAIProvider(
            api_key=settings.OPENAI_API_KEY,
            model=settings.OPENAI_MODEL,
            base_url=settings.OPENAI_BASE_URL,
        )
