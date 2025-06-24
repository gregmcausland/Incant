export function parseToolCall(
  text: string
): { name: string; args: any } | null {
  const toolCallRegex = /call:(\w+)\s*\((.*?)\)\s*$/s;
  const match = text.trim().match(toolCallRegex);

  if (match) {
    const [, name, argsString] = match;
    try {
      const args = JSON.parse(argsString);
      return { name, args };
    } catch (e) {
      console.error('Error parsing tool arguments:', e);
      return null;
    }
  }

  return null;
} 