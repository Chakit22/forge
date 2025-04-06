import React, { useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ConnectionLineType,
  MarkerType,
  BackgroundVariant,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";

// Define the hierarchical node type
type MindmapNode = {
  title: string;
  children: MindmapNode[];
  id?: string;
};

// Define the node and edge types for type safety
type FlowNode = Node<{ label: string; level: number; colors: any }>;
type FlowEdge = Edge;

// Function to convert hierarchical data to ReactFlow nodes and edges
const convertToFlowElements = (
  node: MindmapNode,
  parentId: string | null = null,
  level = 0,
  index = 0
): { nodes: FlowNode[]; edges: FlowEdge[] } => {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  // Use the node's existing ID if available, otherwise generate one
  const id = node.id || (parentId ? `${parentId}-${index}` : "root");

  // Calculate node width based on text length (with minimum width)
  const labelLength = node.title.length;
  const nodeWidth = Math.max(150, labelLength * 8);

  // Color coding based on hierarchical level
  const getNodeColorsByLevel = (level: number) => {
    switch (level) {
      case 0: // Root node
        return {
          backgroundColor: "#FED7D7", // Light red
          borderColor: "#FC8181", // Red border
          textColor: "#9B2C2C", // Dark red text
        };
      case 1: // First level children
        return {
          backgroundColor: "#FEEBC8", // Light yellow
          borderColor: "#F6AD55", // Yellow border
          textColor: "#9C4221", // Dark orange text
        };
      case 2: // Second level
        return {
          backgroundColor: "#C6F6D5", // Light green
          borderColor: "#68D391", // Green border
          textColor: "#276749", // Dark green text
        };
      default: // Deeper levels
        return {
          backgroundColor: "#BEE3F8", // Light blue
          borderColor: "#63B3ED", // Blue border
          textColor: "#2C5282", // Dark blue text
        };
    }
  };

  const colors = getNodeColorsByLevel(level);

  // Add node with styling based on its level
  nodes.push({
    id,
    data: {
      label: node.title,
      level,
      colors,
    },
    position: { x: 0, y: 0 }, // Initial position, will be set by dagre
    style: {
      width: nodeWidth,
      padding: 10,
      borderRadius: 8,
      border: `2px solid ${colors.borderColor}`,
      backgroundColor: colors.backgroundColor,
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      color: colors.textColor,
      fontSize: level === 0 ? 16 : 14,
      fontWeight: level === 0 ? "bold" : "normal",
    },
    type: "default",
  });

  // Connect to parent if it exists
  if (parentId) {
    const edgeId = `e-${parentId}-${id}`;
    // Use more descriptive relationship labels that are more visible
    const relationshipLabel =
      level === 1
        ? "⟹ contains"
        : level === 2
        ? "⟹ includes"
        : level >= 3
        ? "⟹ has"
        : "";

    edges.push({
      id: edgeId,
      source: parentId,
      target: id,
      animated: false,
      label: relationshipLabel,
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 4,
      labelShowBg: true,
      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 0.95,
        stroke: colors.borderColor,
        strokeWidth: 1.5,
      },
      labelStyle: {
        fill: "#333",
        fontWeight: 700,
        fontSize: 14,
      },
      style: {
        stroke: colors.borderColor,
        strokeWidth: Math.max(3, 5 - level * 0.5),
      },
      // Using straight lines for better visibility
      type: "straight",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: colors.borderColor,
        width: 20,
        height: 20,
      },
      // Make sure edge passes through the center of nodes
      sourceHandle: null,
      targetHandle: null,
    });
  }

  // Process all children
  node.children.forEach((child, childIndex) => {
    const { nodes: childNodes, edges: childEdges } = convertToFlowElements(
      child,
      id,
      level + 1,
      childIndex
    );
    nodes.push(...childNodes);
    edges.push(...childEdges);
  });

  return { nodes, edges };
};

