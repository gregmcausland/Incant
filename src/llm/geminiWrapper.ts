import {
  GoogleGenerativeAI,
  Content,
  Part,
  FunctionDeclaration,
  FunctionCallingMode,
  FunctionDeclarationSchema,
  // Role, // Not an exported type
} from '@google/generative-ai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import type { LLM, LLMMessage, LLMToolCall, ToolDefinition } from '../core/types';

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
  const newMessages: Content[] = [];
  for (const message of messages) {
    if (message.role === 'user') {
      newMessages.push({
        role: 'user',
        parts: [{ text: message.content ?? '' }],
      });
    } else if (message.role === 'model' && message.toolCall) {
      newMessages.push({
        role: 'model',
        parts: [{ functionCall: message.toolCall }],
      });
    } else if (message.role === 'model' && message.content) {
      newMessages.push({
        role: 'model',
        parts: [{ text: message.content }],
      });
    } else if (message.role === 'tool' && message.toolResult) {
      newMessages.push({
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: message.toolResult.call.name,
              response: { content: message.toolResult.output },
            },
          },
        ],
      });
    }
  }
  return newMessages;
}

/**
 * A wrapper for the Google Gemini API that conforms to the `LLM` interface.
 */
export class GeminiWrapper implements LLM {
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;
  private readonly logPath?: string;

  constructor(apiKey: string, model = 'gemini-1.5-flash', logPath?: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
    this.logPath = logPath;
  }

  /**
   * Generates a response from the Gemini model based on the provided message history.
   * @param messages An array of `LLMMessage` to be sent to the model.
   * @param tools An optional array of `ToolDefinition` to be made available to the model.
   * @returns The text content of the model's response or a tool call object.
   */
  async generate(
    messages: LLMMessage[],
    tools?: ToolDefinition[]
  ): Promise<string | LLMToolCall> {
    if (messages.length === 0) {
      return '';
    }

    const generativeModel = this.client.getGenerativeModel({
      model: this.model,
    });

    const contents = formatMessages(messages);

    const toolDeclarations = tools?.map(
      (tool): FunctionDeclaration => {
        const jsonSchema = zodToJsonSchema(tool.schema);

        // Gemini API has a strict schema and doesn't allow these properties.
        delete (jsonSchema as any).$schema;
        delete (jsonSchema as any).additionalProperties;
        delete (jsonSchema as any).definitions; // Also remove definitions if they exist

        return {
          name: tool.name,
          description: tool.description,
          parameters: jsonSchema as FunctionDeclarationSchema,
        };
      }
    );

    const request = {
      contents,
      tools: toolDeclarations ? [{ functionDeclarations: toolDeclarations }] : undefined,
      toolConfig: toolDeclarations
        ? { functionCallingConfig: { mode: FunctionCallingMode.AUTO } }
        : undefined,
    };

    if (this.logPath) {
      try {
        await fs.mkdir(dirname(this.logPath), { recursive: true });
        const logEntry = `\n--- ${new Date().toISOString()} ---\n${JSON.stringify(
          request,
          null,
          2
        )}\n`;
        await fs.appendFile(this.logPath, logEntry);
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }

    const result = await generativeModel.generateContent(request);

    const { response } = result;
    const part = response.candidates?.[0]?.content?.parts?.[0];

    if (!part) {
      return '';
    }

    if (part.functionCall) {
      return {
        name: part.functionCall.name,
        args: part.functionCall.args,
      };
    }

    return part.text ?? '';
  }
} 