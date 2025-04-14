export type Schema =
  | StringSchema
  | NumberSchema
  | BooleanSchema
  | NullSchema
  | IntegerSchema
  | ArraySchema
  | ObjectSchema;

export type StringFormat = "email" | "uri" | "date-time";

export type StringSchema = {
  type: "string";
  minLength?: number;
  maxLength?: number;
  format?: StringFormat;
  enum?: readonly string[];
};

export type NumberSchema = {
  type: "number";
  minimum?: number;
  maximum?: number;
  enum?: readonly number[];
};

export type IntegerSchema = {
  type: "integer";
  minimum?: number;
  maximum?: number;
  enum?: readonly number[];
};

export type BooleanSchema = {
  type: "boolean";
};

export type NullSchema = {
  type: "null";
};

export type ArraySchema = {
  type: "array";
  items: Schema;
  minItems?: number;
  maxItems?: number;
};

export type PropertySchema = Schema & {
  description?: string;
  default?: ValueOf<Schema>;
};

export type ObjectSchema = {
  type: "object";
  properties: Record<string, PropertySchema>;
  required?: readonly string[];
};

type ElementOf<T extends readonly unknown[]> = T[number];

type PropertyValueOf<
  T extends ObjectSchema,
  K extends keyof T["properties"]
> = ValueOf<T["properties"][K]>;

type PropertyOf<
  T extends ObjectSchema,
  K extends keyof T["properties"]
> = T["required"] extends readonly unknown[]
  ? K extends ElementOf<T["required"]>
    ? PropertyValueOf<T, K>
    : PropertyValueOf<T, K> | undefined
  : PropertyValueOf<T, K> | undefined;

type StringValueOf<T extends StringSchema> = T["enum"] extends readonly string[]
  ? ElementOf<T["enum"]>
  : string;

type NumberValueOf<T extends NumberSchema | IntegerSchema> =
  T["enum"] extends readonly number[] ? ElementOf<T["enum"]> : number;

export type ValueOf<T extends Schema> = T extends StringSchema
  ? StringValueOf<T>
  : T extends NumberSchema
  ? NumberValueOf<T>
  : T extends IntegerSchema
  ? NumberValueOf<T>
  : T extends BooleanSchema
  ? boolean
  : T extends NullSchema
  ? null
  : T extends ArraySchema
  ? ValueOf<T["items"]>[]
  : T extends ObjectSchema
  ? { [K in keyof T["properties"]]: PropertyOf<T, K> }
  : never;

/**
 * Parse error
 */
export class ParseError extends Error {
  constructor(message: string, public path: string, public input: unknown) {
    super(message);
  }
}

export type ParseResult<T extends Schema> =
  | {
      success: true;
      value: ValueOf<T>;
    }
  | {
      success: false;
      error: ParseError;
    };
