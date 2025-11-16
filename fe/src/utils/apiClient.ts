const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface RequestOptions extends RequestInit {
  token?: string | null;
}

const buildHeaders = (token?: string | null) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res: Response) => {
  const contentType = res.headers.get("content-type");
  const body = contentType?.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const message =
      typeof body === "object" && body && "message" in body
        ? (body as { message: string }).message
        : `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return body;
};

export async function apiRequest<T = any>(
  path: string,
  method: HttpMethod = "GET",
  data?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const { token, ...rest } = options;

  const response = await fetch(url, {
    method,
    headers: buildHeaders(token),
    body: data ? JSON.stringify(data) : undefined,
    ...rest,
  });

  return handleResponse(response);
}

export const apiClient = {
  get: <T = any>(path: string, token?: string | null) =>
    apiRequest<T>(path, "GET", undefined, { token }),
  post: <T = any>(path: string, data?: unknown, token?: string | null) =>
    apiRequest<T>(path, "POST", data, { token }),
  delete: <T = any>(path: string, token?: string | null) =>
    apiRequest<T>(path, "DELETE", undefined, { token }),
};

export const getSocketBaseUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL.replace(/\/$/, "");
  }
  if (API_BASE.endsWith("/api")) {
    return API_BASE.replace(/\/api$/, "");
  }
  return API_BASE;
};

export default apiClient;
