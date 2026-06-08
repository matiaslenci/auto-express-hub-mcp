interface ApiClientOptions {
  jwt?: string;
}

const BASE_URL = process.env.AUTO_EXPRESS_HUB_API_URL ?? "http://localhost:3000";

export function createApiClient(options?: ApiClientOptions) {
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options?.jwt) {
    baseHeaders["Authorization"] = `Bearer ${options.jwt}`;
  }

  async function request(method: string, path: string, body?: unknown) {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      method,
      headers: baseHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`API ${res.status}: ${errorText}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  return {
    get: (path: string) => request("GET", path),
    post: (path: string, body: unknown) => request("POST", path, body),
    patch: (path: string, body: unknown) => request("PATCH", path, body),
    delete: (path: string) => request("DELETE", path),
  };
}
