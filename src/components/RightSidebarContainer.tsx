import { useLayout } from "@/contexts/LayoutContext.tsx";
import ChatContent from "@/components/ChatPanel.tsx";
import { AiOutlineArrowLeft } from "react-icons/ai";

export default function RightSidebarContainer() {
  const {
    rightSidebarOpen,
    toggleRightSidebar,
  } = useLayout();

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-end">
      {/* Unified Right Sidebar (Chat) */}
      <div
        className={`pointer-events-auto fixed top-0 right-0 bottom-0 w-[600px] border-l border-panel-border bg-panel shadow-xl transition-transform duration-300 ${
          rightSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <ChatContent
          className=""
          onToggleChat={toggleRightSidebar}
          onToggleSidebar={toggleRightSidebar} // Functionality merged
          isSidebarOpen // Always "sidebar" context
        />
      </div>

      {/* Floating Toggle Button - Only when Sidebar is Closed */}
      <button
        type="button"
        onClick={toggleRightSidebar}
        className={`pointer-events-auto fixed top-2 right-2 z-50 flex h-10 w-10 items-center justify-center rounded-4xl border border-panel-border bg-panel transition-all duration-300 hover:brightness-150 ${
          !rightSidebarOpen
            ? "opacity-100 scale-100"
            : "opacity-0 scale-50 pointer-events-none"
        }`}
        title="Open Chat"
      >
        <AiOutlineArrowLeft />
      </button>
    </div>
  );
}
