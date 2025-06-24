# 🧠 Incant — Project Planning & Structure

**Incant** is a lightweight, TypeScript-native wrapper for building function-callable LLM agents using **Gemini**. It supports:

- Tool-based function calling with Zod validation
- Modular memory management (buffer or none)
- Functional API (no public classes)
- A plugin-style decorator API for tools

---

## 📁 File Structure

```
src/
├── core/
│   ├── agent.ts
│   └── types.ts
├── llm/
│   └── geminiWrapper.ts
├── memory/
│   └── bufferMemory.ts
├── tools/
│   ├── tool.ts
│   └── toolRegistry.ts
├── utils/
│   ├── toolParser.ts
│   └── schema.ts
└── index.ts
```

---

## 📄 File Responsibilities & Exports

### `core/agent.ts`

#### **Responsibilities:**

- Constructs and runs an agent
- Orchestrates input, memory, LLM, and tools
- Functional interface only (`createAgent`, `runAgent`)

#### **Exports:**

- `createAgent(config: AgentConfig): AgentState`
- `runAgent(agent: AgentState, input: string): Promise<string>`

---

### `core/types.ts`

#### **Responsibilities:**

- Shared interfaces for all core concepts

#### **Exports:**

- `LLMMessage`: `{ role: 'user' | 'assistant' | 'system'; content: string }`
- `Memory`: `{ load(): Promise<LLMMessage[]>; save(entry: MemoryEntry): Promise<void> }`
- `LLM`: `{ generate(messages: LLMMessage[]): Promise<string> }`
- `ToolDefinition`: `{ name: string; description: string; schema: ZodSchema; handler: ToolHandler }`
- `AgentConfig`: `{ llm: LLM; memory?: Memory; tools?: string[] }`

---

### `llm/geminiWrapper.ts`

#### **Responsibilities:**

- Wraps Gemini API
- Converts `LLMMessage[]` into Gemini's expected format
- Handles API calls, retries, etc.

#### **Exports:**

- `GeminiWrapper`: a class implementing `LLM`

---

### `memory/bufferMemory.ts`

#### **Responsibilities:**

- Simple memory that stores conversation as in-memory array
- Returns `LLMMessage[]` for agent context

#### **Exports:**

- `createBufferMemory(): Memory`

---

### `tools/tool.ts`

#### **Responsibilities:**

- Defines the `@tool()` decorator
- Stores tool metadata (name, description, zod schema)
- Enforces tool shape

#### **Exports:**

- `tool(config: ToolMeta): (fn: ToolHandler) => void`
- `ToolDefinition`, `ToolHandler`, `ToolMeta` types

---

### `tools/toolRegistry.ts`

#### **Responsibilities:**

- Holds registered tools in a runtime-safe `Map`
- Validates tool presence
- Extracts only selected tools

#### **Exports:**

- `registerTool(def: ToolDefinition): void`
- `getToolByName(name: string): ToolDefinition | undefined`
- `getToolMap(toolIds: string[]): Record<string, ToolDefinition>`

---

### `utils/toolParser.ts`

#### **Responsibilities:**

- Parses raw LLM output to detect tool usage
- Matches patterns like `call:toolName(args)`

#### **Exports:**

- `parseToolCall(text: string): { name: string; args: string } | null`

---

### `utils/schema.ts`

#### **Responsibilities:**

- Converts `zod` schemas to JSON Schema for Gemini tool registration

#### **Exports:**

- `zodToGeminiSchema(schema: ZodSchema): JSONSchemaObject`

---

### `index.ts`

#### **Responsibilities:**

- Public-facing API export surface

#### **Exports:**

- `createAgent`, `runAgent`
- `GeminiWrapper`
- `createBufferMemory`
- `tool` decorator

---

## 📉 Component Design Overview

### ✅ Agent

```ts
const agent = createAgent({ llm, memory, tools: ['calculator'] });
const response = await runAgent(agent, "What is 2 + 2?");
```

### ✅ Tool Definition

```ts
@tool({
  name: "calculator",
  description: "Performs math evaluation.",
  schema: z.object({ expression: z.string() })
})
async function calculator({ expression }) {
  return eval(expression).toString();
}
```

---

## ✅ Next Taskable Units

You can now break implementation into tasks such as:

1. `agent.ts`: implement `createAgent()` and `runAgent()`
2. `tool.ts`: implement `@tool` decorator and types
3. `toolRegistry.ts`: build internal tool map + lookups
4. `geminiWrapper.ts`: format `LLMMessage[]` into Gemini message parts
5. `toolParser.ts`: write parser to detect `call:toolName(args)`
6. `schema.ts`: wrap `zod-to-json-schema` converter
7. `bufferMemory.ts`: implement load/save memory
8. `index.ts`: wire up clean exports

