"use client";

import SpeechToMindmap from "./SpeechToMindmap";

export default function MindmapPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-white">
        Speech to Hierarchical Notes
      </h1>
      <p className="mb-4 text-gray-300 text-lg">
        Start speaking and watch your ideas transform into structured
        hierarchical notes
      </p>
      <SpeechToMindmap />
    </div>
  );
}
