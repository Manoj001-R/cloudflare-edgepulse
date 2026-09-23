"""SQLAlchemy ORM models for EdgePulse incidents, steps, tools, and analysis."""
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.db.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), unique=True, index=True, nullable=False)
    url = Column(String(2048), nullable=False)
    problem_description = Column(Text, nullable=False)
    incident_type = Column(String(32), default="unknown", nullable=False)
    severity = Column(String(32), default="medium", nullable=False)
    status = Column(String(32), default="created", nullable=False)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    steps = relationship("InvestigationStep", back_populates="incident", cascade="all, delete-orphan", order_by="InvestigationStep.step_number")
    results = relationship("ToolResult", back_populates="incident", cascade="all, delete-orphan", order_by="ToolResult.created_at")
    analysis = relationship("Analysis", back_populates="incident", uselist=False, cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="incident", cascade="all, delete-orphan", order_by="Message.created_at")


class InvestigationStep(Base):
    __tablename__ = "investigation_steps"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.incident_id", ondelete="CASCADE"), index=True, nullable=False)
    step_number = Column(Integer, nullable=False)
    tool_name = Column(String(64), nullable=False)
    status = Column(String(32), default="pending", nullable=False)  # pending, running, completed, failed
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Float, nullable=True)
    error = Column(Text, nullable=True)
    result_summary = Column(Text, nullable=True)

    incident = relationship("Incident", back_populates="steps")


class ToolResult(Base):
    __tablename__ = "tool_results"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.incident_id", ondelete="CASCADE"), index=True, nullable=False)
    tool_name = Column(String(64), nullable=False)
    success = Column(Boolean, default=True, nullable=False)
    result_json = Column(Text, nullable=False)  # JSON-serialized payload
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    incident = relationship("Incident", back_populates="results")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.incident_id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    root_cause = Column(Text, nullable=False)
    summary = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)
    evidence_json = Column(Text, nullable=False)  # List of strings JSON
    recommendations_json = Column(Text, nullable=False)  # List of strings JSON
    limitations_json = Column(Text, nullable=False)  # List of strings JSON
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    incident = relationship("Incident", back_populates="analysis")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.incident_id", ondelete="CASCADE"), index=True, nullable=False)
    role = Column(String(16), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    incident = relationship("Incident", back_populates="messages")
