import Groq from 'groq-sdk';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { Decimal } from 'decimal.js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are a financial AI assistant for Tally, a sales compensation platform.
Your primary role is to provide accurate financial data regarding commissions.

CRITICAL RULES:
1. DO NOT PERFORM MANAUL MATH. Always use the provided tools to get calculated values (like sums or totals).
2. If a user asks for total commissions, use the 'get_total_commissions' tool.
3. Only use tools for financial data. If the user asks something unrelated, politely inform them that you can only assist with financial queries.
4. Always provide the final value in a clear, professional manner.
5. Do not hallucinate data. If you don't have a tool for it, say you don't know.`;

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
 * Processes a chat message using Groq's llama-3.3-70b-versatile model.
 */
export async function processChatMessage(message: string) {
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
  ];

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    tools: tools as any,
    tool_choice: 'auto',
  });

  const responseMessage = response.choices[0].message;

  if (responseMessage.tool_calls) {
    messages.push(responseMessage);

    for (const toolCall of responseMessage.tool_calls) {
      if (toolCall.function.name === 'get_total_commissions') {
        const total = await getTotalCommissions();
        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: 'get_total_commissions',
          content: total,
        });
      }
    }

    const secondResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
    });

    return secondResponse.choices[0].message.content;
  }

  return responseMessage.content;
}
