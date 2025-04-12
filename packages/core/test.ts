import { makeAgent } from "./agent";
import {
  isNewIteration,
  isTextChunk,
  isToolCallRequest,
  isToolCallResponse,
} from "./chunks";
import { OpenAI } from "openai";
import vm from "node:vm";
import { makeTool, schema } from "./tools";

const openAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_URL,
});

const tools = [
  makeTool({
    name: "execute_script",
    description:
      "Execute JavaScript code in sandbox without network access, write the result to the global variable 'result', you can write code to get the information you need",
    schema: schema({
      type: "object",
      properties: {
        script: {
          description: "The JavaScript code to execute",
          type: "string",
        },
      },
      required: ["script"],
    }),
    call: async ({ script }) => {
      const context: { result: string | null } = { result: null };
      console.log(script);
      const sc = new vm.Script(script);
      sc.runInNewContext(context);
      return context.result ?? "No result";
    },
  }),
];

const agent = makeAgent({
  tools,
  model: "deepseek-chat",
  openAI,
  systemPrompt: "You are a helpful assistant.",
});

for await (const chunk of agent(
  "计算一下房贷利息，贷款 300万，30年，年利率 3.8%。并编程验证。"
)) {
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
