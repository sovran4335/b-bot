// 서버 연동 시 엔드포인트만 교체 가능하도록 API 호출을 한 곳에 모은다 (10장)

export interface ApiErrorBody {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  constructor(public readonly body: ApiErrorBody) {
    super(body.message);
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (res.status === 204) return undefined as T;

  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) throw new ApiError(body as ApiErrorBody);
  return body as T;
}

export const apiGet = <T>(path: string) => apiFetch<T>(path);
export const apiPost = <T>(path: string, data?: unknown) =>
  apiFetch<T>(path, {
    method: "POST",
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
export const apiPatch = <T>(path: string, data?: unknown) =>
  apiFetch<T>(path, {
    method: "PATCH",
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
export const apiPut = <T>(path: string, data?: unknown) =>
  apiFetch<T>(path, { method: "PUT", body: JSON.stringify(data) });
export const apiDelete = <T>(path: string) =>
  apiFetch<T>(path, { method: "DELETE" });
