import {
  AgentConfig,
  AgentState,
  LLMMessage,
  LLMToolCall,
  Memory,
  // ToolDefinition, // No longer used directly
} from './types';
import { getToolByName, getToolDefinitions } from '../tools/toolRegistry';

export function createAgent(config: AgentConfig): AgentState {
  return { config };
}

export async function runAgent(
  agent: AgentState,
  input: string,
): Promise<string> {
  const { llm, memory, tools: toolNames } = agent.config;

  const messages: LLMMessage[] = [];

  if (memory) {
    const memoryMessages = await memory.load();
    messages.push(...memoryMessages);
  }

  messages.push({ role: 'user', content: input });

  const availableTools = toolNames ? getToolDefinitions(toolNames) : [];

  // Let's create a loop to handle potential tool calls
  let finalResponse = '';

  while (!finalResponse) {
    const response = await llm.generate(messages, availableTools);

    if (typeof response === 'string') {
      finalResponse = response;
      if (memory) {
        await memory.save({ input, output: finalResponse });
      }
    } else {
      // It's an LLMToolCall
      const toolCall = response as LLMToolCall;
      messages.push({ role: 'model', toolCall }); // Use the new structured format
      const tool = getToolByName(toolCall.name);

      if (tool) {
        const toolResult = await tool.handler(toolCall.args);
        
        if (tool.returnDirect) {
          return JSON.stringify(toolResult);
        }

        // Use the new structured format for the result
        messages.push({
          role: 'tool',
          toolResult: { call: toolCall, output: toolResult },
        });
      } else {
        // Handle tool not found, still using the structured format
        messages.push({
          role: 'tool',
          toolResult: {
            call: toolCall,
            output: `Error: Tool '${toolCall.name}' not found.`,
          },
        });
      }
    }
  }

  return finalResponse;
} 