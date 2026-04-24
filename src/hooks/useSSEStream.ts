import { supabase } from "@/integrations/supabase/client";

export interface SSEResult {
  fullText: string;
  estimatedOutputTokens: number;
}

export type OnChunkFn = (chunk: string) => void;

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sessão expirada. Faça login novamente.");
  return session.access_token;
}

export async function callSSE(
  functionName: string,
  body: Record<string, unknown>,
  onChunk?: OnChunkFn,
): Promise<SSEResult> {
  const token = await getAuthToken();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Erro ${resp.status}`);
  }

  if (!resp.body) throw new Error("Sem corpo na resposta");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") break;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullText += content;
          onChunk?.(content);
        }
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  return { fullText, estimatedOutputTokens: Math.ceil(fullText.length / 4) };
}

export function useSSEStream() {
  return { stream: callSSE };
}
