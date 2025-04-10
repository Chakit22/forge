"use client";

import { useState, useRef, useEffect } from "react";
import Mindmap, { MindmapRef } from "./Mindmap";
import {
  ChevronDown,
  ChevronUp,
  FileJson,
  ListTree,
  Loader,
  Mic,
  MessageSquare,
  PenTool,
  MinusSquare,
  PlusSquare,
} from "lucide-react";

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
            ? "font-bold text-red-400"
            : level === 1
            ? "font-semibold text-yellow-400"
            : level === 2
            ? "text-green-400"
            : "text-blue-400"
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

// Simple function to create a plain-text representation of the mindmap
const plainTextMindmap = (node: MindmapNode, level = 0): string => {
  const indent = "  ".repeat(level);
  const bulletSymbol =
    level === 0 ? "● " : level === 1 ? "○ " : level === 2 ? "■ " : "□ ";

  let result = `${indent}${bulletSymbol}${node.title}\n`;

  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => {
      result += plainTextMindmap(child, level + 1);
    });
  }

  return result;
};

export default function SpeechToMindmap() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [mindmapData, setMindmapData] = useState<MindmapNode>({
    title: "Main Topic",
    children: [],
  });

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [transcriptProcessing, setTranscriptProcessing] = useState(false);
  const [notesProcessing, setNotesProcessing] = useState(false);
  const [mindmapProcessing, setMindmapProcessing] = useState(false);

  // Refs
  const mindmapRef = useRef<MindmapRef>(null);

  // Collapsible sections state
  const [sectionsOpen, setSectionsOpen] = useState({
    audioInput: true,
    notes: true,
    mindmap: true,
  });

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen({
      ...sectionsOpen,
      [section]: !sectionsOpen[section],
    });
  };

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

      // Process in chunks every 2 seconds
      const interval = setInterval(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start();
        } else {
          clearInterval(interval);
        }
      }, 2000);
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

      setTranscriptProcessing(true);
      setProcessingStage("Converting speech to text...");

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

      setProcessingStage("");
      setTranscriptProcessing(false);

      // We no longer automatically process the transcript here
      // The user will click the Process Text button to process it
    } catch (error) {
      console.error("Error processing audio:", error);
      setProcessingStage("");
      setTranscriptProcessing(false);
    }
  };

  const updateMindmap = async (textToProcess: string) => {
    try {
      // Don't process empty text
      if (!textToProcess.trim()) return;

      setIsProcessing(true);
      setNotesProcessing(true);
      setProcessingStage("Generating hierarchical structure...");

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

      setNotesProcessing(false);
      setMindmapProcessing(true);
      setProcessingStage("Updating mindmap visualization...");

      // Only update if we have valid mindmap data
      if (data.mindmapData && data.mindmapData.title) {
        // For simplicity in this example, we're replacing the entire structure
        setMindmapData(data.mindmapData);
      }

      // Auto-open sections when data is available
      if (data.mindmapData) {
        setSectionsOpen({
          ...sectionsOpen,
          notes: true,
          mindmap: true,
        });
      }

      setMindmapProcessing(false);
    } catch (error) {
      console.error("Error updating mindmap:", error);
      setNotesProcessing(false);
      setMindmapProcessing(false);
    } finally {
      setIsProcessing(false);
      setProcessingStage("");
    }
  };

  // Manual processing of transcript - for testing
  const processTranscript = () => {
    if (transcript.trim()) {
      // Use the current transcript for processing
      updateMindmap(transcript);
    }
  };

  // Create a vertical layout with collapsible sections
  return (
    <div className="flex flex-col space-y-6 max-w-6xl mx-auto">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white">Speech to Mindmap</h1>
        <p className="text-sm text-gray-300">
          Convert your spoken ideas into a visual mindmap and explore different
          output formats
        </p>
      </div>

      <div className="flex flex-col space-y-4">
        {/* Audio Input Section - Collapsible */}
        <div className="border border-gray-700 rounded overflow-hidden shadow-sm">
          <div
            className="bg-gray-800 p-3 flex justify-between items-center border-b border-gray-700 cursor-pointer"
            onClick={() => toggleSection("audioInput")}
          >
            <div className="flex items-center">
              <Mic className="h-4 w-4 mr-2 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Speech Input</h2>
              {transcriptProcessing && (
                <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full flex items-center">
                  <Loader className="w-3 h-3 animate-spin mr-1" />
                  Processing...
                </span>
              )}
            </div>
            <div className="flex items-center">
              <div className="flex mr-4">
                {!isRecording ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startRecording();
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs mr-2"
                    disabled={isProcessing}
                  >
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stopRecording();
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs mr-2"
                  >
                    Stop Recording
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    processTranscript();
                  }}
                  disabled={isProcessing || !transcript.trim()}
                  className={`flex items-center ${
                    isProcessing || !transcript.trim()
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600"
                  } text-white px-3 py-1.5 rounded text-xs`}
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-3 h-3 animate-spin mr-1" />
                      Processing...
                    </>
                  ) : (
                    "Process Text"
                  )}
                </button>
              </div>
              {sectionsOpen.audioInput ? (
                <MinusSquare className="h-5 w-5 text-gray-400" />
              ) : (
                <PlusSquare className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>

          {sectionsOpen.audioInput && (
            <div className="bg-gray-900 p-4">
              {/* Transcript input */}
              <textarea
                className="bg-gray-800 text-white p-4 w-full overflow-y-auto h-[150px] rounded border border-gray-700"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Your transcript will appear here or type directly to test..."
                disabled={transcriptProcessing}
              />
            </div>
          )}
        </div>

        {/* Summarized Notes Section - Collapsible */}
        <div className="border border-gray-700 rounded overflow-hidden shadow-sm">
          <div
            className="bg-gray-800 p-3 flex justify-between items-center border-b border-gray-700 cursor-pointer"
            onClick={() => toggleSection("notes")}
          >
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-2 text-green-400" />
              <h2 className="text-sm font-semibold text-white">
                Summarized Notes
              </h2>
              {notesProcessing && (
                <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full flex items-center">
                  <Loader className="w-3 h-3 animate-spin mr-1" />
                  Generating notes...
                </span>
              )}
            </div>
            <div>
              {sectionsOpen.notes ? (
                <MinusSquare className="h-5 w-5 text-gray-400" />
              ) : (
                <PlusSquare className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>

          {sectionsOpen.notes && (
            <div className="p-4 bg-gray-900">
              {notesProcessing ? (
                <div className="bg-gray-800 p-4 rounded text-white font-mono min-h-[200px] flex items-center justify-center flex-col">
                  <Loader className="w-8 h-8 animate-spin text-green-500 mb-3" />
                  <p className="text-gray-300 text-sm text-center">
                    {processingStage || "Generating hierarchical structure..."}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-800 p-4 rounded text-white font-mono min-h-[200px]">
                  {renderHierarchicalText(mindmapData)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mindmap Visualization - Collapsible */}
        <div className="border border-gray-700 rounded overflow-hidden shadow-sm">
          <div
            className="bg-gray-800 p-3 flex justify-between items-center border-b border-gray-700 cursor-pointer"
            onClick={() => toggleSection("mindmap")}
          >
            <div className="flex items-center">
              <PenTool className="h-4 w-4 mr-2 text-purple-400" />
              <h2 className="text-sm font-semibold text-white">
                Mindmap Visualization
              </h2>
              {mindmapProcessing && (
                <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full flex items-center">
                  <Loader className="w-3 h-3 animate-spin mr-1" />
                  Updating mindmap...
                </span>
              )}
            </div>
            <div className="flex items-center">
              {sectionsOpen.mindmap ? (
                <MinusSquare className="h-5 w-5 text-gray-400" />
              ) : (
                <PlusSquare className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>

          {sectionsOpen.mindmap && (
            <div className="p-4 bg-gray-900 min-h-[500px]">
              {mindmapProcessing ? (
                <div className="bg-gray-800 p-4 rounded text-white font-mono min-h-[500px] flex items-center justify-center flex-col">
                  <Loader className="w-8 h-8 animate-spin text-purple-500 mb-3" />
                  <p className="text-gray-300 text-sm text-center">
                    {processingStage || "Updating mindmap visualization..."}
                  </p>
                </div>
              ) : (
                <Mindmap ref={mindmapRef} mindmapData={mindmapData} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
