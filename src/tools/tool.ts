import type { ZodSchema } from 'zod';
import { registerTool } from './toolRegistry';
import type { ToolDefinition, ToolHandler } from '../core/types';

/**
 * Re-exporting core tool types for convenience.
 */
export type { ToolDefinition, ToolHandler };

/**
 * Metadata for a tool, excluding the handler function.
 * This is the configuration object passed to the `@tool` decorator.
 */
export type ToolMeta = {
  name: string;
  description: string;
  schema: ZodSchema<any>;
};

/**
 * A decorator factory for registering a function as a tool.
 * The decorated function must be a valid `ToolHandler`.
 *
 * @param meta The tool's metadata (name, description, schema).
 * @returns A decorator that registers the function with the tool registry.
 */
export function tool(meta: ToolMeta) {
  return (handler: ToolHandler): void => {
    registerTool({
      ...meta,
      handler,
    });
  };
} 