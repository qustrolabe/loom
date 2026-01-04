import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useLayout } from "@/contexts/LayoutContext.tsx";
import { useTheme } from "@/contexts/ThemeContext.tsx";
import { LuMoon, LuPanelLeft, LuPanelRight, LuSun } from "react-icons/lu";
import "./CommandPalette.css";

// import { Dialog } from "radix-ui";

export default function CommandPaletteComponent() {
  const [open, setOpen] = useState(false);
  const { toggleLeftSidebar, toggleRightSidebar } = useLayout();
  const { theme, setTheme } = useTheme();

  // Handle Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="command-palette"
      aria-description="Global Command Menu"
    >
      {/* <Dialog.Title>Global Command Menu</Dialog.Title> */}
      <Command.Input placeholder="Type a command or search..." autoFocus />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>

        <Command.Group heading="Layout">
          <Command.Item onSelect={() => toggleLeftSidebar()}>
            <LuPanelLeft className="mr-2 h-4 w-4" />
            <span>Toggle Left Sidebar</span>
          </Command.Item>

          <Command.Item onSelect={() => toggleRightSidebar()}>
            <LuPanelRight className="mr-2 h-4 w-4" />
            <span>Toggle Right Sidebar</span>
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Appearance">
          <Command.Item
            onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark"
              ? <LuSun className="mr-2 h-4 w-4" />
              : <LuMoon className="mr-2 h-4 w-4" />}
            <span>Toggle Dark Mode</span>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
