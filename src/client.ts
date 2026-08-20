import axios, { AxiosError } from "axios";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { type Params, type Body } from "./constants.js";
import { validateApiKey } from "./auth.js";
import { ENV } from "./env.js";

const APIFREAKS_BASE_URL = "https://api.apifreaks.com";

const http = axios.create({
  baseURL: APIFREAKS_BASE_URL,
  timeout: 60_000,
  headers: { Accept: "application/json" },
});

function formatError(status: number, data: unknown): string {
  if (
    data !== null &&
    typeof data === "object" &&
    "error" in data &&
    "message" in data &&
    typeof (data as Params)["error"] === "string" &&
    typeof (data as Params)["message"] === "string"
  ) {
    const d = data as Params;
    return `[${status}] ${d["error"]}: ${d["message"]}`;
  }
  return `[${status}] ${JSON.stringify(data).slice(0, 500)}`;
}

export async function callApi(
  endpoint: string,
  apiKey: string,
  params?: Params,
  body?: Body,
  method: "GET" | "POST" = "GET",
  extraHeaders?: Record<string, string>,
): Promise<Params> {
  if (!validateApiKey(apiKey)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `${ENV.API_KEY} is not set or invalid. Set the ${ENV.API_KEY} environment variable to your 32-character API key from apifreaks.com dashboard.`,
    );
  }
  const queryParams = { ...params, apiKey };
  const headers = extraHeaders ? { ...extraHeaders } : undefined;
  try {
    const response =
      method === "POST"
        ? await http.post(endpoint, body, { params: queryParams, headers })
        : await http.get(endpoint, { params: queryParams, headers });
    return response.data as Params;
  } catch (err) {
    if (err instanceof AxiosError) {
      if (!err.response) {
        const msg =
          err.code === "ECONNABORTED"
            ? "APIFreaks API timed out. Please try again."
            : `Cannot reach APIFreaks API (${err.code ?? "unknown error"}). Please try again later.`;
        throw new McpError(ErrorCode.InternalError, msg);
      }
      throw new McpError(
        ErrorCode.InternalError,
        formatError(err.response.status, err.response.data),
      );
    }
    throw err;
  }
}

export async function callApiBinary(
  endpoint: string,
  apiKey: string,
  params?: Params,
): Promise<{ bytes: Buffer; mimeType: string }> {
  if (!validateApiKey(apiKey)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `${ENV.API_KEY} is not set or invalid. Set the ${ENV.API_KEY} environment variable to your 32-character API key from apifreaks.com dashboard.`,
    );
  }
  try {
    const response = await http.get<ArrayBuffer>(endpoint, {
      params: { ...params, apiKey },
      responseType: "arraybuffer",
      headers: { Accept: "image/png,image/webp,image/svg+xml,*/*" },
    });
    const mimeType = String(
      response.headers["content-type"] ?? "application/octet-stream",
    )
      .split(";")[0]
      .trim();
    return {
      bytes: Buffer.from(new Uint8Array(response.data)),
      mimeType,
    };
  } catch (err) {
    if (err instanceof AxiosError) {
      if (!err.response) {
        const msg =
          err.code === "ECONNABORTED"
            ? "APIFreaks API timed out. Please try again."
            : `Cannot reach APIFreaks API (${err.code ?? "unknown error"}). Please try again later.`;
        throw new McpError(ErrorCode.InternalError, msg);
      }
      throw new McpError(
        ErrorCode.InternalError,
        formatError(err.response.status, decodeAxiosErrorData(err.response.data)),
      );
    }
    throw err;
  }
}

function decodeAxiosErrorData(data: unknown): unknown {
  if (Buffer.isBuffer(data)) {
    return parseJsonText(data.toString("utf8"));
  }
  if (data instanceof ArrayBuffer) {
    return parseJsonText(Buffer.from(new Uint8Array(data)).toString("utf8"));
  }
  return data;
}

function parseJsonText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
