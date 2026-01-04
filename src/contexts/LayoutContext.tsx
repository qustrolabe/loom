import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type LayoutContextType = {
  leftSidebarOpen: boolean;
  rightChatOpen: boolean;
  rightSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightChat: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightChatOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
};

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem("layout-left-sidebar-open");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [rightChatOpen, setRightChatOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem("layout-right-chat-open");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem("layout-right-sidebar-open");
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("layout-left-sidebar-open", JSON.stringify(leftSidebarOpen));
  }, [leftSidebarOpen]);

  useEffect(() => {
    localStorage.setItem("layout-right-chat-open", JSON.stringify(rightChatOpen));
  }, [rightChatOpen]);

  useEffect(() => {
    localStorage.setItem("layout-right-sidebar-open", JSON.stringify(rightSidebarOpen));
  }, [rightSidebarOpen]);

  const toggleLeftSidebar = () => setLeftSidebarOpen((prev) => !prev);
  const toggleRightChat = () => setRightChatOpen((prev) => !prev);
  const toggleRightSidebar = () => setRightSidebarOpen((prev) => !prev);

  return (
    <LayoutContext.Provider
      value={{
        leftSidebarOpen,
        rightChatOpen,
        rightSidebarOpen,
        toggleLeftSidebar,
        toggleRightChat,
        toggleRightSidebar,
        setLeftSidebarOpen,
        setRightChatOpen,
        setRightSidebarOpen,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
