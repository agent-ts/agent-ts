function trimPrompt(prompt: string) {
  return prompt.split("\n").map((s) => s.trim()).join("\n");
}

export const DEFAULT_SYSTEM_PROMPT = trimPrompt(`
  Please answer the following user question based on the user's language.
  You can make tool calls to get information.
  Please also tell what you want to do when you are making a tool call.
  If a tool call fails, you can try another way, don't give up too soon.
  If you need to prune the message history, use the @prune tool.
`);

export const DEFAULT_MAX_ITERATIONS = 10;
