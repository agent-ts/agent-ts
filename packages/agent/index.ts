import type { Tool } from "@agent-ts/tool";
import { makeTool } from "@agent-ts/tool";
import type { AgentContext, AgentOutput } from "./types";
import { schema } from "@agent-ts/schema";

const agent = makeTool({
  name: "agent",
  description: "Agent",
  inputSchema: schema({
    type: 'object',
    properties: {
      message: {
        type: 'string',
      },
    },
    required: ['message'],
  }),
  outputSchema: schema({
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['complete', 'error', 'continue'],
      },
      message: {
        type: 'string',
      },
    },
    required: ['type', 'message'],
  }),
  invoke: async (parameters: { message: string }, trace: (chunk: string) => void) => {
    return { type: "complete", message: "Hello, world!" };
  },
});