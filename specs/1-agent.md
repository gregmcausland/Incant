# Task: Implement agent.ts

## Goal
Create the core functions to run an agent from user input.

## File
`src/core/agent.ts`

## Responsibilities
- Implement `createAgent(config: AgentConfig): AgentState`
- Implement `runAgent(agent: AgentState, input: string): Promise<string>`
- Compose memory, LLM, and tools
- Route tool calls when detected
- Handle cases where memory is optional
