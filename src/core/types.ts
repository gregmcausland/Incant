import type { ZodSchema } from 'zod';

export type LLMMessage = {
  role: 'user' | 'model' | 'tool';
  content: string;
};

export interface LLM {
  generate(messages: LLMMessage[]): Promise<string>;
}

export type MemoryEntry = {
  input: string;
  output: string;
};

export interface Memory {
  load(): Promise<LLMMessage[]>;
  save(entry: MemoryEntry): Promise<void>;
}

export type ToolHandler = (args: any) => Promise<any>;

export type ToolDefinition = {
  name: string;
  description: string;
  schema: ZodSchema<any>;
  handler: ToolHandler;
};

export type AgentConfig = {
  llm: LLM;
  memory?: Memory;
  tools?: string[];
};

export type AgentState = {
  config: AgentConfig;
}; 