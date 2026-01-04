import React, { useState } from "react";
import { AiOutlineMenu, AiOutlineMessage } from "react-icons/ai";
import { Popover } from "radix-ui";
import { useTheme } from "@/contexts/ThemeContext.tsx";
import { Link } from "@tanstack/react-router";
import { useLayout } from "@/contexts/LayoutContext.tsx";

// Helper for menu options
function MenuOption({
  children,
  onClick,
  href,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const base =
    "w-full text-left select-none rounded-md px-3 py-2 text-sm hover:bg-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 transition-colors";

  if (href) {
    return (
      <Link className={`${base} ${className}`} to={href}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${className}`}
    >
      {children}
    </button>
  );
}

// Button item for the activity bar
function ActivityBarItem({
  icon: Icon,
  isActive,
  onClick,
  title,
}: {
  icon: React.ElementType;
  isActive?: boolean;
  onClick?: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex h-8 w-8 items-center justify-center rounded-xl transition-all hover:bg-panel-2 ${
        isActive ? "text-primary" : "text-gray-400 hover:text-gray-100"
      }`}
      title={title}
    >
      <Icon className="h-6 w-6" />
      {isActive && (
        <div className="absolute top-3 bottom-3 left-0 w-1 rounded-r-full bg-primary" />
      )}
    </button>
  );
}

export default function ActivityBar() {
  const { leftSidebarOpen, toggleLeftSidebar } = useLayout();
  const { theme, setTheme } = useTheme();

  // Settings Menu Logic
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="fixed top-0 bottom-0 left-0 z-50 flex w-10 flex-col justify-between border-panel-border border-r bg-panel py-2">
      {/* Top Section - Navigation */}
      <div className="flex flex-col items-center gap-2">
        <ActivityBarItem
          icon={AiOutlineMessage}
          title="Conversations"
          isActive={leftSidebarOpen}
          onClick={toggleLeftSidebar}
        />
        {/* Placeholder for future sections */}
      </div>

      {/* Bottom Section - Settings/User */}
      <div className="flex flex-col items-center gap-2 pb-2">
        <Popover.Root open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all hover:bg-panel-2 ${
                isSettingsOpen ? "bg-panel-2 text-gray-100" : "text-gray-400"
              }`}
              title="Settings & Menu"
            >
              <AiOutlineMenu className="h-5 w-5" />
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              align="start"
              side="right"
              sideOffset={10}
              className="z-60"
            >
              <div className="w-60 overflow-hidden border border-panel-border bg-panel p-1 shadow-2xl">
                {/* User Profile Stub */}
                <div className="mb-1 rounded-lg bg-panel-2 p-3">
                  <div className="text-center font-medium text-sm">
                    USER USER USER
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <MenuOption
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    Theme: {theme === "light" ? "Light" : "Dark"}
                  </MenuOption>

                  <div className="my-1 h-px bg-panel-border" />

                  <MenuOption href="/">Root</MenuOption>
                  <MenuOption href="/editor">Editor</MenuOption>
                  <MenuOption href="/testing_gallery">
                    Testing Gallery
                  </MenuOption>
                  {/* <MenuOption href="/prompt_manager">Prompt Manager</MenuOption> */}
                  <MenuOption href="/debug">Debug</MenuOption>
                </div>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
  );
}
