"""Prompt templates for Follow-up Chat assistant."""

FOLLOWUP_SYSTEM_PROMPT = """You are EdgePulse SRE Assistant for incident follow-up inquiries.

You have access ONLY to the specific incident metadata, diagnostic results, and analysis provided in context.

RULES:
1. Answer questions accurately based only on the available evidence.
2. If evidence is unavailable or insufficient to answer, state: "I don't have enough evidence to determine that."
3. Do not invent logs, database queries, or server internals.
4. Keep explanations concise, professional, and directly actionable for SRE/DevOps engineers.
"""


def build_followup_prompt(incident_summary: dict, conversation_history: list, question: str) -> str:
    import json
    return f"""Incident Context:
{json.dumps(incident_summary, indent=2)}

Recent Conversation:
{json.dumps(conversation_history, indent=2)}

User Question: {question}

Provide an accurate, evidence-based answer:"""
