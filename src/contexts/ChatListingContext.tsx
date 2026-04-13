/**
 * @file ChatListingContext.tsx
 * Lightweight context that lets any component inject a "listing context" string
 * (e.g., a job description block) into the AI chat widget so the assistant can
 * answer questions about the listing the user is currently viewing.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type SetListingFn = (block: string | null) => void;

const ChatListingContext = createContext<{
  listingContext: string | null;
  setListingContext: SetListingFn;
} | null>(null);

/**
 * Provider that holds a nullable listing context string.
 * Wrap this around the router so any page can set listing context for the chat widget.
 */
export function ChatListingProvider({ children }: { children: ReactNode }) {
  const [listingContext, setListingState] = useState<string | null>(null);

  const setListingContext = useCallback((block: string | null) => {
    setListingState(block);
  }, []);

  const value = useMemo(
    () => ({ listingContext, setListingContext }),
    [listingContext, setListingContext],
  );

  return <ChatListingContext.Provider value={value}>{children}</ChatListingContext.Provider>;
}

/**
 * Consumes the listing context. Throws if used outside `ChatListingProvider`.
 * @returns `{ listingContext, setListingContext }` — the current context string and its setter.
 */
export function useChatListingContext() {
  const ctx = useContext(ChatListingContext);
  if (!ctx) {
    throw new Error("useChatListingContext must be used within ChatListingProvider");
  }
  return ctx;
}
