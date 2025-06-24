import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { tool } from './tool';
import { getToolByName, getToolMap, registerTool } from './toolRegistry';
import type { ToolDefinition } from '../core/types';

vi.mock('./toolRegistry', () => ({
  registerTool: vi.fn(),
  getToolByName: vi.fn(),
  getToolMap: vi.fn(),
}));

const mockedRegisterTool = vi.mocked(registerTool);
const mockedGetToolByName = vi.mocked(getToolByName);
const mockedGetToolMap = vi.mocked(getToolMap);

const calculatorSchema = z.object({
  expression: z.string().describe('The mathematical expression to evaluate.'),
});

const calculatorTool = tool({
  name: 'calculator',
  description: 'Evaluates a mathematical expression.',
  schema: calculatorSchema,
});

async function calculatorHandler(args: { expression: string }) {
  return eval(args.expression);
}

describe('@tool decorator and toolRegistry', () => {
  let registry: Map<string, ToolDefinition>;

  beforeEach(() => {
    registry = new Map<string, ToolDefinition>();
    vi.clearAllMocks();

    mockedRegisterTool.mockImplementation((def: ToolDefinition) => {
      registry.set(def.name, def);
    });

    mockedGetToolByName.mockImplementation((name: string) => {
      return registry.get(name);
    });

    mockedGetToolMap.mockImplementation((toolIds: string[]) => {
      const map: Record<string, ToolDefinition> = {};
      toolIds.forEach(id => {
        if (registry.has(id)) {
          map[id] = registry.get(id)!;
        }
      });
      return map;
    });
  });

  it('should register a tool using the @tool decorator', () => {
    calculatorTool(calculatorHandler);
    expect(mockedRegisterTool).toHaveBeenCalledOnce();
    const registeredTool = getToolByName('calculator');
    expect(registeredTool?.name).toBe('calculator');
  });

  it('getToolByName should return undefined for a non-existent tool', () => {
    expect(getToolByName('nonExistentTool')).toBeUndefined();
    expect(mockedGetToolByName).toHaveBeenCalledWith('nonExistentTool');
  });

  it('getToolMap should return a map of requested tools', () => {
    calculatorTool(calculatorHandler);
    const weatherTool = tool({
      name: 'weather',
      description: 'Gets the weather.',
      schema: z.object({ city: z.string() }),
    });
    weatherTool(async () => 'Sunny');

    const toolMap = getToolMap(['calculator', 'weather']);
    expect(mockedGetToolMap).toHaveBeenCalledWith(['calculator', 'weather']);
    expect(Object.keys(toolMap)).toHaveLength(2);
    expect(toolMap['calculator'].name).toBe('calculator');
  });

  it('getToolMap should handle requests for non-existent tools gracefully', () => {
    calculatorTool(calculatorHandler);
    const toolMap = getToolMap(['calculator', 'nonExistent']);
    expect(Object.keys(toolMap)).toHaveLength(1);
    expect(toolMap['calculator']).toBeDefined();
  });
}); 