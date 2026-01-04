import * as React from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootComponent,
});

import { LayoutProvider } from "@/contexts/LayoutContext.tsx";
import { ConversationProvider } from "@/contexts/ConversationContext.tsx";
import CommandPalette from "@/components/CommandPalette.tsx";

import ActivityBar from "@/components/ActivityBar.tsx";
import LeftSidebarContainer from "@/components/LeftSidebarContainer.tsx";
import RightSidebarContainer from "@/components/RightSidebarContainer.tsx";

function RootComponent() {
  return (
    <React.Fragment>
      <ConversationProvider>
        <LayoutProvider>
          <ActivityBar />
          <LeftSidebarContainer />
          <RightSidebarContainer />
          <CommandPalette />
          <Outlet />
        </LayoutProvider>
      </ConversationProvider>
    </React.Fragment>
  );
}