// Function to apply dagre layout with improved spacing and organization
const getLayoutedElements = (
  nodes: FlowNode[],
  edges: FlowEdge[],
  options = {}
) => {
  // Only process if we have nodes
  if (nodes.length === 0) return { nodes, edges };

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Increase node dimensions for better spacing
  const nodeWidth = 180;
  const nodeHeight = 60;

  // Configure the layout direction and spacing
  dagreGraph.setGraph({
    rankdir: "TB", // Top to Bottom layout
    nodesep: 150, // Increase horizontal spacing between nodes for better readability
    ranksep: 200, // Increase vertical spacing between ranks for edge labels
    ranker: "network-simplex", // Use network simplex algorithm for better layout
    align: "UL", // Align nodes
    ...options,
  });

  // Add nodes to the graph
  nodes.forEach((node) => {
    // Adjust width based on custom node width if available
    const width = node.style?.width ? Number(node.style.width) : nodeWidth;
    dagreGraph.setNode(node.id, { width, height: nodeHeight });
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate the layout
  dagre.layout(dagreGraph);

  // Apply the calculated positions to the nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    // Add a slight random offset to prevent perfect alignment that can look crowded
    const xOffset = node.data.level > 0 ? (Math.random() - 0.5) * 30 : 0;

    return {
      ...node,
      position: {
        x:
          nodeWithPosition.x -
          (nodeWithPosition.width || nodeWidth) / 2 +
          xOffset,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// Custom node component for more control over appearance
const CustomNode = ({
  data,
}: {
  data: { label: string; level: number; colors: any };
}) => {
  return (
    <div
      className="p-3 rounded-lg border shadow-md"
      style={{
        backgroundColor: data.colors.backgroundColor,
        borderColor: data.colors.borderColor,
        color: data.colors.textColor,
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
        transform: "translateZ(0)", // Force hardware acceleration
      }}
    >
      <div
        className={`${
          data.level === 0
            ? "font-bold text-base"
            : data.level === 1
            ? "font-semibold text-sm"
            : "font-normal text-sm"
        }`}
      >
        {data.label}
      </div>
    </div>
  );
};

// Legend Component to explain the colors and connection types
const MindmapLegend = () => {
  return (
    <div className="flex flex-col mb-3">
      <div className="text-sm font-semibold mb-2">Mindmap Legend:</div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-200 border border-red-400 rounded mr-1"></div>
          <span className="text-xs">Root Topic</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded mr-1"></div>
          <span className="text-xs">Main Categories</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-200 border border-green-400 rounded mr-1"></div>
          <span className="text-xs">Sub-Categories</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded mr-1"></div>
          <span className="text-xs">Details</span>
        </div>
        <div className="border-l border-gray-300 h-5 mx-1"></div>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <span className="text-xs font-bold px-2 py-1 bg-white border border-gray-300 rounded text-gray-700 mr-1">
              ⟹ contains
            </span>
            <span className="text-xs">Parent → Child</span>
          </div>
          <div className="flex items-center">
            <span className="text-xs font-bold px-2 py-1 bg-white border border-gray-300 rounded text-gray-700 mr-1">
              ⟹ includes
            </span>
            <span className="text-xs">Category → Subcategory</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// The main Mindmap component
const Mindmap = ({ mindmapData }: { mindmapData: MindmapNode }) => {
  // Define node types for custom rendering
  const nodeTypes = {
    default: CustomNode,
  };

  // Data processing - convert hierarchical data to ReactFlow format once
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!mindmapData || !mindmapData.title) {
      return { nodes: [], edges: [] };
    }

    // Convert hierarchical data to nodes and edges
    const elements = convertToFlowElements(mindmapData);

    // Apply layout immediately
    return getLayoutedElements(elements.nodes, elements.edges);
  }, [mindmapData]);

  // Set up the ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when initial values change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="flex flex-col">
      <MindmapLegend />
      <ReactFlowProvider>
        <div
          style={{
            width: "100%",
            height: "500px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            backgroundColor: "#e9ecef",
            backgroundImage: "radial-gradient(#d6d6d6 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.4}
            maxZoom={1.5}
            nodesDraggable={true}
            panOnScroll={true}
            panOnDrag={true}
            zoomOnScroll={true}
            nodesConnectable={false}
            elementsSelectable={true}
            connectionLineType={ConnectionLineType.Straight}
            defaultEdgeOptions={{
              type: "straight",
              animated: false,
              style: { strokeWidth: 3 },
              labelBgPadding: [8, 4],
              labelBgBorderRadius: 4,
              labelShowBg: true,
              labelBgStyle: {
                fill: "#ffffff",
                fillOpacity: 0.95,
                stroke: "#666",
                strokeWidth: 1.5,
              },
              labelStyle: {
                fill: "#333",
                fontWeight: 700,
                fontSize: 14,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
              },
            }}
            edgesUpdatable={true}
            edgesFocusable={true}
          >
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              nodeColor={(node) => {
                return node.data.colors?.backgroundColor || "#ffffff";
              }}
            />
            <Background
              color="#f0f0f0"
              gap={16}
              variant={BackgroundVariant.Dots}
            />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </div>
  );
};

export default Mindmap;
