"use client";

import React, { useState, useRef, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Slider from "@radix-ui/react-slider";
import { X, Maximize2, Minimize2, ZoomIn, ZoomOut, Download } from "lucide-react";
import { cn, isImageFile, isPdfFile, getFileIcon } from "@/lib/utils";

interface FileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    name: string;
    type: string;
    content: string;
  } | null;
}

export function FileViewer({ isOpen, onClose, file }: FileViewerProps) {
  const [width, setWidth] = useState(600);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const dragStartX = useRef(0);
  const startWidth = useRef(0);
  const MIN_WIDTH = 400;
  const MAX_WIDTH = 1200;
  const resizeBarRef = useRef<HTMLDivElement>(null);

  // Create PDF blob URL when file changes
  useEffect(() => {
    if (file && isPdfFile(file.type)) {
      try {
        // Clean up the old URL
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
        
        // Convert base64 to blob
        const byteCharacters = atob(file.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Create blob URL
        const url = URL.createObjectURL(blob);
        console.log("Created PDF blob URL:", url);
        setPdfUrl(url);
      } catch (error) {
        console.error("Error creating PDF blob URL:", error);
        setPdfUrl(null);
      }
    } else {
      setPdfUrl(null);
    }
    
    // Clean up on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [file, pdfUrl]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartX.current;
        const newWidth = Math.max(
          MIN_WIDTH,
          Math.min(startWidth.current - deltaX, MAX_WIDTH)
        );
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    startWidth.current = width;
    setIsDragging(true);
  };

  const getContentType = () => {
    if (!file) return "unknown";
    if (isImageFile(file.type)) return "image";
    if (isPdfFile(file.type)) return "pdf";
    return "unknown";
  };

  // Create a direct data URL for PDF if needed
  const getDirectPdfDataUrl = () => {
    if (!file || !isPdfFile(file.type)) return null;
    return `data:application/pdf;base64,${file.content}`;
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 10, 50));
  };
  
  const downloadFile = () => {
    if (!file) return;
    
    try {
      const linkElement = document.createElement('a');
      
      if (pdfUrl && isPdfFile(file.type)) {
        linkElement.href = pdfUrl;
      } else {
        linkElement.href = `data:${file.type};base64,${file.content}`;
      }
      
      linkElement.download = file.name;
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  const contentType = getContentType();
  
  // Reset zoom when file changes
  useEffect(() => {
    setZoomLevel(100);
  }, [file]);

  if (!file) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          className={cn(
            "fixed z-50 bg-slate-900 border border-slate-700 flex flex-col",
            isFullscreen
              ? "inset-4 rounded-lg"
              : "top-0 bottom-0 right-0 rounded-l-lg",
            !isFullscreen && "transition-all duration-200"
          )}
          style={{ width: isFullscreen ? "auto" : width }}
        >
          <Dialog.Title className="sr-only">
            File Viewer: {file.name}
          </Dialog.Title>
          
          {/* Resize handle */}
          {!isFullscreen && (
            <div
              ref={resizeBarRef}
              className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize bg-slate-700 hover:bg-slate-500"
              onMouseDown={handleResizeStart}
            />
          )}

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h3 className="text-white font-medium truncate max-w-[calc(100%-120px)] flex items-center">
              <span className="mr-2">{getFileIcon(file.type)}</span>
              {file.name}
            </h3>
            <div className="flex items-center gap-2">
              <button
                className="text-white/70 hover:text-white rounded-full p-1"
                onClick={downloadFile}
                aria-label="Download file"
                tabIndex={0}
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                className="text-white/70 hover:text-white rounded-full p-1"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                tabIndex={0}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </button>
              <Dialog.Close asChild>
                <button
                  className="text-white/70 hover:text-white rounded-full p-1"
                  aria-label="Close"
                  tabIndex={0}
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-2 py-2 bg-slate-800">
            <button
              className="text-white/70 hover:text-white p-1 rounded"
              onClick={handleZoomOut}
              aria-label="Zoom out"
              tabIndex={0}
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <div className="w-32">
              <Slider.Root
                className="relative flex items-center select-none touch-none w-full h-5"
                value={[zoomLevel]}
                onValueChange={(value) => setZoomLevel(value[0])}
                min={50}
                max={200}
                step={5}
                aria-label="Zoom level"
              >
                <Slider.Track className="bg-slate-700 relative grow rounded-full h-1">
                  <Slider.Range className="absolute bg-white rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb
                  className="block w-4 h-4 bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900"
                  aria-label="Zoom"
                />
              </Slider.Root>
            </div>
            <button
              className="text-white/70 hover:text-white p-1 rounded"
              onClick={handleZoomIn}
              aria-label="Zoom in"
              tabIndex={0}
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="text-white/70 text-xs ml-1">{zoomLevel}%</span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4 bg-slate-800">
            {contentType === "image" && (
              <div className="flex items-center justify-center h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:${file.type};base64,${file.content}`}
                  alt={file.name}
                  className="max-h-full object-contain transition-transform"
                  style={{ transform: `scale(${zoomLevel / 100})` }}
                />
              </div>
            )}
            {contentType === "pdf" && (
              <div className="h-full w-full flex flex-col items-stretch bg-slate-900 overflow-auto">
                {pdfUrl ? (
                  <object
                    data={pdfUrl}
                    type="application/pdf"
                    className="w-full"
                    style={{ 
                      height: isFullscreen ? "calc(100vh - 160px)" : "1200px",
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: "top center"
                    }}
                  >
                    <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-800 rounded">
                      <p className="text-white text-center mb-4">
                        Trying alternative PDF rendering methods...
                      </p>
                      <embed
                        src={getDirectPdfDataUrl() || pdfUrl}
                        type="application/pdf"
                        className="w-full h-[500px] mb-4 overflow-auto"
                      />
                      <iframe 
                        src={getDirectPdfDataUrl() || pdfUrl} 
                        className="w-full h-[500px] border-0 mb-4 overflow-auto"
                        title={file.name}
                        sandbox="allow-scripts"
                      />
                      <button
                        onClick={downloadFile}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </button>
                    </div>
                  </object>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-800 rounded">
                    <p className="text-white text-center mb-4">
                      Error loading PDF. Please try downloading it instead.
                    </p>
                    <button
                      onClick={downloadFile}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </button>
                  </div>
                )}
              </div>
            )}
            {contentType === "unknown" && (
              <div className="flex items-center justify-center h-full bg-slate-900 rounded-lg p-6">
                <p className="text-white text-center">
                  File preview not available for this file type.
                </p>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 