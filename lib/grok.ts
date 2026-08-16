const MODEL = "grok-4.6";
const BASE = "https://api.x.ai/v1";
const TIMEOUT_MS = 55_000;
const SEARCH_TIMEOUT_MS = 90_000;

function key(): string {
  const k = process.env.XAI_API_KEY;
  if (!k) throw new Error("XAI_API_KEY missing");
  return k;
}

function stripFence(text: string): string {
  const t = text.trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : t).trim();
}

async function withTimeout(
  input: RequestInfo,
  init: RequestInit,
  timeoutMs = TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function grokChat(prompt: string, timeoutMs = TIMEOUT_MS): Promise<string> {
  const res = await withTimeout(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      reasoning_effort: "low",
      messages: [
        {
          role: "system",
          content:
            "Return strict JSON only. No markdown. No commentary.",
        },
        { role: "user", content: prompt },
      ],
    }),
  }, timeoutMs);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`grok chat ${res.status}: ${body.slice(0, 240)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("grok chat empty");
  return stripFence(content);
}

function readGrokOutput(json: {
  output_text?: string;
  output?: {
    type?: string;
    content?: { type?: string; text?: string }[] | string;
  }[];
}): string {
  if (json.output_text) return stripFence(json.output_text);
  const texts: string[] = [];
  for (const item of json.output ?? []) {
    if (typeof item.content === "string") texts.push(item.content);
    for (const c of Array.isArray(item.content) ? item.content : []) {
      if (c.text) texts.push(c.text);
    }
  }
  if (!texts.length) {
    const types = (json.output ?? []).map((i) => i.type).join(",");
    throw new Error(`grok search empty (${types || "no output"})`);
  }
  return stripFence(texts.join("\n"));
}

/** Live X search. Agentic x_search often needs ~45–55s. If it dies, X degrades. */
export async function grokSearch(prompt: string, timeoutMs = SEARCH_TIMEOUT_MS): Promise<string> {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const res = await withTimeout(
    `${BASE}/responses`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key()}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: [{ role: "user", content: prompt }],
        reasoning: { effort: "low" },
        tools: [
          {
            type: "x_search",
            from_date: yesterday,
          },
        ],
      }),
    },
    timeoutMs,
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`grok search ${res.status}: ${body.slice(0, 240)}`);
  }
  return readGrokOutput((await res.json()) as Parameters<typeof readGrokOutput>[0]);
}

/**
 * Deep research pass: web_search + x_search. Used by the Research desk.
 * Never invent claims — prompt must require citations from tool results only.
 */
export async function grokDeepResearch(
  prompt: string,
  timeoutMs = SEARCH_TIMEOUT_MS,
): Promise<string> {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const res = await withTimeout(
    `${BASE}/responses`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key()}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: [{ role: "user", content: prompt }],
        reasoning: { effort: "high" },
        tools: [
          { type: "web_search" },
          { type: "x_search", from_date: yesterday },
        ],
      }),
    },
    timeoutMs,
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`grok deep research ${res.status}: ${body.slice(0, 240)}`);
  }
  return readGrokOutput((await res.json()) as Parameters<typeof readGrokOutput>[0]);
}

export async function grokJson<T>(
  prompt: string,
  parse: (raw: string) => T,
  search = false,
): Promise<T> {
  const raw = await (search ? grokSearch : grokChat)(prompt);
  try {
    return parse(raw);
  } catch (first) {
    const err = first instanceof Error ? first.message : String(first);
    return parse(
      await grokChat(
        `${prompt}\n\nRaw model output:\n${raw.slice(0, 4000)}\n\nYour previous answer failed validation: ${err}. Return strict JSON only.`,
      ),
    );
  }
}
