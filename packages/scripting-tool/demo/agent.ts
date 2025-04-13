import OpenAI from "openai";
import {
  makeAgent,
  isNewIteration,
  isTextChunk,
  isToolCallRequest,
  isToolCallResponse,
  DEFAULT_SYSTEM_PROMPT,
} from "@agent-ts/core";
import { scriptingTool } from "..";


const openAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  baseURL: process.env.OPENAI_API_URL || "https://api.openai.com/v1",
});

const agent = makeAgent({
  tools: [scriptingTool],
  model: process.env.OPENAI_MODEL || "gpt-4o",
  openAI,
  systemPrompt: `
  ${DEFAULT_SYSTEM_PROMPT}
  Please do at least 1 rounds of introspection on your previous response.
  `,
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
