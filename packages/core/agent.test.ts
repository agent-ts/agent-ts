import { describe, expect, test, mock } from "bun:test";
import { makeAgent } from "./agent";
import { type OpenAI } from "openai";
import { makeTool, schema, type Tool } from "./tools";
import {
  isTextChunk,
  isToolCallRequest,
  isToolCallResponse,
  isNewIteration,
} from "./chunks";

// 模拟工具
const mockTool: Tool = makeTool({
  name: "test_tool",
  description: "测试工具",
  schema: schema({ type: "object", properties: {} }),
  call: mock(async () => "tool result"),
});

// 创建一个模拟的 agent 生成器
const makeMockAgent = (mockCompletions: Array<() => AsyncGenerator<any>>) => {
  let iteration = 0;
  return {
    chat: {
      completions: {
        create: mock(async function* () {
          if (iteration >= mockCompletions.length) {
            throw new Error("Mock completions exhausted");
          }
          const generator = mockCompletions[iteration]!();
          for await (const chunk of generator) {
            yield chunk;
          }
          iteration++;
        }),
      },
    },
  } as unknown as OpenAI;
};

describe("makeAgent", () => {
  test("应该正确处理完整的对话流程", async () => {
    // 第一轮：工具调用
    const firstIteration = async function* () {
      yield {
        choices: [
          {
            delta: {
              content: "",
              tool_calls: [
                {
                  index: 0,
                  id: "call_1",
                  function: {
                    name: "test_tool",
                    arguments: "{}",
                  },
                },
              ],
            },
          },
        ],
      };
    };

    // 第二轮：基于工具结果的响应
    const secondIteration = async function* () {
      yield {
        choices: [
          {
            delta: {
              content: "根据工具调用结果，",
              tool_calls: [],
            },
          },
        ],
      };
      yield {
        choices: [
          {
            delta: {
              content: "我可以告诉你：",
              tool_calls: [],
            },
          },
        ],
      };
      yield {
        choices: [
          {
            delta: {
              content: "工具返回了结果。",
              tool_calls: [],
            },
          },
        ],
      };
    };

    const mockOpenAI = makeMockAgent([firstIteration, secondIteration]);

    const agent = makeAgent({
      tools: [mockTool],
      model: "gpt-4",
      openAI: mockOpenAI,
      systemPrompt: "你是一个助手",
    });

    const chunks: any[] = [];
    for await (const chunk of agent("请使用工具并告诉我结果")) {
      chunks.push(chunk);
    }

    // 验证完整的流程
    const iterations = chunks.filter(isNewIteration);
    expect(iterations.length).toBe(2); // 应该有两轮迭代

    // 验证工具调用
    const toolCalls = chunks.filter(isToolCallRequest);
    expect(toolCalls.length).toBe(1);

    // 验证工具响应
    const toolResponses = chunks.filter(isToolCallResponse);
    expect(toolResponses.length).toBe(1);

    // 验证最终的文本响应
    const textChunks = chunks
      .filter(isTextChunk)
      .map((chunk) => chunk.content)
      .join("");
    expect(textChunks).toBe("根据工具调用结果，我可以告诉你：工具返回了结果。");
  });

  test("应该处理多轮工具调用", async () => {
    // 第一轮：第一个工具调用
    const firstIteration = async function* () {
      yield {
        choices: [
          {
            delta: {
              content: "",
              tool_calls: [
                {
                  index: 0,
                  id: "call_1",
                  function: {
                    name: "test_tool",
                    arguments: "{}",
                  },
                },
              ],
            },
          },
        ],
      };
    };

    // 第二轮：第二个工具调用
    const secondIteration = async function* () {
      yield {
        choices: [
          {
            delta: {
              content: "",
              tool_calls: [
                {
                  index: 0,
                  id: "call_2",
                  function: {
                    name: "test_tool",
                    arguments: "{}",
                  },
                },
              ],
            },
          },
        ],
      };
    };

    // 第三轮：最终响应
    const thirdIteration = async function* () {
      yield {
        choices: [
          {
            delta: {
              content: "所有工具调用已完成，",
              tool_calls: [],
            },
          },
        ],
      };
      yield {
        choices: [
          {
            delta: {
              content: "这是最终的回答。",
              tool_calls: [],
            },
          },
        ],
      };
    };

    const mockOpenAI = makeMockAgent([
      firstIteration,
      secondIteration,
      thirdIteration,
    ]);

    const agent = makeAgent({
      tools: [mockTool],
      model: "gpt-4",
      openAI: mockOpenAI,
      systemPrompt: "你是一个助手",
    });

    const chunks: any[] = [];
    for await (const chunk of agent("请进行多轮工具调用")) {
      chunks.push(chunk);
    }

    // 验证迭代次数
    const iterations = chunks.filter(isNewIteration);
    expect(iterations.length).toBe(3); // 应该有三轮迭代

    // 验证工具调用次数
    const toolCalls = chunks.filter(isToolCallRequest);
    expect(toolCalls.length).toBe(2);

    // 验证工具响应次数
    const toolResponses = chunks.filter(isToolCallResponse);
    expect(toolResponses.length).toBe(2);

    // 验证最终的文本响应
    const textChunks = chunks
      .filter(isTextChunk)
      .map((chunk) => chunk.content)
      .join("");
    expect(textChunks).toBe("所有工具调用已完成，这是最终的回答。");
  });

  test("应该处理工具调用错误后的恢复", async () => {
    // 第一轮：工具调用（会失败）
    const firstIteration = async function* () {
      yield {
        choices: [
          {
            delta: {
              content: "",
              tool_calls: [
                {
                  index: 0,
                  id: "call_1",
                  function: {
                    name: "error_tool",
                    arguments: "{}",
                  },
                },
              ],
            },
          },
        ],
      };
    };

    // 第二轮：错误后的响应
    const secondIteration = async function* () {
      yield {
        choices: [
          {
            delta: {
              content: "抱歉，工具调用失败了，",
              tool_calls: [],
            },
          },
        ],
      };
      yield {
        choices: [
          {
            delta: {
              content: "让我用其他方式回答。",
              tool_calls: [],
            },
          },
        ],
      };
    };

    const mockOpenAI = makeMockAgent([firstIteration, secondIteration]);

    const errorTool: Tool = makeTool({
      name: "error_tool",
      description: "总是失败的工具",
      schema: schema({ type: "object", properties: {} }),
      call: mock(async () => {
        throw new Error("工具调用失败");
      }),
    });

    const agent = makeAgent({
      tools: [errorTool],
      model: "gpt-4",
      openAI: mockOpenAI,
      systemPrompt: "你是一个助手",
    });

    const chunks: any[] = [];
    for await (const chunk of agent("请使用工具")) {
      chunks.push(chunk);
    }

    // 验证迭代次数
    const iterations = chunks.filter(isNewIteration);
    expect(iterations.length).toBe(2); // 应该有两轮迭代

    // 验证错误响应
    const errorResponse = chunks.find(isToolCallResponse);
    expect(errorResponse).toBeDefined();
    expect(errorResponse!.result).toContain("error");

    // 验证错误后的文本响应
    const textChunks = chunks
      .filter(isTextChunk)
      .map((chunk) => chunk.content)
      .join("");
    expect(textChunks).toBe("抱歉，工具调用失败了，让我用其他方式回答。");
  });

  test("应该处理没有工具的情况", async () => {
    // 第一轮：直接文本响应
    const firstIteration = async function* () {
      yield {
        choices: [
          {
            delta: {
              content: "这是一个",
              tool_calls: [],
            },
          },
        ],
      };
      yield {
        choices: [
          {
            delta: {
              content: "纯文本响应",
              tool_calls: [],
            },
          },
        ],
      };
    };

    const mockOpenAI = makeMockAgent([firstIteration]);

    const agent = makeAgent({
      tools: [],
      model: "gpt-4",
      openAI: mockOpenAI,
      systemPrompt: "你是一个助手",
    });

    const chunks: any[] = [];
    for await (const chunk of agent("请回答一个问题")) {
      chunks.push(chunk);
    }

    // 验证迭代次数
    const iterations = chunks.filter(isNewIteration);
    expect(iterations.length).toBe(1);

    // 验证没有工具调用
    const toolCalls = chunks.filter(isToolCallRequest);
    expect(toolCalls.length).toBe(0);

    // 验证文本响应
    const textChunks = chunks
      .filter(isTextChunk)
      .map((chunk) => chunk.content)
      .join("");
    expect(textChunks).toBe("这是一个纯文本响应");
  });

  test("应该处理需要拼装的工具调用", async () => {
    // 第一轮：工具调用（参数需要拼装）
    const firstIteration = async function* () {
      yield {
        choices: [
          {
            delta: {
              content: "",
              tool_calls: [
                {
                  index: 0,
                  id: "call_1",
                  function: {
                    name: "test_tool",
                    arguments: '{"key1": "value1",',
                  },
                },
              ],
            },
          },
        ],
      };
      yield {
        choices: [
          {
            delta: {
              content: "",
              tool_calls: [
                {
                  index: 0,
                  function: {
                    arguments: '"key2": "value2"}',
                  },
                },
              ],
            },
          },
        ],
      };
    };

    // 第二轮：基于工具结果的响应
    const secondIteration = async function* () {
      yield {
        choices: [
          {
            delta: {
              content: "工具调用完成，",
              tool_calls: [],
            },
          },
        ],
      };
      yield {
        choices: [
          {
            delta: {
              content: "参数已正确拼装。",
              tool_calls: [],
            },
          },
        ],
      };
    };

    const mockOpenAI = makeMockAgent([firstIteration, secondIteration]);

    const agent = makeAgent({
      tools: [mockTool],
      model: "gpt-4",
      openAI: mockOpenAI,
      systemPrompt: "你是一个助手",
    });

    const chunks: any[] = [];
    for await (const chunk of agent("请使用工具并传入复杂参数")) {
      chunks.push(chunk);
    }

    // 验证迭代次数
    const iterations = chunks.filter(isNewIteration);
    expect(iterations.length).toBe(2);

    // 验证工具调用
    const toolCalls = chunks.filter(isToolCallRequest);
    expect(toolCalls.length).toBe(1);
    expect(JSON.parse(toolCalls[0]!.arguments)).toEqual({
      key1: "value1",
      key2: "value2",
    });

    // 验证工具响应
    const toolResponses = chunks.filter(isToolCallResponse);
    expect(toolResponses.length).toBe(1);

    // 验证最终的文本响应
    const textChunks = chunks
      .filter(isTextChunk)
      .map((chunk) => chunk.content)
      .join("");
    expect(textChunks).toBe("工具调用完成，参数已正确拼装。");
  });
});
