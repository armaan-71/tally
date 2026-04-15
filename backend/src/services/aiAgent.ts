import Groq from 'groq-sdk';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { Decimal } from 'decimal.js';
import { VectorStore } from './VectorStore';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are a financial AI assistant for Tally, a sales compensation platform.
Your primary role is to provide accurate financial data regarding commissions and sales policies.

CRITICAL RULES:
1. DO NOT PERFORM MANAUL MATH. Always use the provided tools to get calculated values (like sums or totals).
2. If a user asks for total commissions, use the 'get_total_commissions' tool.
3. If a user asks about rules, policies, or "what happens if...", use the 'search_policy' tool to retrieve relevant context.
4. Only use tools for financial and policy data. If the user asks something unrelated, politely inform them that you can only assist with these queries.
5. Always provide the final value in a clear, professional manner.
6. Do not hallucinate data. If you don't have a tool for it or the search returns no results, say you don't know.`;

// Define the tool schema
const GetTotalCommissionsSchema = z.object({});

/**
 * Tool to fetch the total sum of all commissions from the database.
 */
async function getTotalCommissions() {
  const result = await prisma.commission.aggregate({
    _sum: {
      amount: true,
    },
  });

  const total = result._sum.amount || new Decimal(0);
  return total.toString();
}

/**
 * Tool to search the policy knowledge base using vector similarity.
 */
async function searchPolicy(query: string) {
  const vectorStore = await VectorStore.getInstance();
  const results = await vectorStore.search(query);
  return JSON.stringify(results.map(r => r.content));
}

/**
 * Processes a chat message using Groq's llama-3.3-70b-versatile model.
 */
export async function processChatMessage(message: string) {
  const thoughts: string[] = [];
  thoughts.push('Analyzing user query for financial intent...');

  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: message },
  ];

  const tools = [
    {
      type: 'function',
      function: {
        name: 'get_total_commissions',
        description: 'Get the total sum of all commissions calculated in the system.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_policy',
        description: 'Search for company policies, rules, and logic details (e.g., clawbacks, rates, eligibility).',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query or rule the user is asking about.',
            },
          },
          required: ['query'],
        },
      },
    },
  ];

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    tools: tools as any,
    tool_choice: 'auto',
  });

  const responseMessage = response.choices[0].message;

  if (responseMessage.tool_calls) {
    thoughts.push(`Intent identified: ${responseMessage.tool_calls.length > 1 ? 'Multiple' : responseMessage.tool_calls[0].function.name.replace(/_/g, ' ')}.`);
    messages.push(responseMessage);

    for (const toolCall of responseMessage.tool_calls) {
      thoughts.push(`Executing tool: ${toolCall.function.name}...`);
      
      if (toolCall.function.name === 'get_total_commissions') {
        const total = await getTotalCommissions();
        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: 'get_total_commissions',
          content: total,
        });
      } else if (toolCall.function.name === 'search_policy') {
        const args = JSON.parse(toolCall.function.arguments);
        const policyContext = await searchPolicy(args.query);
        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: 'search_policy',
          content: policyContext,
        });
      }
    }

    thoughts.push('Synthesizing final response based on results.');
    const secondResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
    });

    return {
      response: secondResponse.choices[0].message.content,
      thoughts
    };
  }

  thoughts.push('Synthesizing final response.');
  return {
    response: responseMessage.content,
    thoughts
  };
}
