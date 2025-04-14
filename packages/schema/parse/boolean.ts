import type { BooleanSchema } from "../types";
import { ParseError } from "../types";

export function parseBoolean<T extends BooleanSchema>(
  schema: T,
  path: string,
  input: unknown
): boolean {
  if (typeof input !== "boolean") {
    throw new ParseError(`input is not a boolean: ${input}`, path, input);
  }
  return input;
}