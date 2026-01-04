import { createFileRoute } from "@tanstack/react-router";
import LoomCanvas from "../components/Canvas.tsx";

// import LeftSidebarContainer from "@/components/LeftSidebarContainer.tsx";
// import RightSidebarContainer from "@/components/RightSidebarContainer.tsx";

export const Route = createFileRoute("/editor")({
  component: Editor,
});

function Editor() {
  return (
    <div className="h-full w-full">
      {/* <LeftSidebarContainer /> */}
      {/* <RightSidebarContainer /> */}
      <LoomCanvas />
    </div>
  );
}
