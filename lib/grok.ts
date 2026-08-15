const MODEL = "grok-4.6";
const BASE = "https://api.x.ai/v1";
const TIMEOUT_MS = 55_000;

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

async function withTimeout(input: RequestInfo, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function grokChat(prompt: string): Promise<string> {
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
  });
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

/** Live X + news search via Agent Tools (search_parameters was retired). */
export async function grokSearch(prompt: string): Promise<string> {
  const res = await withTimeout(`${BASE}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: [{ role: "user", content: prompt }],
      tools: [{ type: "x_search" }, { type: "web_search" }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`grok search ${res.status}: ${body.slice(0, 240)}`);
  }
  const json = (await res.json()) as {
    output_text?: string;
    output?: { content?: { type?: string; text?: string }[] }[];
  };
  if (json.output_text) return stripFence(json.output_text);
  const texts: string[] = [];
  for (const item of json.output ?? []) {
    for (const c of item.content ?? []) {
      if (c.type === "output_text" && c.text) texts.push(c.text);
    }
  }
  if (!texts.length) throw new Error("grok search empty");
  return stripFence(texts.join("\n"));
}

export async function grokJson<T>(
  prompt: string,
  parse: (raw: string) => T,
  search = false,
): Promise<T> {
  const run = search ? grokSearch : grokChat;
  try {
    return parse(await run(prompt));
  } catch (first) {
    const name = first instanceof Error ? first.name : "";
    if (name === "AbortError" || name === "TimeoutError") throw first;
    const err = first instanceof Error ? first.message : String(first);
    return parse(
      await run(
        `${prompt}\n\nYour previous answer failed validation: ${err}. Return strict JSON only.`,
      ),
    );
  }
}
