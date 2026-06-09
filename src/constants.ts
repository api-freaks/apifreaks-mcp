export type ParamValue = string | number | boolean | string[];
export type Params = Record<string, ParamValue>;
export type Body = Record<string, unknown>;

export const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;
