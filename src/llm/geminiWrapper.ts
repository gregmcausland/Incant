import {
  GoogleGenerativeAI,
  Content,
  // Role, // Not an exported type
} from '@google/generative-ai';
import type { LLM, LLMMessage } from '../core/types';

/**
 * Maps our internal message roles to the roles expected by the Gemini API.
 * Throws an error for unsupported roles.
 * @param role The role from an `LLMMessage`.
 * @returns The corresponding `Role` for the Gemini API.
 */
function mapRole(role: LLMMessage['role']): 'user' | 'model' | 'function' {
  switch (role) {
    case 'user':
      return 'user';
    case 'model':
      return 'model';
    case 'tool':
      return 'function';
    default:
      // This should be unreachable with the current type definition
      throw new Error(`Unsupported role: ${role}`);
  }
}

/**
 * Converts an array of our internal `LLMMessage` objects to the `Content[]`
 * format expected by the Google Generative AI API.
 * @param messages The array of `LLMMessage` to convert.
 * @returns An array of `Content` objects.
 */
function formatMessages(messages: LLMMessage[]): Content[] {
  return messages.map(message => ({
    role: mapRole(message.role),
    parts: [{ text: message.content }],
  }));
}

/**
 * A wrapper for the Google Gemini API that conforms to the `LLM` interface.
 */
export class GeminiWrapper implements LLM {
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;

  constructor(apiKey: string, model = 'gemini-pro') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  /**
   * Generates a response from the Gemini model based on the provided message history.
   * @param messages An array of `LLMMessage` to be sent to the model.
   * @returns The text content of the model's response.
   */
  async generate(messages: LLMMessage[]): Promise<string> {
    if (messages.length === 0) {
      return '';
    }

    const generativeModel = this.client.getGenerativeModel({
      model: this.model,
    });

    const history = formatMessages(messages.slice(0, -1));
    const latestMessage = messages.slice(-1)[0];
    const latestContent = formatMessages([latestMessage])[0].parts;

    const chat = generativeModel.startChat({ history });
    const result = await chat.sendMessage(latestContent);

    const response = result.response;
    return response.text();
  }
} 