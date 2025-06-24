import type { LLMMessage, Memory, MemoryEntry } from '../core/types';

/**
 * Creates a simple in-memory buffer for storing conversation history.
 *
 * @returns A `Memory` object with `load` and `save` methods.
 */
export function createBufferMemory(): Memory {
  const messages: LLMMessage[] = [];

  return {
    /**
     * Loads the entire conversation history.
     * @returns A promise that resolves to the array of `LLMMessage`.
     */
    async load(): Promise<LLMMessage[]> {
      return [...messages];
    },

    /**
     * Saves a new user input and model output to the history.
     * @param entry An object containing the `input` and `output` strings.
     */
    async save(entry: MemoryEntry): Promise<void> {
      messages.push({ role: 'user', content: entry.input });
      messages.push({ role: 'model', content: entry.output });
    },
  };
} 