import { createContext, useContext } from "react";
import { useAuthSession } from "./useAuthSession";
const SessionContext = createContext(null);
export function SessionProvider({ children }) {
  const session = useAuthSession();
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("SessionProvider is required");
  return session;
}
