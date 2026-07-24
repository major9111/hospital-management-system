import os
import httpx

# Which provider answers the non-urgent intake conversation. Swap by
# changing one env var — nothing else in this service needs to change.
# Groq, DeepSeek, and Gemini all have meaningfully-sized free tiers, unlike
# Anthropic's API which is pay-as-you-go from the first request — hence
# defaulting to Groq here rather than keeping Anthropic as the default.
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "groq")  # 'groq' | 'deepseek' | 'gemini' | 'anthropic'

# The system prompt is the main safety control for this service, alongside
# the keyword-based urgent-escalation check in receptionist.py. Both layers
# matter: keywords catch clear emergencies instantly without waiting on a
# model call; the system prompt constrains everything else the model says.
# Provider-agnostic — every backend below receives exactly this text.
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

    if LLM_PROVIDER == "groq":
        return await _openai_compatible_reply(
            base_url="https://api.groq.com/openai/v1/chat/completions",
            api_key=os.environ["GROQ_API_KEY"],
            model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=messages,
        )
    if LLM_PROVIDER == "deepseek":
        return await _openai_compatible_reply(
            base_url="https://api.deepseek.com/chat/completions",
            api_key=os.environ["DEEPSEEK_API_KEY"],
            model=os.environ.get("DEEPSEEK_MODEL", "deepseek-chat"),
            messages=messages,
        )
    if LLM_PROVIDER == "gemini":
        return await _gemini_reply(messages)
    if LLM_PROVIDER == "anthropic":
        return await _anthropic_reply(messages)

    raise ValueError(f"Unknown LLM_PROVIDER: {LLM_PROVIDER!r} (expected groq/deepseek/gemini/anthropic)")


async def _openai_compatible_reply(base_url: str, api_key: str, model: str, messages: list[dict]) -> str:
    # Groq and DeepSeek both speak the OpenAI chat-completions format, so
    # one function serves both — only the URL/key/model differ.
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            base_url,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [{"role": "system", "content": SYSTEM_PROMPT}, *messages],
                "max_tokens": 300,
            },
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]


async def _gemini_reply(messages: list[dict]) -> str:
    # Gemini's format differs from OpenAI's: no "system" role (a separate
    # system_instruction field instead), and "assistant" becomes "model".
    api_key = os.environ["GEMINI_API_KEY"]
    model = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
    contents = [
        {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
        for m in messages
    ]
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            params={"key": api_key},
            json={
                "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                "contents": contents,
                "generationConfig": {"maxOutputTokens": 300},
            },
        )
        response.raise_for_status()
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]


async def _anthropic_reply(messages: list[dict]) -> str:
    # Kept as an option, not the default — imported lazily so the
    # `anthropic` package and ANTHROPIC_API_KEY are only required if this
    # branch actually runs, unlike the old module-level client that crashed
    # on import if the key was missing regardless of which provider you wanted.
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        system=SYSTEM_PROMPT,
        messages=messages,
    )
    return "".join(block.text for block in response.content if block.type == "text")
