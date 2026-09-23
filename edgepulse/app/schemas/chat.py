"""Pydantic schemas for follow-up conversational assistant."""
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class ChatMessageRequest(BaseModel):
    message: str = Field(..., description="Follow-up question about the incident", json_schema_extra={"example": "Why is the website slow?"})


class MessageResponse(BaseModel):
    id: int
    incident_id: str
    role: Literal["user", "assistant", "system"]
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatMessageResponse(BaseModel):
    incident_id: str
    reply: str
    role: str = "assistant"
    created_at: datetime
