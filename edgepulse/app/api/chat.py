"""Chat and Follow-up API endpoints."""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.security import check_rate_limit
from app.db.database import get_db
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse, MessageResponse
from app.services.chat_service import ChatService

router = APIRouter(prefix="/api/incidents", tags=["Chat & Follow-up"])


@router.get("/{incident_id}/messages", summary="Get incident chat conversation history")
async def get_messages(incident_id: str, db: AsyncSession = Depends(get_db)):
    svc = ChatService(db)
    messages = await svc.get_messages(incident_id)
    return {"success": True, "incident_id": incident_id, "messages": messages}


@router.post("/{incident_id}/chat", response_model=ChatMessageResponse, summary="Send follow-up question to AI Copilot")
async def chat_follow_up(
    incident_id: str,
    req: ChatMessageRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    check_rate_limit(request, "chat_follow_up", settings.RATE_LIMIT_CHAT_PER_MINUTE)
    svc = ChatService(db)
    return await svc.handle_user_message(incident_id, req.message)
