import {
  AgentConfig,
  AgentState,
  LLMMessage,
  Memory,
  // ToolDefinition, // No longer used directly
} from './types';
import { getToolByName } from '../tools/toolRegistry';
import { parseToolCall } from '../utils/toolParser';

export function createAgent(config: AgentConfig): AgentState {
  return { config };
}

export async function runAgent(
  agent: AgentState,
  input: string,
): Promise<string> {
  const { llm, memory } = agent.config;

  const messages: LLMMessage[] = [];

  if (memory) {
    const memoryMessages = await memory.load();
    messages.push(...memoryMessages);
  }

  messages.push({ role: 'user', content: input });

  // Let's create a loop to handle potential tool calls
  let done = false;
  let response = '';

  while (!done) {
    const rawResponse = await llm.generate(messages);
    const toolCall = parseToolCall(rawResponse);

    if (toolCall) {
      messages.push({ role: 'model', content: rawResponse });
      const tool = getToolByName(toolCall.name);

      if (tool) {
        // Here we would validate args against tool.schema, but for now, we just execute
        const toolResult = await tool.handler(toolCall.args);
        messages.push({ role: 'tool', content: JSON.stringify(toolResult) });
      } else {
        // Handle tool not found
        messages.push({
          role: 'tool',
          content: `Error: Tool '${toolCall.name}' not found.`,
        });
      }
    } else {
      response = rawResponse;
      done = true;
      // Save to memory only when we have a final response
      if (memory) {
        await memory.save({ input, output: response });
      }
    }
  }

  /*
  if (memory) {
    await memory.save({ input, output: response });
  }
  */

  return response;
} 