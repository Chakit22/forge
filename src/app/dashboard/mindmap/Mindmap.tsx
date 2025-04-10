import React, {
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
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
  ReactFlowInstance,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";

// Define color type for node styling
interface NodeColors {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

// Define the hierarchical node type
type MindmapNode = {
  title: string;
  children: MindmapNode[];
  id?: string;
};

// Define the node and edge types for type safety
type FlowNode = Node<{ label: string; level: number; colors: NodeColors }>;
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
          backgroundColor: "#661818", // Darker red
          borderColor: "#c53030", // Darker red border
          textColor: "#ffffff", // White text
        };
      case 1: // First level children
        return {
          backgroundColor: "#744210", // Darker yellow/brown
          borderColor: "#d69e2e", // Darker yellow border
          textColor: "#ffffff", // White text
        };
      case 2: // Second level
        return {
          backgroundColor: "#22543d", // Darker green
          borderColor: "#48bb78", // Darker green border
          textColor: "#ffffff", // White text
        };
      default: // Deeper levels
        return {
          backgroundColor: "#2a4365", // Darker blue
          borderColor: "#4299e1", // Darker blue border
          textColor: "#ffffff", // White text
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
      fontSize: level === 0 ? 18 : 16, // Increase font size for better readability
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

// Define the custom node component outside the main component
const CustomNode = ({
  data,
}: {
  data: { label: string; level: number; colors: NodeColors };
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
        fontSize: data.level === 0 ? 18 : 16, // Increase font size for better readability
        fontWeight: data.level === 0 ? "bold" : "normal",
      }}
    >
      <div
        className={`${
          data.level === 0
            ? "font-bold text-lg"
            : data.level === 1
            ? "font-semibold text-md"
            : "font-normal text-sm"
        }`}
      >
        {data.label}
      </div>
    </div>
  );
};

// Define nodeTypes outside the component to avoid recreation on each render
const nodeTypes = {
  default: CustomNode,
};

// Legend Component to explain the colors and connection types
const MindmapLegend = () => {
  return (
    <div className="flex flex-col mb-3">
      <div className="text-sm font-semibold mb-2 text-white">
        Mindmap Legend:
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-200 border border-red-400 rounded mr-1"></div>
          <span className="text-xs text-white">Root Topic</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded mr-1"></div>
          <span className="text-xs text-white">Main Categories</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-200 border border-green-400 rounded mr-1"></div>
          <span className="text-xs text-white">Sub-Categories</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded mr-1"></div>
          <span className="text-xs text-white">Details</span>
        </div>
        <div className="border-l border-gray-300 h-5 mx-1"></div>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <span className="text-xs font-bold px-2 py-1 bg-white border border-gray-300 rounded text-gray-700 mr-1">
              ⟹ contains
            </span>
            <span className="text-xs text-white">Parent → Child</span>
          </div>
          <div className="flex items-center">
            <span className="text-xs font-bold px-2 py-1 bg-white border border-gray-300 rounded text-gray-700 mr-1">
              ⟹ includes
            </span>
            <span className="text-xs text-white">Category → Subcategory</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Define a ref interface for external access
export interface MindmapRef {
  getFlowInstance: () => ReactFlowInstance | null;
  getContainer: () => HTMLDivElement | null;
}

// Update the Mindmap component to use forwardRef for external access
const Mindmap = forwardRef<MindmapRef, { mindmapData: MindmapNode }>(
  ({ mindmapData }, ref) => {
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

    // Refs for export functionality
    const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
    const reactFlowContainer = useRef<HTMLDivElement | null>(null);

    // Expose methods to parent components
    useImperativeHandle(ref, () => ({
      getFlowInstance: () => reactFlowInstance.current,
      getContainer: () => reactFlowContainer.current,
    }));

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
            ref={reactFlowContainer}
            style={{
              width: "100%",
              height: "500px",
              border: "1px solid #333", // Darker border
              borderRadius: "8px",
              backgroundColor: "#1a202c", // Dark background
              backgroundImage: "radial-gradient(#2d3748 1px, transparent 1px)", // Darker dots
              backgroundSize: "20px 20px",
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              onInit={(instance) => {
                reactFlowInstance.current = instance;
              }}
              fitView
              fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
              minZoom={0.2} // Lower minimum zoom to see more of the graph
              maxZoom={2} // Higher maximum zoom to see details
              nodesDraggable={true}
              panOnScroll={true}
              panOnDrag={true}
              zoomOnScroll={true}
              zoomOnPinch={true} // Enable pinch zoom for touch devices
              zoomOnDoubleClick={true} // Enable double-click to zoom
              nodesConnectable={false}
              elementsSelectable={true}
              connectionLineType={ConnectionLineType.Straight}
              defaultEdgeOptions={{
                type: "straight",
                animated: false,
                style: { strokeWidth: 3, stroke: "#718096" }, // Add stroke color
                labelBgPadding: [8, 4],
                labelBgBorderRadius: 4,
                labelShowBg: true,
                labelBgStyle: {
                  fill: "#2d3748", // Darker background
                  fillOpacity: 0.95,
                  stroke: "#4a5568", // Darker stroke
                  strokeWidth: 1.5,
                },
                labelStyle: {
                  fill: "#e2e8f0", // Light gray text
                  fontWeight: 700,
                  fontSize: 14,
                },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: "#718096", // Medium gray
                  width: 20,
                  height: 20,
                },
              }}
              edgesUpdatable={true}
              edgesFocusable={true}
            >
              <Controls showInteractive={true} />
              <MiniMap
                nodeStrokeWidth={3}
                zoomable
                pannable
                nodeColor={(node) => {
                  return node.data.colors?.backgroundColor || "#2d3748"; // Darker fallback
                }}
                maskColor="rgba(0, 0, 0, 0.5)" // Semi-transparent black
              />
              <Background
                color="#4a5568" // Darker gray dots
                gap={16}
                variant={BackgroundVariant.Dots}
              />
            </ReactFlow>
          </div>
        </ReactFlowProvider>
      </div>
    );
  }
);

Mindmap.displayName = "Mindmap";

export default Mindmap;
