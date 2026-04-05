import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type SetListingFn = (block: string | null) => void;

const ChatListingContext = createContext<{
  listingContext: string | null;
  setListingContext: SetListingFn;
} | null>(null);

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

export function useChatListingContext() {
  const ctx = useContext(ChatListingContext);
  if (!ctx) {
    throw new Error("useChatListingContext must be used within ChatListingProvider");
  }
  return ctx;
}
