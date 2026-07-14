import "client-only";

import { apiFetch } from "@/lib/api";

export type Player = {
  puuid: string;
  gameName: string;
  tagLine: string;
  trustScore: number;
  createdAt: string;
  updatedAt: string;
};

export function getPlayer(gameName: string, tagLine: string) {
  const encodedGameName = encodeURIComponent(gameName.trim());
  const encodedTagLine = encodeURIComponent(tagLine.trim());

  return apiFetch<Player>(`/players/${encodedGameName}/${encodedTagLine}`);
}
