import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { useConversation } from "@/contexts/ConversationContext";
import { MessageNode } from "@/schemas/schemas";

interface TreeNode {
  id: string;
  parentId: string | null;
  children?: TreeNode[];
  data: MessageNode;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;

export default function LoomCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const {
    currentConversation,
    selectedNodeId,
    selectNode,
  } = useConversation();

  // Convert messageNodes to tree hierarchy
  const treeData = useMemo(() => {
    if (!currentConversation) return null;

    const nodes = Object.values(currentConversation.messageNodes);
    if (nodes.length === 0) return null;

    // Find root node
    const rootNode = nodes.find((n) => n.parentId === null);
    if (!rootNode) return null;

    // Build tree recursively
    const buildTree = (node: MessageNode): TreeNode => {
      const children = nodes.filter((n) => n.parentId === node.id);
      return {
        id: node.id,
        parentId: node.parentId,
        data: node,
        children: children.length > 0 ? children.map(buildTree) : undefined,
      };
    };

    return buildTree(rootNode);
  }, [currentConversation]);

  // Get path from root to selected node for highlighting
  const selectedPath = useMemo(() => {
    if (!currentConversation || !selectedNodeId) return new Set<string>();

    const path = new Set<string>();
    let currentId: string | null = selectedNodeId;
    while (currentId) {
      path.add(currentId);
      const node: MessageNode = currentConversation.messageNodes[currentId];
      currentId = node?.parentId ?? null;
    }
    return path;
  }, [currentConversation, selectedNodeId]);

  // Initialize zoom behavior
  useEffect(() => {
    if (!svgRef.current || !gRef.current || !wrapperRef.current) return;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        d3.select(gRef.current).attr("transform", event.transform);
        d3.select("#grid-pattern").attr("patternTransform", event.transform);
      });

    const selection = d3.select(svgRef.current).call(zoom);

    const { width } = wrapperRef.current.getBoundingClientRect();
    const initialTransform = d3.zoomIdentity.translate(width / 2, 50).scale(
      1.0,
    );
    selection.call(zoom.transform, initialTransform);
  }, []);

  // Render tree
  useEffect(() => {
    if (!gRef.current || !treeData) return;

    const g = d3.select(gRef.current);

    // Clear previous content
    g.selectAll(".tree-content").remove();

    const treeGroup = g.append("g").attr("class", "tree-content");

    // Create tree layout with more spacing for rectangles
    const treeLayout = d3.tree<TreeNode>()
      .nodeSize([NODE_WIDTH + 20, NODE_HEIGHT + 40])
      .separation(() => 1.2);

    const root = d3.hierarchy(treeData);
    const treeNodes = treeLayout(root);

    // Draw links
    treeGroup.selectAll(".link")
      .data(treeNodes.links())
      .join("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", (d) => {
        const isInPath = selectedPath.has(d.source.data.id) &&
          selectedPath.has(d.target.data.id);
        return isInPath
          ? "var(--color-accent, #6366f1)"
          : "var(--color-panel-border)";
      })
      .attr("stroke-width", (d) => {
        const isInPath = selectedPath.has(d.source.data.id) &&
          selectedPath.has(d.target.data.id);
        return isInPath ? 3 : 2;
      })
      .attr(
        "d",
        d3.linkVertical<
          d3.HierarchyPointLink<TreeNode>,
          d3.HierarchyPointNode<TreeNode>
        >()
          .x((d) => d.x)
          .y((d) => d.y),
      );

    // Draw nodes
    const nodeGroups = treeGroup.selectAll(".node")
      .data(treeNodes.descendants())
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("click", (_event, d) => {
        selectNode(d.data.id);
      });

    // Node rectangles (rounded)
    nodeGroups.append("rect")
      .attr("x", -NODE_WIDTH / 2)
      .attr("y", -NODE_HEIGHT / 2)
      .attr("width", NODE_WIDTH)
      .attr("height", NODE_HEIGHT)
      .attr("rx", 12)
      .attr("ry", 12)
      .attr("fill", (d) => {
        if (d.data.id === selectedNodeId) return "var(--color-accent, #6366f1)";
        if (selectedPath.has(d.data.id)) return "var(--color-panel-2)";
        return "var(--color-panel)";
      })
      .attr("stroke", (d) => {
        if (d.data.id === selectedNodeId) return "var(--color-accent, #6366f1)";
        if (selectedPath.has(d.data.id)) return "var(--color-accent, #6366f1)";
        return "var(--color-panel-border)";
      })
      .attr("stroke-width", (d) => d.data.id === selectedNodeId ? 3 : 2);

    // Role label (small tag at top)
    nodeGroups.append("text")
      .attr("y", -NODE_HEIGHT / 2 + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", (d) => {
        if (d.data.id === selectedNodeId) return "rgba(255,255,255,0.8)";
        return "var(--color-panel-border)";
      })
      .text((d) => {
        const data = d.data.data;
        if (data.role === "user") return "USER";
        if (data.role === "assistant") return "AI";
        if (data.role === "text") return ""; // hidden for base
        if (!data.content) return "ROOT";
        return "SYS";
      });

    // Message preview (multi-line)
    nodeGroups.each(function (d) {
      const group = d3.select(this);
      const data = d.data.data;
      const isSelected = d.data.id === selectedNodeId;

      if (!data.content) {
        // Root node - show icon
        group.append("text")
          .attr("y", 5)
          .attr("text-anchor", "middle")
          .attr("font-size", "20px")
          .attr("fill", isSelected ? "white" : "currentColor")
          .text("⊙");
      } else {
        // Content preview - truncate to 2 lines
        const preview = data.content.slice(0, 40);
        const lines = [];
        if (preview.length <= 20) {
          lines.push(preview);
        } else {
          lines.push(preview.slice(0, 20));
          lines.push(
            preview.slice(20, 40) + (data.content.length > 40 ? "…" : ""),
          );
        }

        lines.forEach((line, i) => {
          group.append("text")
            .attr("y", i * 14)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("fill", isSelected ? "white" : "currentColor")
            .text(line);
        });
      }
    });

    // Add tooltip text on hover
    nodeGroups.append("title")
      .text((d) => {
        const data = d.data.data;
        if (!data.content) return "Root (start branching here)";
        const preview = data.content.slice(0, 100) +
          (data.content.length > 100 ? "..." : "");
        return `${data.role}: ${preview}`;
      });
  }, [treeData, selectedNodeId, selectedPath, selectNode]);

  return (
    <div ref={wrapperRef} className="h-full bg-main-background">
      <svg ref={svgRef} className="h-full w-full">
        <defs>
          <pattern
            id="grid-pattern"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="2"
              cy="2"
              r="2"
              fill="var(--color-panel-border, #e2e8f0)"
              opacity="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        <g ref={gRef} />
      </svg>

      {/* Empty state */}
      {!currentConversation && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">No conversation selected</p>
            <p className="text-sm">
              Select or create a conversation from the left sidebar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
