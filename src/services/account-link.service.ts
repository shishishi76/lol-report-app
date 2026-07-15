import "client-only";

import { apiFetch } from "@/lib/api";

export type AccountLink =
  | { status: "UNLINKED" }
  | {
      status: "PENDING";
      challengeId: string;
      gameName: string;
      tagLine: string;
      expiresAt: string;
    }
  | {
      status: "VERIFIED";
      gameName: string;
      tagLine: string;
      verifiedAt: string;
    };

export type StartAccountLinkResult = {
  status: "PENDING";
  challengeId: string;
  gameName: string;
  tagLine: string;
  initialProfileIconId: number;
  expiresAt: string;
  instruction: string;
};

export type VerifyAccountLinkResult =
  | {
      status: "PENDING";
      retryAfterSeconds: number;
      expiresAt: string;
      message: string;
    }
  | {
      status: "VERIFIED";
      gameName: string;
      tagLine: string;
      verifiedAt: string;
    };

export function getMyAccountLink(signal?: AbortSignal) {
  return apiFetch<AccountLink>("/account-links/me", { signal });
}

export function startAccountLink(gameName: string, tagLine: string) {
  return apiFetch<StartAccountLinkResult>("/account-links/start", {
    method: "POST",
    body: JSON.stringify({ gameName: gameName.trim(), tagLine: tagLine.trim() }),
  });
}

export function verifyAccountLink(challengeId: string, signal?: AbortSignal) {
  return apiFetch<VerifyAccountLinkResult>("/account-links/verify", {
    method: "POST",
    body: JSON.stringify({ challengeId }),
    signal,
  });
}
