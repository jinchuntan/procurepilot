"use client";

import { createContext, useContext } from "react";

export type Location = "Malaysia" | "Singapore";

export const LocationContext = createContext<Location>("Malaysia");

export function useLocation() {
  return useContext(LocationContext);
}
