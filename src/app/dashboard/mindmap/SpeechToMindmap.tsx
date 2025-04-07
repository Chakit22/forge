"use client";

import { useState, useRef } from "react";
import Mindmap from "./Mindmap";
import { ChevronDown, ChevronUp, FileJson, ListTree } from "lucide-react";

// Define the hierarchical node type
type MindmapNode = {
  title: string;
  children: MindmapNode[];
  id?: string;
};

// Function to render hierarchical text representation
const renderHierarchicalText = (node: MindmapNode, level = 0) => {
  const indent = "  ".repeat(level);
  const bulletSymbol =
    level === 0 ? "● " : level === 1 ? "○ " : level === 2 ? "■ " : "□ ";

  return (
    <div className="whitespace-pre-wrap">
      <div
        className={`${
          level === 0
            ? "font-bold text-red-700"
            : level === 1
            ? "font-semibold text-yellow-700"
            : level === 2
            ? "text-green-700"
            : "text-blue-700"
        }`}
      >
        {indent}
        {bulletSymbol}
        {node.title}
      </div>
      {node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child, index) => (
            <div key={index}>{renderHierarchicalText(child, level + 1)}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function SpeechToMindmap() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [mindmapData, setMindmapData] = useState<MindmapNode>({
    title: "Main Topic",
    children: [],
  });
  const [showJson, setShowJson] = useState(true);
  const [showHierarchy, setShowHierarchy] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const contextWindowRef = useRef<string[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        chunksRef.current = [];
      };

      // Start recording in segments
      mediaRecorder.start();
      setIsRecording(true);

      // Process in chunks every 5 seconds
      const interval = setInterval(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start();
        } else {
          clearInterval(interval);
        }
      }, 5000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Create a FormData object to send the audio file
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");

      // Send the audio to OpenAI Whisper API
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const data = await response.json();
      const newTranscript = data.text;

      // Update transcript
      setTranscript((prev) => prev + " " + newTranscript);

      // Add to context window (last few chunks)
      contextWindowRef.current = [
        ...contextWindowRef.current,
        newTranscript,
      ].slice(-3);

      // Process transcript for mindmap
      await updateMindmap(newTranscript);
    } catch (error) {
      console.error("Error processing audio:", error);
    }
  };

  const updateMindmap = async (textToProcess: string) => {
    try {
      // Don't process empty text
      if (!textToProcess.trim()) return;

      // Send transcript to OpenAI for hierarchical structure
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: textToProcess,
          context: contextWindowRef.current,
        }),
      });

      if (!response.ok) {
        throw new Error("Summarization failed");
      }

      const data = await response.json();

      // Only update if we have valid mindmap data
      if (data.mindmapData && data.mindmapData.title) {
        // For simplicity in this example, we're replacing the entire structure
        setMindmapData(data.mindmapData);
      }
    } catch (error) {
      console.error("Error updating mindmap:", error);
    }
  };

  // Manual processing of transcript - for testing
  const processTranscript = () => {
    if (transcript.trim()) {
      // Use the current transcript for processing
      updateMindmap(transcript);
    }
  };

  return (
    <div className="flex flex-col space-y-6 max-w-6xl mx-auto">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-800">Speech to Mindmap</h1>
        <p className="text-sm text-gray-600">
          Convert your spoken ideas into a visual mindmap and explore different
          output formats
        </p>
      </div>

      {/* Input Section */}
      <div className="border rounded overflow-hidden shadow-sm">
        <div className="bg-gray-50 p-3 flex justify-between items-center border-b">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2 text-blue-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
            <h2 className="text-sm font-semibold">Speech Input</h2>
          </div>
          <div>
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs mr-2"
              >
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs mr-2"
              >
                Stop Recording
              </button>
            )}
            <button
              onClick={processTranscript}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-xs"
            >
              Process Text
            </button>
          </div>
        </div>
        {/* Make the transcript editable with a textarea */}
        <textarea
          className="bg-gray-100 p-4 w-full overflow-y-auto h-[150px]"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Your transcript will appear here or type directly to test..."
        />
      </div>

      {/* Visualization Section */}
      <div className="border rounded overflow-hidden shadow-sm">
        <div className="bg-gray-50 p-3 flex justify-between items-center border-b">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2 text-purple-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            <h2 className="text-sm font-semibold">Mindmap Visualization</h2>
          </div>
        </div>

        <div className="p-4 bg-white">
          {/* Use the Mindmap component here */}
          {mindmapData.title ? (
            <Mindmap mindmapData={mindmapData} />
          ) : (
            <div className="bg-gray-100 p-4 rounded h-[200px] flex items-center justify-center">
              <p className="text-gray-500">
                Mindmap will appear here as you speak or process text...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Output Formats Section */}
      <div className="border rounded overflow-hidden shadow-sm">
        <div className="bg-gray-50 p-3 border-b">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2 text-green-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <h2 className="text-sm font-semibold">Output Formats</h2>
          </div>
        </div>

        <div className="space-y-4 p-4 bg-white">
          {/* Raw JSON display with collapsible section */}
          <div className="border rounded overflow-hidden">
            <button
              onClick={() => setShowJson(!showJson)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
            >
              <div className="flex items-center">
                <FileJson className="h-4 w-4 mr-2 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-700">
                  Raw JSON Structure
                </h3>
              </div>
              {showJson ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showJson && (
              <pre className="text-xs bg-gray-100 p-3 overflow-auto h-[250px] border-t">
                {JSON.stringify(mindmapData, null, 2)}
              </pre>
            )}
          </div>

          {/* Hierarchical text representation with collapsible section */}
          <div className="border rounded overflow-hidden">
            <button
              onClick={() => setShowHierarchy(!showHierarchy)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
            >
              <div className="flex items-center">
                <ListTree className="h-4 w-4 mr-2 text-green-500" />
                <h3 className="text-sm font-semibold text-gray-700">
                  Hierarchical Text View
                </h3>
              </div>
              {showHierarchy ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showHierarchy && (
              <div className="text-xs bg-gray-100 p-3 overflow-auto h-[250px] font-mono border-t">
                {renderHierarchicalText(mindmapData)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
