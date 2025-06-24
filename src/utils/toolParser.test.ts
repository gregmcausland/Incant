import { describe, it, expect } from 'vitest';
import { parseToolCall } from './toolParser';

describe('parseToolCall', () => {
  it('should return null if no tool call is present', () => {
    const text = 'This is a regular response.';
    expect(parseToolCall(text)).toBeNull();
  });

  it('should correctly parse a simple tool call', () => {
    const text = 'call:calculator({"expression":"2+2"})';
    const result = parseToolCall(text);
    expect(result).toEqual({
      name: 'calculator',
      args: { expression: '2+2' },
    });
  });

  it('should parse a tool call with spaces', () => {
    const text = 'call:weather( { "location": "New York" } )';
    const result = parseToolCall(text);
    expect(result).toEqual({
      name: 'weather',
      args: { location: 'New York' },
    });
  });

  it('should parse a tool call with multiline arguments', () => {
    const text = `call:sendEmail({
      "recipient": "test@example.com",
      "subject": "Hello",
      "body": "This is a test."
    })`;
    const result = parseToolCall(text);
    expect(result).toEqual({
      name: 'sendEmail',
      args: {
        recipient: 'test@example.com',
        subject: 'Hello',
        body: 'This is a test.',
      },
    });
  });

  it('should return null for malformed JSON arguments', () => {
    const text = 'call:calculator({expression:"2+2",})'; // Trailing comma
    expect(parseToolCall(text)).toBeNull();
  });

  it('should return null for an incomplete tool call', () => {
    const text = 'call:calculator(';
    expect(parseToolCall(text)).toBeNull();
  });
}); 