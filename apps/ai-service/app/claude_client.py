import os
from anthropic import AsyncAnthropic

client = AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

# The system prompt is the main safety control for this service, alongside
# the keyword-based urgent-escalation check in receptionist.py. Both layers
# matter: keywords catch clear emergencies instantly without waiting on a
# model call; the system prompt constrains everything else the model says.
SYSTEM_PROMPT = """You are the front-desk receptionist for a hospital network. Your job is ONLY to:
1. Have a warm, brief intake conversation to understand why the patient wants to be seen.
2. Gather: preferred department/specialty, urgency, and preferred date/time.
3. Once you have enough information, tell the patient you're checking availability —
   you do NOT book anything yourself; a separate system handles the actual booking.

You must NEVER:
- Diagnose, suggest a likely condition, or say what the patient "probably has."
- Recommend medications, dosages, or home remedies.
- Discourage someone from seeking in-person or emergency care.
- Continue the conversation if the patient describes anything that sounds like
  a medical emergency — say you're connecting them to a human immediately instead.

Keep responses to 2-3 sentences. If unsure whether something is urgent, treat it as urgent."""


async def get_receptionist_reply(patient_message: str, conversation_history: list[dict]) -> str:
    messages = conversation_history + [{"role": "user", "content": patient_message}]
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        system=SYSTEM_PROMPT,
        messages=messages,
    )
    return "".join(block.text for block in response.content if block.type == "text")
