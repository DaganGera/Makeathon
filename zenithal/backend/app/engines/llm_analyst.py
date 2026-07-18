"""
Zenithal — AI Analyst (Groq LLM incident reports).

Turns a scored detection into a short SOC-analyst incident report + one
recommended action, the way a human tier-1 analyst would write it up in a
ticket. This is presentation/explainability sugar on top of the existing
deterministic engines — it never influences a verdict or score.

Optional: if GROQ_API_KEY is not configured, or the call fails/times out,
falls back to a rule-based report built from the same `reasons` the
explainability layer already produced. The feature therefore never blocks
and never breaks the demo, online or offline.
"""

import httpx

from app import config

_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

_SYSTEM_PROMPT = (
    "You are a senior SOC (Security Operations Center) analyst at Zenithal, a "
    "URL threat intelligence platform. Given a structured detection record, "
    "write a concise incident report a human analyst would file: what happened, "
    "why it was flagged (cite the concrete signals given, don't invent new ones), "
    "how severe it is, and one recommended action. 4-6 sentences, plain text, "
    "no markdown headers or bullet lists — a short paragraph a colleague would "
    "read in a ticket or Slack message."
)


def _build_prompt(detection: dict) -> str:
    lines = [
        f"Verdict: {detection.get('verdict', 'UNKNOWN')} (score {detection.get('score', '?')}/100)",
        f"Channel: {detection.get('channel', 'unknown')}",
        f"Target: {detection.get('input') or detection.get('ip') or detection.get('target', '')}",
        f"Threat type: {detection.get('threat_type') or detection.get('attack_types') or 'n/a'}",
    ]
    intel = detection.get("ip_intel") or detection.get("intel") or {}
    if intel:
        lines.append(
            f"Source infrastructure: {intel.get('org', 'unknown')} in "
            f"{intel.get('country', 'unknown')} ({intel.get('hosting_type', 'unknown')} hosting, "
            f"reputation={intel.get('reputation', 'unknown')})"
        )
    reasons = detection.get("reasons") or []
    if reasons:
        lines.append("Detected signals:\n" + "\n".join(f"- {r}" for r in reasons[:8]))
    anomaly = detection.get("anomaly_score")
    if anomaly is not None:
        lines.append(f"Behavioral anomaly score: {anomaly}/100 (self-learning baseline, not signature-based)")
    return "\n".join(lines)


def _fallback_report(detection: dict) -> dict:
    reasons = detection.get("reasons") or []
    verdict = detection.get("verdict", "UNKNOWN")
    target = detection.get("input") or detection.get("ip") or "this target"
    lead = {
        "MALICIOUS": f"Confirmed threat on {target}.",
        "SUSPICIOUS": f"{target} shows suspicious indicators and warrants review.",
        "SAFE": f"{target} was scanned and no threat was found.",
    }.get(verdict, f"{target} was scanned.")
    body = " ".join(reasons[:4]) if reasons else "No further detail available."
    action = {
        "MALICIOUS": "Recommended action: block at the perimeter and add to the local blocklist immediately.",
        "SUSPICIOUS": "Recommended action: monitor and re-scan; escalate if further activity is seen from this source.",
        "SAFE": "Recommended action: none required — continue normal monitoring.",
    }.get(verdict, "Recommended action: continue monitoring.")
    return {"report": f"{lead} {body} {action}", "source": "fallback"}


async def generate_report(detection: dict) -> dict:
    """Best-effort Groq incident report; always returns a usable report."""
    if not config.GROQ_API_KEY:
        return _fallback_report(detection)

    prompt = _build_prompt(detection)
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.post(
                _GROQ_URL,
                headers={"Authorization": f"Bearer {config.GROQ_API_KEY}"},
                json={
                    "model": config.GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.4,
                    "max_tokens": 300,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = data["choices"][0]["message"]["content"].strip()
            if not text:
                return _fallback_report(detection)
            return {"report": text, "source": "groq", "model": config.GROQ_MODEL}
    except Exception:
        return _fallback_report(detection)
