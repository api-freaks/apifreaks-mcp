const KEY_PATTERN = /^[a-zA-Z0-9]{32}$/;

export function validateApiKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

export function getApiKey(): string {
  return process.env.APIFREAKS_API_KEY ?? "";
}
