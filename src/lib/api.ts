import "client-only";

import { fetchAuthSession } from "aws-amplify/auth";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("APIの接続先が設定されていません。");
  }

  return baseUrl.replace(/\/$/, "");
}

async function getAccessToken() {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString();

  if (!accessToken) {
    throw new ApiError("ログインが必要です。", 401);
  }

  return accessToken;
}

async function readErrorMessage(response: Response) {
  try {
    const body = await response.json() as { message?: unknown };
    if (typeof body.message === "string") return body.message;
  } catch {
    // JSON以外のエラーレスポンスでは共通メッセージを使用する。
  }

  return response.status === 401
    ? "認証の有効期限が切れています。もう一度ログインしてください。"
    : "APIリクエストに失敗しました。";
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
