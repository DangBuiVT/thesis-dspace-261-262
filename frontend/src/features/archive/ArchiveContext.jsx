import { createContext, useContext } from "react";
export const ArchiveContext = createContext(null);
export function useArchive() {
  const context = useContext(ArchiveContext);
  if (!context) throw new Error("ArchiveProvider is required");
  return context;
}
