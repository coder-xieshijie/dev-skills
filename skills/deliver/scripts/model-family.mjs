// Model family from a model ID, shared by run-verifier.mjs and
// check-delivery.mjs. The family comes from the model, never from the
// provider or gateway name. Returns null for an ID it cannot place, which
// both scripts treat as a failure rather than a pass.
export function familyOf(model) {
  const id = String(model ?? "").toLowerCase().split("/").pop();
  if (/^claude|^anthropic/.test(id)) return "anthropic";
  if (/^gpt|^o\d|^codex|^openai/.test(id)) return "openai";
  if (/^minimax|^abab/.test(id)) return "minimax";
  if (/^gemini/.test(id)) return "google";
  return null;
}
