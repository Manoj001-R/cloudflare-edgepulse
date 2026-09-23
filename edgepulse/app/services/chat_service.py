"""Follow-up Conversational Assistant Service."""
import json
from datetime import datetime, timezone
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.repositories import (
    AnalysisRepository,
    IncidentRepository,
    MessageRepository,
    ToolResultRepository,
)
from app.schemas.chat import ChatMessageResponse, MessageResponse
from app.services.llm.factory import LLMProviderFactory
from app.utils.errors import IncidentNotFoundException


class ChatService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.llm = LLMProviderFactory.get_provider()

    async def get_messages(self, incident_id: str) -> List[MessageResponse]:
        messages = await MessageRepository.get_messages(self.session, incident_id)
        return [MessageResponse.model_validate(m) for m in messages]

    async def handle_user_message(self, incident_id: str, message_text: str) -> ChatMessageResponse:
        incident = await IncidentRepository.get_by_id(self.session, incident_id)
        if not incident:
            raise IncidentNotFoundException(incident_id)

        # Record user message in DB
        await MessageRepository.add_message(self.session, incident_id, role="user", content=message_text)

        # Retrieve incident analysis and tool results to create narrow context
        analysis = await AnalysisRepository.get_analysis(self.session, incident_id)
        results = await ToolResultRepository.get_results(self.session, incident_id)
        recent_messages = await MessageRepository.get_messages(self.session, incident_id)

        incident_summary = {
            "incident_id": incident.incident_id,
            "url": incident.url,
            "problem": incident.problem_description,
            "type": incident.incident_type,
            "severity": incident.severity,
            "status": incident.status,
            "root_cause": analysis.root_cause if analysis else None,
            "summary": analysis.summary if analysis else None,
            "confidence": analysis.confidence if analysis else None,
            "evidence": json.loads(analysis.evidence_json) if analysis else [],
            "recommendations": json.loads(analysis.recommendations_json) if analysis else [],
            "diagnostic_tools_executed": [
                {"tool": r.tool_name, "success": r.success} for r in results
            ],
        }

        history = [{"role": m.role, "content": m.content} for m in recent_messages[-6:]]

        # Query LLM
        reply_text = await self.llm.follow_up(
            incident_summary=incident_summary,
            conversation_history=history,
            question=message_text,
        )

        # Save assistant message
        saved_msg = await MessageRepository.add_message(
            self.session, incident_id, role="assistant", content=reply_text
        )

        return ChatMessageResponse(
            incident_id=incident_id,
            reply=reply_text,
            role="assistant",
            created_at=saved_msg.created_at,
        )
