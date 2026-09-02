export const ENV = {
  API_KEY: "APIFREAKS_API_KEY",
  MODULES: "ENABLE_MODULES",
} as const;

export function getApiKey(): string {
  return process.env[ENV.API_KEY] ?? "";
}

export function getModulesEnv(): string | undefined {
  return process.env[ENV.MODULES];
}
