# Task: Implement schema.ts

## Goal
Convert Zod schemas into JSON Schema for Gemini.

## File
`src/utils/schema.ts`

## Responsibilities
- Wrap zod-to-json-schema
- Export `zodToGeminiSchema(schema: ZodSchema): JSONSchemaObject`
- Strip/ignore non-Gemini metadata like $schema
