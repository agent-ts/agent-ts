# @agent-ts/core

A simple TypeScript library for building AI agents with OpenAI's API. This package provides a flexible and type-safe way to create AI agents that can use custom tools to perform various tasks.

## What is an Agent?

Unlike simple completion APIs, an Agent is capable of having multi-turn conversations with tools. When a user asks a question, the Agent can:

- Analyze the question and determine if it needs additional information
- Call appropriate tools to gather necessary data
- Process the tool responses
- Make further tool calls if needed
- Finally provide a complete answer based on all gathered information

This iterative process allows the Agent to handle complex queries that require multiple steps and external data sources.

## Features

- Easy-to-use agent creation with OpenAI integration
- Support for custom tools with type-safe schemas
- Streaming responses for real-time interactions
- Flexible system prompt customization
- Parallel tool execution support

## Installation

```bash
bun install @agent-ts/core
```

## Quick Start

Here's a simple example of creating and using an agent:

```typescript
import { OpenAI } from "openai";
import { makeAgent, isTextChunk, isToolCallRequest, isToolCallResponse, isNewIteration } from "@agent-ts/core";
import { makeTool } from "@agent-ts/core/tools";

// Create a simple tool
const calculator = makeTool({
  name: "calculator",
  description: "A simple calculator that can perform basic arithmetic operations",
  parameters: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["add", "subtract", "multiply", "divide"]
      },
      a: { type: "number" },
      b: { type: "number" }
    },
    required: ["operation", "a", "b"]
  }
}, async ({ operation, a, b }) => {
  switch (operation) {
    case "add": return (a + b).toString();
    case "subtract": return (a - b).toString();
    case "multiply": return (a * b).toString();
    case "divide": return (a / b).toString();
  }
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Create an agent
const agent = makeAgent({
  tools: [calculator],
  model: "gpt-4-turbo-preview",
  openAI: openai
});

// Use the agent
async function main() {
  // The agent will automatically handle the conversation flow:
  // 1. Receive the question
  // 2. Decide to use the calculator tool
  // 3. Call the tool with appropriate parameters
  // 4. Process the result
  // 5. Provide a natural language response
  for await (const chunk of agent("What is 42 plus 13?")) {
    if (isNewIteration(chunk)) {
      console.log("-".repeat(20));
    } else if (isTextChunk(chunk)) {
      process.stdout.write(chunk.content);
    } else if (isToolCallRequest(chunk)) {
      console.log(`\nAgent is using tool: ${chunk.name}(${chunk.arguments})`);
    } else if (isToolCallResponse(chunk)) {
      console.log(`\nTool result: ${chunk.result}`);
    }
  }
}

main();
```

## Creating Custom Tools

You can create custom tools using the `makeTool` function. Here's an example of a more complex tool:

```typescript
import { makeTool } from "@agent-ts/core/tools";
import { schema } from "@agent-ts/core/tools/schema";

const weatherTool = makeTool({
  name: "get_weather",
  description: "Get the current weather for a location",
  parameters: schema.object({
    location: schema.string().describe("The city name"),
    unit: schema.string().enum(["celsius", "fahrenheit"]).default("celsius")
  })
}, async ({ location, unit }) => {
  // Implement your weather API call here
  const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=YOUR_API_KEY&q=${location}`);
  const data = await response.json();
  return JSON.stringify(data);
});
```

## Testing

To run tests:

```bash
bun test
```

## License

MIT
