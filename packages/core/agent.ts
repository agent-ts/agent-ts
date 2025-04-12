import { type OpenAI } from "openai";
import { type Tool } from "./tools";
import { defaultSystemPrompt } from "./prompts";
import type { AgentOutputChunk, ToolCallRequest, TextChunk } from "./chunks";

import {
  newIteration,
  toolCallRequest,
  toolCallResponse,
  textChunk,
  isToolCallRequest,
  isTextChunk,
} from "./chunks";

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

export type AgentParams = {
  tools: Tool[];
  model: string;
  openAI: OpenAI;
  systemPrompt?: string;
};

export const makeAgent = ({
  tools,
  model,
  openAI,
  systemPrompt = defaultSystemPrompt,
}: AgentParams): Agent =>
  async function* (message: string): AsyncGenerator<AgentOutputChunk> {
    // Initialize message history
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];

    const toolMap = tools.reduce(
      (acc, tool) => {
        if (tool.definition.function) {
          acc[tool.definition.function.name] = tool;
        }
        return acc;
      },
      {} as Record<
        string,
        {
          definition: OpenAI.ChatCompletionTool;
          call: (parameters: string) => Promise<string>;
        }
      >
    );

    let hasMoreIterations = true;
    while (hasMoreIterations) {
      const assistantMessage: OpenAI.ChatCompletionAssistantMessageParam = {
        role: "assistant",
        content: "",
      };

      yield newIteration();

      const chunks = runAgenticIteration(
        openAI,
        tools.length > 0
          ? {
              model,
              messages,
              tools: tools.map((tool) => tool.definition),
              tool_choice: "auto",
              parallel_tool_calls: true,
            }
          : {
              model,
              messages,
            }
      );

      messages.push(assistantMessage);

      hasMoreIterations = false;

      for await (const chunk of chunks) {
        if (isTextChunk(chunk)) {
          assistantMessage.content += chunk.content;
          yield chunk;
        } else if (isToolCallRequest(chunk)) {
          yield chunk;

          hasMoreIterations = true;
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
            const result = await tool.call(chunk.arguments);
            messages.push({
              role: "tool",
              content: result,
              tool_call_id: chunk.id,
            });
            yield toolCallResponse(chunk.id, result);
          }
        }
      }
    }
  };
