import { createContext, useContext } from "react";
export const SubmissionContext = createContext(null);
export function useSubmissions() {
  const context = useContext(SubmissionContext);
  if (!context)
    throw new Error("Submission components require SubmissionProvider");
  return context;
}
