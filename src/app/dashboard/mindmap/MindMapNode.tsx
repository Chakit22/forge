import React, { useRef, useEffect, useLayoutEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";

import useStore from "./mindmapStore";

// Custom node component for the mindmap
function MindMapNode({ id, data }: NodeProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const updateNodeLabel = useStore((state) => state.updateNodeLabel);

  // Adjust input width based on content
  useLayoutEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.width = `${Math.max(data.label.length * 8, 50)}px`;
    }
  }, [data.label.length]);

  // Focus on newly created nodes
  useEffect(() => {
    // Check if this is a new node by seeing if the label is the default
    if (data.label === "New Node" && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [data.label]);

  return (
    <>
      <div className="mindmap-node-container">
        <div className="mindmap-drag-handle">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path
              fill="#ffffff"
              stroke="#ffffff"
              strokeWidth="1"
              d="M15 5h2V3h-2v2zM7 5h2V3H7v2zm8 8h2v-2h-2v2zm-8 0h2v-2H7v2zm8 8h2v-2h-2v2zm-8 0h2v-2H7v2z"
            />
          </svg>
        </div>
        <input
          ref={inputRef}
          value={data.label}
          onChange={(evt) => updateNodeLabel(id, evt.target.value)}
          className="mindmap-node-input"
        />
      </div>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export default MindMapNode;
