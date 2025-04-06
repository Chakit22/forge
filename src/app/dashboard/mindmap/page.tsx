"use client";

import { useState } from "react";
import SpeechToMindmap from "./SpeechToMindmap";

export default function MindmapPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Speech to Hierarchical Notes</h1>
      <p className="mb-4">
        Start speaking and watch your ideas transform into structured
        hierarchical notes
      </p>
      <SpeechToMindmap />
    </div>
  );
}
