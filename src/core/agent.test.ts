import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { createAgent, runAgent } from './agent';
import type { LLM, LLMMessage, Memory, ToolDefinition } from './types';
import { tool } from '../tools/tool';
import { getToolByName, registerTool } from '../tools/toolRegistry';

// --- Mocks and Stubs ---

vi.mock('../tools/toolRegistry', () => ({
  registerTool: vi.fn(),
  getToolByName: vi.fn(),
}));

const mockedRegisterTool = vi.mocked(registerTool);
const mockedGetToolByName = vi.mocked(getToolByName);

// A mock LLM that returns canned responses
class MockLLM implements LLM {
  private responses: string[];
  public history: LLMMessage[][] = [];

  constructor(responses: string[]) {
    this.responses = responses;
  }

  async generate(messages: LLMMessage[]): Promise<string> {
    this.history.push([...messages]); // Store a snapshot of the messages
    return this.responses.shift() || 'No more responses.';
  }
}

// A mock Memory implementation
function createMockMemory(initialMessages: LLMMessage[] = []): Memory {
  let messages: LLMMessage[] = [...initialMessages];
  return {
    load: async () => [...messages],
    save: async ({ input, output }) => {
      messages.push({ role: 'user', content: input });
      messages.push({ role: 'model', content: output });
    },
  };
}

// Define and register a sample tool for testing
const calculatorSchema = z.object({
  expression: z.string(),
});

describe('Agent Core', () => {
  let toolRegistry: Map<string, ToolDefinition>;

  beforeEach(() => {
    toolRegistry = new Map<string, ToolDefinition>();
    vi.clearAllMocks();

    mockedRegisterTool.mockImplementation((def: ToolDefinition) => {
      toolRegistry.set(def.name, def);
    });
    mockedGetToolByName.mockImplementation((name: string) => {
      return toolRegistry.get(name);
    });

    // Register the calculator tool for each test
    tool({
      name: 'calculator',
      description: 'Calculates a math expression.',
      schema: calculatorSchema,
    })(async ({ expression }: { expression: string }) => {
      return eval(expression).toString();
    });
  });

  it('should run a simple query without tools or memory', async () => {
    const llm = new MockLLM(['The answer is 4.']);
    const agent = createAgent({ llm });

    const result = await runAgent(agent, 'What is 2 + 2?');

    expect(result).toBe('The answer is 4.');
    expect(llm.history).toHaveLength(1);
    expect(llm.history[0].slice(-1)[0]).toEqual({
      role: 'user',
      content: 'What is 2 + 2?',
    });
  });

  it('should use memory to load and save conversation history', async () => {
    const llm = new MockLLM(['It is a beautiful day.']);
    const memory = createMockMemory([
      { role: 'user', content: 'Hello' },
      { role: 'model', content: 'Hi there!' },
    ]);
    const agent = createAgent({ llm, memory });

    await runAgent(agent, 'How is the weather?');

    const finalHistory = await memory.load();
    expect(llm.history[0][0]).toEqual({ role: 'user', content: 'Hello' });
    expect(finalHistory).toHaveLength(4);
    expect(finalHistory.slice(-1)[0]).toEqual({
      role: 'model',
      content: 'It is a beautiful day.',
    });
  });

  it('should execute a tool call and return the result', async () => {
    const llm = new MockLLM([
      'call:calculator({"expression":"2*3"})',
      'The result is 6.',
    ]);
    const agent = createAgent({ llm, tools: ['calculator'] });

    const result = await runAgent(agent, 'What is two times three?');

    expect(result).toBe('The result is 6.');
    expect(llm.history).toHaveLength(2);

    // Check that the tool result was passed back to the LLM
    const finalLLMCallMessages = llm.history[1];
    expect(finalLLMCallMessages.slice(-1)[0]).toEqual({
      role: 'tool',
      content: '"6"',
    });
  });

  it('should handle tool not found gracefully', async () => {
    const llm = new MockLLM([
      'call:nonExistentTool({"arg":"value"})',
      "I am sorry, I cannot find that tool.",
    ]);
    const agent = createAgent({ llm, tools: ['calculator'] });

    const result = await runAgent(agent, 'Use the missing tool.');

    expect(result).toBe('I am sorry, I cannot find that tool.');
    const finalLLMCallMessages = llm.history[1];
    expect(finalLLMCallMessages.slice(-1)[0]).toEqual({
      role: 'tool',
      content: "Error: Tool 'nonExistentTool' not found.",
    });
  });
}); 