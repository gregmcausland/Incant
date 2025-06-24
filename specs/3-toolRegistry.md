# Task: Implement toolRegistry.ts

## Goal
Create a global tool registry to store and retrieve tools.

## File
`src/tools/toolRegistry.ts`

## Responsibilities
- Implement `registerTool(def: ToolDefinition): void`
- Implement `getToolByName(name: string): ToolDefinition | undefined`
- Implement `getToolMap(toolIds: string[]): Record<string, ToolDefinition>`
- Use an internal `Map<string, ToolDefinition>`
