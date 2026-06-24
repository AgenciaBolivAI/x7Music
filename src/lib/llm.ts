/**
 * LLM client — the single interface every AI call in X7 goes through.
 * Provider-agnostic over the OpenAI-compatible REST surface (`/chat/completions`
 * + `/embeddings`), which is the same "BolivAI brain" pattern used across the
 * main BolivAI platform. Self-hosting / swapping providers is a CONFIG FLIP:
 * point LLM_CHAT_* at any OpenAI-compatible endpoint (OpenAI, Azure, Ollama,
 * vLLM, …). No feature imports a vendor SDK directly — everything calls
 * `chatCompletion` / `embed` here.
 *
 * Chat and embeddings are configured separately on purpose: the embedding model
 * is dimension-locked to whatever brain vectors were ingested with, so you can
 * swap the chat model freely while keeping embeddings stable.
 */

type Endpoint = { baseUrl: string; model: string; apiKey: string };

function chatEndpoint(): Endpoint {
  return {
    baseUrl: (process.env.LLM_CHAT_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.LLM_CHAT_MODEL ?? 'gpt-4o-mini',
    apiKey: process.env.LLM_CHAT_API_KEY ?? process.env.OPENAI_API_KEY ?? '',
  };
}

function embedEndpoint(): Endpoint {
  return {
    baseUrl: (process.env.LLM_EMBED_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.LLM_EMBED_MODEL ?? 'text-embedding-3-small',
    apiKey: process.env.LLM_EMBED_API_KEY ?? process.env.OPENAI_API_KEY ?? '',
  };
}

export function llmConfigured(): boolean {
  return !!chatEndpoint().apiKey;
}

// ─── Chat types (OpenAI-compatible) ──────────────────────────────────────────
export type LlmRole = 'system' | 'user' | 'assistant' | 'tool';
export type LlmToolCall = {
  id: string;
  type?: 'function';
  function: { name: string; arguments: string };
};
export type LlmMessage = {
  role: LlmRole;
  content?: string | null;
  tool_calls?: LlmToolCall[];
  tool_call_id?: string;
  name?: string;
};
export type LlmTool = {
  type: 'function';
  function: { name: string; description?: string; parameters: Record<string, unknown> };
};

export type ChatCompletionResult =
  | { ok: true; message: LlmMessage }
  | { ok: false; error: string };

/** One chat completion (optionally with tools). Errors are returned, not thrown. */
export async function chatCompletion(opts: {
  messages: LlmMessage[];
  tools?: LlmTool[];
  toolChoice?: 'auto' | 'none' | 'required';
  temperature?: number;
  maxTokens?: number;
  model?: string;
  timeoutMs?: number;
}): Promise<ChatCompletionResult> {
  const cfg = chatEndpoint();
  if (!cfg.apiKey) {
    return { ok: false, error: 'AI is not configured (set LLM_CHAT_API_KEY / OPENAI_API_KEY).' };
  }

  const body: Record<string, unknown> = {
    model: opts.model ?? cfg.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.3,
  };
  if (opts.tools?.length) {
    body.tools = opts.tools;
    body.tool_choice = opts.toolChoice ?? 'auto';
  }
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'AI service unreachable' };
  }
  if (!res.ok) {
    return { ok: false, error: `AI ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  const json = (await res.json()) as { choices?: { message?: LlmMessage }[] };
  const message = json.choices?.[0]?.message;
  if (!message) return { ok: false, error: 'Empty response from the model' };
  return { ok: true, message };
}

// ─── Embeddings ──────────────────────────────────────────────────────────────
export async function embed(
  input: string | string[],
  opts?: { model?: string; timeoutMs?: number }
): Promise<number[][]> {
  const cfg = embedEndpoint();
  if (!cfg.apiKey) throw new Error('Embeddings not configured (LLM_EMBED_API_KEY / OPENAI_API_KEY).');
  const res = await fetch(`${cfg.baseUrl}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: opts?.model ?? cfg.model, input }),
    signal: AbortSignal.timeout(opts?.timeoutMs ?? 15_000),
  });
  if (!res.ok) throw new Error(`Embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { data?: { embedding: number[] }[] };
  return (json.data ?? []).map((d) => d.embedding);
}

export async function embedOne(text: string, opts?: { model?: string; timeoutMs?: number }): Promise<number[]> {
  const [vec] = await embed(text, opts);
  if (!vec) throw new Error('The model returned no embedding');
  return vec;
}

// ─── Live web search ─────────────────────────────────────────────────────────
export interface WebSource { title: string; url: string }
export type WebSearchResult = { ok: true; text: string; sources: WebSource[] } | { ok: false; error: string };

/**
 * Live web search via OpenAI's web-search-capable chat model (default
 * `gpt-4o-mini-search-preview`, override with LLM_SEARCH_MODEL). Uses the same
 * chat endpoint/key — no extra vendor. Search-preview models reject `temperature`
 * and `tools`, so this is a dedicated call rather than `chatCompletion`. Returns a
 * grounded summary plus the cited source URLs.
 */
export async function webSearch(query: string, opts?: { timeoutMs?: number }): Promise<WebSearchResult> {
  const cfg = chatEndpoint();
  if (!cfg.apiKey) return { ok: false, error: 'AI is not configured (set OPENAI_API_KEY).' };
  const model = process.env.LLM_SEARCH_MODEL ?? 'gpt-4o-mini-search-preview';

  const body = {
    model,
    web_search_options: {},
    messages: [
      { role: 'system', content: 'You are a research assistant. Search the web for CURRENT, factual information and summarize the key points with their dates. Ground every claim in real sources; if you are unsure, say so. Do not fabricate events.' },
      { role: 'user', content: query },
    ],
  };

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts?.timeoutMs ?? 60_000),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Web search service unreachable' };
  }
  if (!res.ok) return { ok: false, error: `Web search ${res.status}: ${(await res.text()).slice(0, 200)}` };

  const json = (await res.json()) as {
    choices?: { message?: { content?: string; annotations?: { url_citation?: { url: string; title?: string } }[] } }[];
  };
  const msg = json.choices?.[0]?.message;
  const text = (msg?.content ?? '').trim();
  if (!text) return { ok: false, error: 'No results returned.' };

  const seen = new Set<string>();
  const sources: WebSource[] = [];
  for (const a of msg?.annotations ?? []) {
    const u = a.url_citation?.url;
    if (u && !seen.has(u)) { seen.add(u); sources.push({ url: u, title: a.url_citation?.title || u }); }
  }
  return { ok: true, text, sources };
}
