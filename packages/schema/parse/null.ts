import type { NullSchema } from "../types";
import { ParseError } from "../types";

export function parseNull<T extends NullSchema>(
  schema: T,
  path: string,
  input: unknown
): null {
  if (input !== null) {
    throw new ParseError(`input is not null: ${input}`, path, input);
  }
  return null;
}
