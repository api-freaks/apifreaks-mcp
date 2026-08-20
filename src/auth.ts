const KEY_PATTERN = /^[a-zA-Z0-9]{32}$/;

export function validateApiKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}
