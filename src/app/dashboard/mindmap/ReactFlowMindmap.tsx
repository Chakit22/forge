import React, { useRef, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Panel,
  useReactFlow,
  ConnectionLineType,
  Background,
  BackgroundVariant,
  MiniMap,
} from "reactflow";
import { shallow } from "zustand/shallow";

import useStore from "./mindmapStore";
import MindMapNode from "./MindMapNode";
import MindMapEdge from "./MindMapEdge";

// Import React Flow styles
import "reactflow/dist/style.css";

// Node types definition for our custom nodes
const nodeTypes = {
  mindmap: MindMapNode,
};

// Edge types definition for our custom edges
const edgeTypes = {
  mindmap: MindMapEdge,
};

// Styling configuration
const connectionLineStyle = { stroke: "#F6AD55", strokeWidth: 3 };
const defaultEdgeOptions = {
  style: connectionLineStyle,
  type: "mindmap",
};

function ReactFlowMindmap({ onExport }) {
  // Get state from store using selector to avoid unnecessary rerenders
  const { nodes, edges, onNodesChange, onEdgesChange, addChildNode } = useStore(
    (state) => ({
      nodes: state.nodes,
      edges: state.edges,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      addChildNode: state.addChildNode,
    }),
    shallow
  );

  const connectingNodeId = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  // Handler for when connection drag starts
  const onConnectStart = useCallback((_, { nodeId }) => {
    connectingNodeId.current = nodeId;
  }, []);

  // Handler for when connection drag ends
  const onConnectEnd = useCallback(
    (event) => {
      if (!connectingNodeId.current) return;

      const targetIsPane = event.target.classList.contains("react-flow__pane");

      if (targetIsPane) {
        // Get position from mouse event
        const { top, left } = event.target.getBoundingClientRect();
        const position = screenToFlowPosition({
          x: event.clientX - left,
          y: event.clientY - top,
        });

        // Add new node connected to the source node
        addChildNode(connectingNodeId.current, position);
      }

      connectingNodeId.current = null;
    },
    [screenToFlowPosition, addChildNode]
  );

  // Handle export
  const reactFlowWrapper = useRef(null);
  const onDownloadImage = useCallback(() => {
    if (onExport && reactFlowWrapper.current) {
      onExport(reactFlowWrapper.current);
    }
  }, [onExport]);

  return (
    <div
      className="reactflow-wrapper"
      ref={reactFlowWrapper}
      style={{ height: "100%", width: "100%" }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineStyle={connectionLineStyle}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.Straight}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodeOrigin={[0.5, 0.5]}
        minZoom={0.2}
        maxZoom={2}
      >
        <Controls showInteractive={false} className="controls-dark" />
        <MiniMap
          nodeColor={(node) => {
            switch (node.data.depth) {
              case 0:
                return "#BE3A3A";
              case 1:
                return "#CA9F3B";
              case 2:
                return "#2E8B57";
              default:
                return "#3B82F6";
            }
          }}
          maskColor="rgba(0, 0, 0, 0.5)"
          className="minimap-dark"
        />
        <Background color="#4a5568" gap={16} variant={BackgroundVariant.Dots} />
        <Panel position="top-left" className="header text-white">
          React Flow Mind Map
        </Panel>
        <Panel position="top-right">
          <button
            onClick={onDownloadImage}
            className="export-button bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs flex items-center"
          >
            Export Image
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Export with provider to ensure hooks work properly
export default function MindMapWithProvider(props) {
  return (
    <ReactFlow.ReactFlowProvider>
      <ReactFlowMindmap {...props} />
    </ReactFlow.ReactFlowProvider>
  );
}
