export type AgentOutputChunk =
  | NewIteration
  | ToolCallRequest
  | ToolCallResponse
  | TextChunk;

const NEW_ITERATION = Symbol("new_iteration");
const TOOL_CALL_REQUEST = Symbol("tool_call_request");
const TOOL_CALL_RESPONSE = Symbol("tool_call_response");
const TEXT_CHUNK = Symbol("text");

export type NewIteration = {
  type: typeof NEW_ITERATION;
};

export const newIteration = (): NewIteration => ({ type: NEW_ITERATION });
export const isNewIteration = (
  chunk: AgentOutputChunk
): chunk is NewIteration => chunk.type === NEW_ITERATION;

export type ToolCallRequest = {
  type: typeof TOOL_CALL_REQUEST;
  id: string;
  name: string;
  arguments: string;
};

export const toolCallRequest = (
  id: string,
  name: string,
  args: string
): ToolCallRequest => ({ type: TOOL_CALL_REQUEST, id, name, arguments: args });
export const isToolCallRequest = (
  chunk: AgentOutputChunk
): chunk is ToolCallRequest => chunk.type === TOOL_CALL_REQUEST;

export type ToolCallResponse = {
  type: typeof TOOL_CALL_RESPONSE;
  id: string;
  result: string;
};

export const toolCallResponse = (
  id: string,
  result: string
): ToolCallResponse => ({ type: TOOL_CALL_RESPONSE, id, result });
export const isToolCallResponse = (
  chunk: AgentOutputChunk
): chunk is ToolCallResponse => chunk.type === TOOL_CALL_RESPONSE;

export type TextChunk = {
  type: typeof TEXT_CHUNK;
  content: string;
};

export const textChunk = (content: string): TextChunk => ({
  type: TEXT_CHUNK,
  content,
});
export const isTextChunk = (chunk: AgentOutputChunk): chunk is TextChunk =>
  chunk.type === TEXT_CHUNK;
