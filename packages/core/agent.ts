import { type OpenAI } from "openai";
import { makeTool, makeInternalTool } from "./tools";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_MAX_ITERATIONS } from "./constants";
import type { Tool, InternalTool } from "./tools";
import type { AgentOutputChunk, ToolCallRequest, TextChunk } from "./chunks";

import {
  newIteration,
  toolCallRequest,
  toolCallResponse,
  textChunk,
  isToolCallRequest,
  isTextChunk,
} from "./chunks";
import { schema } from "./tools/schema";

/**
 * Collect tool call request segments in each chunk, and combine them into complete tool call requests
 * @param toolCallRequests tool call request list
 * @param deltaToolCalls tool call request
 * @returns tool call request list
 */
const collectToolCallRequests = (
  toolCallRequests: ToolCallRequest[],
  deltaToolCalls: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall[]
): ToolCallRequest[] => {
  for (const toolCall of deltaToolCalls) {
    const {
      index,
      id,
      function: { name = "", arguments: args = "" } = {},
    } = toolCall;
    if (id) {
      toolCallRequests[index] = toolCallRequest(id, name, args);
    } else if (index < toolCallRequests.length && toolCallRequests[index]) {
      toolCallRequests[index].name += name;
      toolCallRequests[index].arguments += args;
    }
  }
  return toolCallRequests;
};

/**
 * Run an agentic iteration
 * @param openAI openai client
 * @param params openai completion params
 * @yields text chunks
 * @returns tool call request list
 */
const runAgenticIteration = async function* (
  openAI: OpenAI,
  params: OpenAI.ChatCompletionCreateParams
): AsyncGenerator<TextChunk | ToolCallRequest> {
  const toolCallRequests: ToolCallRequest[] = [];

  for await (const chunk of await openAI.chat.completions.create({
    ...params,
    stream: true,
  })) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.content) {
      yield textChunk(delta.content);
    }
    collectToolCallRequests(toolCallRequests, delta?.tool_calls ?? []);
  }
  for (const req of toolCallRequests) {
    yield req;
  }
};

export type Agent = (message: string) => AsyncGenerator<AgentOutputChunk>;

/**
 * Agent params
 * @param tools tools the agent can call
 * @param model model to use
 * @param openAI openai client
 * @param systemPrompt system prompt, could be a string or a function that modifies the default system prompt
 * @param maxIterations maximum number of iterations
 */
export type AgentParams = {
  tools: Tool[];
  model: string;
  openAI: OpenAI;
  systemPrompt?: string;
  maxIterations?: number;
};

/**
 * Make a context for the agent
 * @param initialMessages initial messages
 * @returns messages and prune tool
 */
const makeContext = (initialMessages: OpenAI.ChatCompletionMessageParam[]): {
  messages: OpenAI.ChatCompletionMessageParam[];
  pruneTool: InternalTool;
} => {
  const messages = [...initialMessages];
  const pruneTool = makeTool({
    name: "prune",
    description: "Prune the message history and keep only the key information",
    schema: schema({
      type: "object",
      properties: {
        content: { type: "string" },
      },
      required: ["content"],
    }),
    call: async ({ content }) =>
      `The message history has been pruned. Here are the key points:\n${content}`,
  });
  return {
    messages,
    pruneTool: {
      definition: pruneTool.definition,
      call: async (messages, id, parameters) => {
        messages.splice(initialMessages.length);
        const content = await pruneTool.call(parameters);
        messages.push({ role: "system", content });
        return content;
      },
    },
  };
};



/**
 * Make an agent with tools, model, and system prompt
 * @param params agent params
 * @returns agent
 */
export const makeAgent = (params: AgentParams): Agent =>
  async function* (message: string): AsyncGenerator<AgentOutputChunk> {
    const {
      model,
      openAI,
      systemPrompt = DEFAULT_SYSTEM_PROMPT,
      maxIterations = DEFAULT_MAX_ITERATIONS,
    } = params;

    // Initialize message history
    const { pruneTool, messages } = makeContext([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);

    const tools: InternalTool[] = [...params.tools.map(makeInternalTool), pruneTool];

    const toolMap = tools.reduce((acc, tool) => {
      if (tool.definition.function) {
        acc[tool.definition.function.name] = tool;
      }
      return acc;
    }, {} as Record<string, InternalTool>);

    let iterations = 0;
    while (iterations < maxIterations) {
      iterations++;
      const assistantMessage: OpenAI.ChatCompletionAssistantMessageParam = {
        role: "assistant",
        content: "",
      };

      yield newIteration();

      const chunks = runAgenticIteration(
        openAI,
        {
          model,
          messages,
          tools: tools.map((tool) => tool.definition),
          tool_choice: "auto",
          parallel_tool_calls: true,
        }
      );

      messages.push(assistantMessage);

      let hasToolCall = false;

      for await (const chunk of chunks) {
        if (isTextChunk(chunk)) {
          assistantMessage.content += chunk.content;
          yield chunk;
        } else if (isToolCallRequest(chunk)) {
          hasToolCall = true;
          yield chunk;

          const tool = toolMap[chunk.name];
          if (tool) {
            if (!assistantMessage.tool_calls) {
              assistantMessage.tool_calls = [];
            }
            assistantMessage.tool_calls.push({
              id: chunk.id,
              type: "function",
              function: {
                name: chunk.name,
                arguments: chunk.arguments,
              },
            });
            const result = await tool.call(messages, chunk.id, chunk.arguments);
            yield toolCallResponse(chunk.id, result);
          }
        }
      }
      if (!hasToolCall) {
        break;
      }
    }
  };
