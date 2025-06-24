# 🧠 Incant

**Incant** is a lightweight, TypeScript-native wrapper for building function-callable LLM agents using **Gemini**.

It provides a minimal, functional API for creating agents that can reason, remember, and use tools to perform tasks.

---

## ✨ Features

- **Tool-based Function Calling**: Define tools with Zod schemas and let Incant handle the orchestration.
- **Modular Memory**: Ships with a simple in-memory buffer, with support for custom memory implementations.
- **Functional API**: A clean, straightforward API with no classes to instantiate for core components.
- **Decorator-based Tools**: Use the `@tool` decorator to easily and declaratively register your functions as tools.

---

## 📦 Installation

```bash
npm install incant
```
_Note: This package is not yet published to NPM._

---

## 🚀 Usage

Here's a complete example of how to define a tool, create an agent, and run it.

```typescript
import { createAgent, runAgent, tool, GeminiWrapper } from 'incant';
import { z } from 'zod';

// 1. Define a tool with the @tool decorator
// The schema is defined with Zod for validation and description.
const calculatorSchema = z.object({
  expression: z.string().describe('The mathematical expression to evaluate.'),
});

@tool({
  name: 'calculator',
  description: 'Performs math evaluation.',
  schema: calculatorSchema,
})
async function calculator({ expression }: { expression: string }) {
  // WARNING: Using eval() is insecure in a real-world application.
  // This is for demonstration purposes only.
  try {
    return eval(expression).toString();
  } catch (e) {
    return 'Invalid expression';
  }
}

// 2. Configure the LLM
// Make sure to set your GOOGLE_API_KEY in your environment variables.
const llm = new GeminiWrapper(process.env.GOOGLE_API_KEY!);

// 3. Create an agent, referencing the tools it should have access to
const agent = createAgent({
  llm,
  tools: ['calculator'],
});

// 4. Run the agent
async function main() {
  const prompt = 'What is (5 + 5) * 10?';
  console.log(`[User]: ${prompt}`);

  const response = await runAgent(agent, prompt);
  console.log(`[Agent]: ${response}`);
}

main();
```

---

## 📚 API Reference

### Core Functions

- `createAgent(config: AgentConfig): AgentState`
- `runAgent(agent: AgentState, input: string): Promise<string>`

### LLM Wrapper

- `GeminiWrapper`: A class that wraps the Google Gemini API.

### Tool Creation

- `@tool(meta: ToolMeta)`: A decorator to register a function as a tool.

### Memory

- `createBufferMemory(): Memory`: Creates a simple in-memory message buffer.

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details. 