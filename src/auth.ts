const KEY_PATTERN = /^[a-zA-Z0-9]{32}$/;

export function validateApiKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

export function getApiKey(): string {
  const key = process.env.APIFREAKS_API_KEY ?? "";
  if (!validateApiKey(key)) {
    console.error(
      "ERROR: APIFREAKS_API_KEY must be exactly 32 alphanumeric characters.",
    );
    process.exit(1);
  }
  return key;
}
