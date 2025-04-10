import React from "react";
import { BaseEdge, EdgeProps, getSmoothStepPath } from "reactflow";

// Custom edge component for the mindmap
function MindMapEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } =
    props;

  // Calculate the edge path using smooth steps
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  return (
    <BaseEdge
      path={edgePath}
      {...props}
      style={{ ...props.style, strokeWidth: 2, stroke: "#F6AD55" }}
    />
  );
}

export default MindMapEdge;
