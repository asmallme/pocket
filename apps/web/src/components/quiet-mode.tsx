"use client";

import { createContext, useContext } from "react";

const QuietModeContext = createContext(false);

export function QuietModeProvider({
  quiet,
  children,
}: {
  quiet: boolean;
  children: React.ReactNode;
}) {
  return (
    <QuietModeContext.Provider value={quiet}>{children}</QuietModeContext.Provider>
  );
}

export function useQuietMode() {
  return useContext(QuietModeContext);
}
