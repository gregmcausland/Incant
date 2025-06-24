import { ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// A basic type for a JSON Schema object.
// This can be expanded if more specific properties are needed.
export type JSONSchemaObject = Record<string, any>;

/**
 * Converts a Zod schema to a JSON schema object compatible with Gemini.
 * It removes the top-level "$schema" property added by the converter.
 *
 * @param schema The Zod schema to convert.
 * @returns A JSON schema object.
 */
export function zodToGeminiSchema(schema: ZodSchema<any>): JSONSchemaObject {
  const { $schema, ...jsonSchema } = zodToJsonSchema(schema);
  return jsonSchema;
} 