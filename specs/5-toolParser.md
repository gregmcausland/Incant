# Task: Implement toolParser.ts

## Goal
Detect when a tool call is made in the LLM response.

## File
`src/utils/toolParser.ts`

## Responsibilities
- Implement `parseToolCall(text: string): { name: string, args: string } | null`
- Use regex to detect the format: `call:toolName(args)`
- Be robust to multiline or spaced input
