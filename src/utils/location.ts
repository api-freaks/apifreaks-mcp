import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export function requireIpOrLocation(...values: (unknown | undefined)[]): void {
  if (!values.some((v) => v !== undefined && v !== null)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "At least one location field is required: provide 'ip', 'location', or 'lat'+'long'.",
    );
  }
}
