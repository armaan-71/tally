import { processChatMessage } from '../services/aiAgent';

async function test() {
  console.log('Testing AI Agent...');
  try {
    const response = await processChatMessage('What is the policy for multi-year contracts?');
    console.log('Response:', response);
  } catch (error) {
    console.error('Error in agent:', error);
  }
}

test();
