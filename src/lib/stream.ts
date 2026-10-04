// Decode streaming UTF-8 independently of network chunk boundaries.
export async function readStream(res: Response, onMessage: (m: Record<string, unknown>) => void) {
  if (!res.body) throw new Error("Le serveur n’a renvoyé aucun flux de réponse.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const receive = (line: string) => { if (line.trim()) onMessage(JSON.parse(line)); };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) receive(line);
    }
    receive(buffer + decoder.decode());
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
