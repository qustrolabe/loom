import { DirEntry, readDir } from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useMemo, useRef, useState } from "react";

// --- Types ---
interface FileWithAspect extends DirEntry {
  path: string;
  aspectRatio: number;
  src: string;
}

interface Row {
  files: FileWithAspect[];
  height: number;
  top: number;
}

// --- Configuration ---
const TARGET_ROW_HEIGHT = 200; // The ideal height you want for rows
const ROW_GAP = 8; // Gap between images in pixels

export function ImageGallery() {
  const [files, setFiles] = useState<FileWithAspect[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [dirPath, setDirPath] = useState<string | null>(null);

  // Virtualization State
  const [scrollTop, setScrollTop] = useState(0);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  const handleOpenFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        recursive: true,
      });

      if (selected && typeof selected === "string") {
        setDirPath(selected);
      }
    } catch (err) {
      console.error("Error opening folder selection:", err);
    }
  };

  // 1. Load Files and Calculate Aspect Ratios
  useEffect(() => {
    const loadFiles = async () => {
      if (!dirPath) {
        setFiles([]);
        return;
      }

      try {
        const entries = await readDir(dirPath);

        // Filter for image extensions just in case
        const imageEntries = entries.filter((entry) =>
          /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(entry.name)
        );

        const processedFiles = await Promise.all(
          imageEntries.map(async (entry) => {
            // Normalize path separators to forward slashes for consistency
            const rawPath = `${dirPath}/${entry.name}`.replace(/\\/g, "/");
            const src = convertFileSrc(rawPath);

            return new Promise<FileWithAspect>((resolve) => {
              const img = new Image();
              img.onload = () => {
                resolve({
                  ...entry,
                  path: rawPath,
                  src: src,
                  aspectRatio: img.width / img.height,
                });
              };
              img.onerror = () => {
                // Fallback for corrupt images
                resolve({
                  ...entry,
                  path: rawPath,
                  src: src,
                  aspectRatio: 1,
                });
              };
              img.src = src;
            });
          }),
        );

        setFiles(processedFiles);
      } catch (error) {
        console.error("Error reading directory:", error);
      }
    };

    loadFiles();
  }, [dirPath]);

  // 2. Measure Container Width
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 3. Window Listeners for Virtualization
  useEffect(() => {
    const handleScroll = () => {
      requestAnimationFrame(() => {
        setScrollTop(window.scrollY);
      });
    };
    
    const handleResize = () => {
      requestAnimationFrame(() => {
        setWindowHeight(window.innerHeight);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    // Initial values
    handleScroll();
    handleResize();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // 4. Pre-Calculate All Rows (Geometry)
  const { rows, totalHeight } = useMemo(() => {
    if (!containerWidth || files.length === 0) {
      return { rows: [], totalHeight: 0 };
    }

    const result: Row[] = [];
    let currentRow: FileWithAspect[] = [];
    let currentAspectRatioSum = 0;
    let currentTop = 0;

    files.forEach((file) => {
      currentRow.push(file);
      currentAspectRatioSum += file.aspectRatio;

      // Calculate width if we used the TARGET_HEIGHT
      const currentWidthRaw = currentAspectRatioSum * TARGET_ROW_HEIGHT;
      // Account for gaps between images (count - 1) * gap
      const totalGapWidth = (currentRow.length - 1) * ROW_GAP;

      // Check if adding this image pushes us past the container width
      if (currentWidthRaw + totalGapWidth >= containerWidth) {
        // Row is full. Calculate the EXACT height needed to fill width perfectly.
        // Formula: (ContainerWidth - Gaps) / SumOfAspectRatios
        const exactHeight = (containerWidth - totalGapWidth) /
          currentAspectRatioSum;

        result.push({
          files: [...currentRow],
          height: exactHeight,
          top: currentTop,
        });

        currentTop += exactHeight + ROW_GAP;

        // Reset for next row
        currentRow = [];
        currentAspectRatioSum = 0;
      }
    });

    // Handle the last "Orphan" row
    if (currentRow.length > 0) {
      result.push({
        files: currentRow,
        height: TARGET_ROW_HEIGHT,
        top: currentTop,
      });
      currentTop += TARGET_ROW_HEIGHT + ROW_GAP;
    }

    return { rows: result, totalHeight: currentTop };
  }, [files, containerWidth]);

  // 5. Calculate Visible Window
  const visibleRows = useMemo(() => {
    // We assume the grid starts somewhere. 
    // To be precise, we should subtract the grid's offsetTop calculate relative scroll.
    // However, a simple buffer usually covers it. 
    
    // Let's try to get the grid's actual offset if possible, but fallback to 0.
    // Since 'scrollTop' is window-based, and 'row.top' is relative to the grid container.
    // RealVisualTop = row.top + (gridRef.current?.offsetTop || 0)
    // We want: RealVisualTop between scrollTop-Buffer and scrollTop+WindowHeight+Buffer
    
    // Optimized: relativeScroll = scrollTop - (gridRef.current?.offsetTop || 0);
    const gridOffset = gridRef.current?.offsetTop || 0;
    const buffer = 1000;
    const min = scrollTop - gridOffset - buffer;
    const max = scrollTop - gridOffset + windowHeight + buffer;

    return rows.filter((row) => {
      const rowBottom = row.top + row.height;
      return rowBottom > min && row.top < max;
    });
  }, [rows, scrollTop, windowHeight]); 

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        padding: "1rem",
        boxSizing: "border-box",
        minHeight: "100vh",
      }}
    >
      <div style={{ marginBottom: "1rem" }}>
        <button
          onClick={handleOpenFolder}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            cursor: "pointer",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {dirPath ? "Change Folder" : "Open Folder"}
        </button>
        {dirPath && (
          <span style={{ marginLeft: "1rem", color: "#666" }}>
            Current: {dirPath}
          </span>
        )}
      </div>

      {!dirPath && (
        <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
          Please select a folder to view images
        </div>
      )}

      {/* Virtualized Container */}
      <div
        ref={gridRef}
        style={{
          position: "relative",
          height: `${totalHeight}px`, // Force scrollbar
          width: "100%",
        }}
      >
        {visibleRows.map((row) => (
          <div
            key={row.top} // 'top' is unique enough for rows
            style={{
              position: "absolute",
              top: `${row.top}px`,
              left: 0,
              width: "100%",
              display: "flex",
              gap: `${ROW_GAP}px`,
              height: `${row.height}px`,
            }}
          >
            {row.files.map((file) => (
              <div
                key={file.name}
                style={{
                  width: `${row.height * file.aspectRatio}px`,
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "4px",
                  backgroundColor: "#f3f4f6",
                }}
              >
                <img
                  src={file.src}
                  alt={file.name}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
