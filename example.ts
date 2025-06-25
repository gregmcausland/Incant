import 'dotenv/config'; // To load .env file for API key
import { z } from 'zod';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { createAgent, runAgent } from './src/core/agent';
import { tool } from './src/tools/tool';
import { GeminiWrapper } from './src/llm/geminiWrapper';
import { createBufferMemory } from './src/memory/bufferMemory';
import type { AgentState } from './src/core/types';

/**
 * Example End-to-End Chat for the Incant Agent
 *
 * This script demonstrates a continuous chat session with an agent
 * that has memory and tool-calling capabilities.
 *
 * To run this file:
 * 1. Make sure you have a .env file with your GEMINI_API_KEY.
 * 2. Run the file using the start script:
 *    npm start
 */

// --- 1. Define Tools ---

// A standard tool that gets the weather. The agent will summarize the result.
tool({
  name: 'get_weather',
  description: 'Gets the current weather for a specified city.',
  schema: z.object({
    city: z.string().describe('The city to get the weather for, e.g., "London"'),
  }),
})(async ({ city }: { city: string }) => {
  console.log(`[Tool Called] get_weather with city: ${city}`);
  // In a real scenario, this would call a weather API.
  if (city.toLowerCase() === 'london') {
    return { temperature: '15°C', condition: 'Cloudy' };
  }
  return { temperature: '25°C', condition: 'Sunny' };
});

// A tool that returns its result directly without a final LLM summarization.
tool({
  name: 'search_web',
  description: 'Performs a web search for a given query.',
  schema: z.object({
    query: z.string().describe('The query to search the web for.'),
  }),
  returnDirect: true,
})(async ({ query }: { query: string }) => {
  console.log(`[Tool Called] search_web with query: ${query}`);
  // In a real scenario, this would call a search engine API.
  return {
    results: [
      { title: 'Incant - The best new LLM framework', url: '...' },
      { title: 'A simple guide to LLM agents', url: '...' },
    ],
  };
});

// --- 2. Chat Logic ---

async function chat(agent: AgentState) {
  const rl = readline.createInterface({ input, output });

  console.log('\n--- Agent Chat Initialized ---');
  console.log('You can now chat with the agent. Type "exit" or "quit" to end.');
  console.log(
    'Try asking about the weather in London, then in the next turn, ask "what did I just ask about?"\n',
  );

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const userInput = await rl.question('> User: ');

    if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
      rl.close();
      break;
    }

    try {
      const response = await runAgent(agent, userInput);

      // The `returnDirect` tool returns a JSON string, so we try to parse and print it nicely.
      try {
        const prettyResponse = JSON.parse(response);
        console.log('\n< Agent (Direct Tool Output):');
        console.log(prettyResponse, '\n');
      } catch {
        // Otherwise, it's a standard string response.
        console.log(`\n< Agent: ${response}\n`);
      }
    } catch (error) {
      console.error('\n< Agent Error:', error, '\n');
    }
  }
}

// --- 3. Main Execution ---

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY environment variable not set.');
    console.error('Please create a .env file with GEMINI_API_KEY=your_api_key');
    return;
  }

  // Initialize the real Gemini LLM wrapper
  const llm = new GeminiWrapper(apiKey, 'gemini-1.5-flash', 'logs/incant.log');
  // Initialize memory
  const memory = createBufferMemory();

  // Create an agent configured with LLM, memory, and tools
  const agent = createAgent({
    llm,
    memory,
    tools: ['get_weather', 'search_web'],
  });

  await chat(agent);
}

main().catch(console.error); 