# Task: Implement tool.ts

## Goal
Define the @tool decorator and core types for tools.

## File
`src/tools/tool.ts`

## Responsibilities
- Export `@tool(config: ToolMeta): (fn: ToolHandler) => void`
- Define `ToolDefinition`, `ToolHandler`, and `ToolMeta` types
- Ensure the decorator registers tool metadata with the tool registry
