import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { createAgent, runAgent } from './agent';
import type { LLM, LLMMessage, LLMToolCall, Memory, ToolDefinition } from './types';
import { tool } from '../tools/tool';
import {
  getToolByName,
  getToolDefinitions,
  registerTool,
} from '../tools/toolRegistry';

// --- Mocks and Stubs ---

vi.mock('../tools/toolRegistry', async importOriginal => {
  const original = await importOriginal<typeof import('../tools/toolRegistry')>();
  return {
    ...original,
    registerTool: vi.fn(),
    getToolByName: vi.fn(),
    getToolDefinitions: vi.fn(),
  };
});

const mockedRegisterTool = vi.mocked(registerTool);
const mockedGetToolByName = vi.mocked(getToolByName);
const mockedGetToolDefinitions = vi.mocked(getToolDefinitions);

// A mock LLM that returns canned responses
class MockLLM implements LLM {
  private responses: (string | LLMToolCall)[];
  public history: LLMMessage[][] = [];
  public toolsSent: ToolDefinition[][] = [];

  constructor(responses: (string | LLMToolCall)[]) {
    this.responses = responses;
  }

  async generate(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
  ): Promise<string | LLMToolCall> {
    this.history.push([...messages]); // Store a snapshot of the messages
    this.toolsSent.push(tools || []);
    const response = this.responses.shift();
    if (!response) {
      throw new Error('MockLLM ran out of responses.');
    }
    return response;
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

const directToolSchema = z.object({
  data: z.string(),
});

describe('Agent Core', () => {
  let toolDefinitions: ToolDefinition[];

  beforeEach(() => {
    // Reset mocks and registry before each test
    vi.clearAllMocks();
    const toolRegistry = new Map<string, ToolDefinition>();

    mockedRegisterTool.mockImplementation((def: ToolDefinition) => {
      toolRegistry.set(def.name, def);
    });

    mockedGetToolByName.mockImplementation((name: string) => {
      return toolRegistry.get(name);
    });

    mockedGetToolDefinitions.mockImplementation((names: string[]) => {
      return names
        .map(name => toolRegistry.get(name))
        .filter((tool): tool is ToolDefinition => !!tool);
    });

    // Clear and register tools for each test
    tool({
      name: 'calculator',
      description: 'Calculates a math expression.',
      schema: calculatorSchema,
    })(async ({ expression }: { expression: string }) => eval(expression));

    tool({
      name: 'directTool',
      description: 'Returns data directly.',
      schema: directToolSchema,
      returnDirect: true,
    })(async ({ data }: { data: string }) => ({ result: data }));

    toolDefinitions = mockedGetToolDefinitions(['calculator', 'directTool']);
  });

  it('should run a simple query without tools and return a string response', async () => {
    const llm = new MockLLM(['The answer is 4.']);
    const agent = createAgent({ llm });

    const result = await runAgent(agent, 'What is 2 + 2?');

    expect(result).toBe('The answer is 4.');
    expect(llm.history).toHaveLength(1);
    expect(llm.history[0].slice(-1)[0]).toEqual({
      role: 'user',
      content: 'What is 2 + 2?',
    });
    // Ensure no tools were passed to the LLM
    expect(llm.toolsSent[0]).toEqual([]);
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

  it('should call a tool, loop the result back to the LLM, and return the final summary', async () => {
    const toolCall: LLMToolCall = {
      name: 'calculator',
      args: { expression: '2 * 3' },
    };
    const llm = new MockLLM([toolCall, 'The result is 6.']);
    const agent = createAgent({ llm, tools: ['calculator'] });

    const result = await runAgent(agent, 'What is two times three?');

    expect(result).toBe('The result is 6.');
    expect(llm.history).toHaveLength(2);
    expect(llm.toolsSent[0]).toEqual(
      mockedGetToolDefinitions(['calculator']),
    );

    const finalLLMCallMessages = llm.history[1];
    expect(finalLLMCallMessages.slice(-1)[0]).toEqual({
      role: 'tool',
      content: '6', // eval returns a number, which gets stringified
    });
  });

  it('should call a tool with returnDirect and return its result immediately', async () => {
    const toolCall: LLMToolCall = {
      name: 'directTool',
      args: { data: 'important_data' },
    };
    const llm = new MockLLM([toolCall]); // LLM is only called once
    const agent = createAgent({ llm, tools: ['directTool'] });

    const result = await runAgent(agent, 'Get the important data.');

    // The result should be the direct, stringified output of the tool
    expect(result).toBe(JSON.stringify({ result: 'important_data' }));
    // LLM should have only been called once
    expect(llm.history).toHaveLength(1);
  });

  it('should handle tool not found gracefully', async () => {
    const toolCall: LLMToolCall = {
      name: 'nonExistentTool',
      args: { arg: 'value' },
    };
    const llm = new MockLLM([
      toolCall,
      'I am sorry, I cannot find that tool.',
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