import OpenAI from "openai";
import {
  makeAgent,
  isNewIteration,
  isTextChunk,
  isToolCallRequest,
  isToolCallResponse,
} from "@agent-ts/core";
import { scriptingTool } from "..";


const openAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_URL,
});

const agent = makeAgent({
  tools: [scriptingTool],
  model: 'deepseek-chat',
  openAI,
});

export const ask = async (message: string) => {
  for await (const chunk of agent(message)) {
    if (isNewIteration(chunk)) {
      console.log("-".repeat(20));
    } else if (isTextChunk(chunk)) {
      console.write(chunk.content);
    } else if (isToolCallRequest(chunk)) {
      console.log(`\nTool call: ${chunk.name}(${chunk.arguments})`);
    } else if (isToolCallResponse(chunk)) {
      console.log(`\nTool call response: ${chunk.result}`);
    }
  }
}
