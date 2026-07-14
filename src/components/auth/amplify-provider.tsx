"use client";

import type { ReactNode } from "react";
import "@/lib/amplify";

export function AmplifyProvider({ children }: { children: ReactNode }) {
  return children;
}
