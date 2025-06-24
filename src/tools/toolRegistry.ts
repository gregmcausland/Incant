import { ToolDefinition } from '../core/types';

const tools = new Map<string, ToolDefinition>();

export function registerTool(def: ToolDefinition): void {
  tools.set(def.name, def);
}

export function getToolByName(name: string): ToolDefinition | undefined {
  return tools.get(name);
}

export function getToolMap(
  toolIds: string[],
): Record<string, ToolDefinition> {
  const toolMap: Record<string, ToolDefinition> = {};
  for (const id of toolIds) {
    const tool = getToolByName(id);
    if (tool) {
      toolMap[id] = tool;
    }
  }
  return toolMap;
} 