"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Message } from "@/app/api/memoagent";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Define types for ReactMarkdown components
type CodeProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  inline?: boolean;
};

// Define file attachment type
type FileAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string; // base64 encoded content
};

export default function Session() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const method = searchParams.get("method");
  const durationSeconds = parseInt(searchParams.get("duration") || "0");

  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Maximum file size in bytes (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  useEffect(() => {
    // if (durationSeconds <= 0) {
    //   router.replace("/dashboard");
    //   return;
    // }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [durationSeconds, router]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log(`Processing ${files.length} selected files`);

    Array.from(files).forEach((file) => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        console.error(`File ${file.name} exceeds maximum size limit of 10MB`);
        alert(`File ${file.name} exceeds maximum size limit of 10MB`);
        return;
      }

      console.log(
        `Reading file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`
      );
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target && event.target.result) {
          const content = event.target.result as string;
          console.log(
            `File ${file.name} loaded, content length: ${content.length}`
          );
          const base64Content = content.split(",")[1]; // Remove the data URL prefix
          console.log(`Base64 content length: ${base64Content.length}`);

          const newAttachment: FileAttachment = {
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            size: file.size,
            content: base64Content,
          };
          setAttachments((prev) => [...prev, newAttachment]);
        }
      };

      reader.onerror = (error) => {
        console.error(`Error reading file ${file.name}:`, error);
        alert(`Failed to read file ${file.name}. Please try again.`);
      };

      reader.readAsDataURL(file);
    });

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && attachments.length === 0) return;

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: inputMessage.trim(),
    };

    // Create a more detailed message for the UI if there are attachments
    const displayContent =
      attachments.length > 0
        ? `${userMessage.content} [Attached ${
            attachments.length
          } file(s): ${attachments.map((a) => a.name).join(", ")}]`
        : userMessage.content;

    // If we have attachments, add a debug info message
    if (attachments.length > 0) {
      // Add a troubleshooting message to the chat
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: displayContent,
        },
        {
          role: "assistant",
          content:
            "I'll try to process your file(s). If you don't see file content in my response, there might be an issue with file processing. You may need to try again with a smaller or different file format.",
        },
      ]);
    } else {
      // Just add the user message
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: displayContent,
        },
      ]);
    }

    setInputMessage("");
    setIsTyping(true);

    try {
      // Prepare attachment data for API
      const attachmentData = attachments.map((a) => ({
        name: a.name,
        type: a.type,
        content: a.content,
      }));

      console.log(`Sending message with ${attachmentData.length} attachments`);
      if (attachmentData.length > 0) {
        console.log(
          "Attachment details:",
          attachmentData.map((a) => ({
            name: a.name,
            type: a.type,
            contentLength: a.content.length,
          }))
        );
      }

      // Validate the API endpoint path
      const apiEndpoint = "/api/chat";
      console.log(`Sending request to API endpoint: ${apiEndpoint}`);

      // Send to API route with attachments
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          method,
          attachments: attachmentData,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error: ${response.status} - ${errorText}`);
        throw new Error(
          `Failed to get response from API: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("API response received:", data);

      // Add assistant response (only if we didn't already add a debug message about attachments)
      if (attachments.length === 0) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.message,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Override the previous debug message with the actual response
        setMessages((prev) => {
          // Remove the last assistant message (debug message) and add the new one
          const messagesWithoutDebug = prev.slice(0, -1);
          return [
            ...messagesWithoutDebug,
            {
              role: "assistant",
              content: data.message,
            },
          ];
        });
      }

      // Clear attachments after sending
      setAttachments([]);
    } catch (error) {
      console.error("Error sending message:", error);
      // Add user-facing error message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, there was an error processing your message. Please try again.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const methodTitle =
    {
      memorizing: "Memorizing",
      understanding: "Understanding",
      testing: "Testing",
    }[method || ""] || "Learning";

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="flex items-center justify-between p-6 bg-black">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="text-white p-0 mr-2"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Button>
          <Image
            src="/logo.png"
            alt="Forge Logo"
            width={48}
            height={48}
            className="mr-2"
          />
          <span className="text-xl font-bold text-white">FORGE</span>
        </div>
        <div className="text-xl font-medium text-white">
          {formatTime(timeLeft)}
        </div>
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
          <Image
            src="https://i.pravatar.cc/150?img=25"
            alt="Profile"
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 md:p-8">
        <div className="flex-1 mb-4 overflow-auto bg-slate-800 rounded-lg p-4">
          <div className="flex flex-col gap-4">
            <div className="self-start bg-slate-900 text-white rounded-lg p-3 max-w-md">
              Welcome to your {methodTitle} session! Ask me anything related to
              your topic.
            </div>

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`${
                  msg.role === "user"
                    ? "self-end bg-teal-500 text-white"
                    : "self-start bg-teal-600/70 text-white"
                } rounded-lg p-3 max-w-md`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: (props) => (
                          <a
                            {...props}
                            className="text-teal-300 underline hover:text-teal-200"
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        ),
                        ul: (props) => (
                          <ul {...props} className="list-disc pl-5 space-y-1" />
                        ),
                        ol: (props) => (
                          <ol
                            {...props}
                            className="list-decimal pl-5 space-y-1"
                          />
                        ),
                        code: ({ inline, ...props }: CodeProps) =>
                          inline ? (
                            <code
                              {...props}
                              className="bg-teal-700/50 px-1 py-0.5 rounded text-sm"
                            />
                          ) : (
                            <code
                              {...props}
                              className="block bg-teal-700/70 p-2 rounded-md overflow-x-auto text-sm my-2"
                            />
                          ),
                        pre: (props) => (
                          <pre
                            {...props}
                            className="bg-transparent p-0 overflow-x-auto"
                          />
                        ),
                        h1: (props) => (
                          <h1
                            {...props}
                            className="text-xl font-bold mt-4 mb-2"
                          />
                        ),
                        h2: (props) => (
                          <h2
                            {...props}
                            className="text-lg font-bold mt-3 mb-1"
                          />
                        ),
                        h3: (props) => (
                          <h3
                            {...props}
                            className="text-md font-bold mt-2 mb-1"
                          />
                        ),
                        blockquote: (props) => (
                          <blockquote
                            {...props}
                            className="border-l-2 border-teal-400 pl-3 italic"
                          />
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            ))}

            {isTyping && (
              <div className="self-start bg-teal-600/50 text-white rounded-lg p-3 max-w-md">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attachment Display */}
        {attachments.length > 0 && (
          <div className="mb-2 p-2 bg-teal-700/30 rounded-lg">
            <p className="text-white text-xs mb-2">Attachments:</p>
            <div className="flex flex-wrap gap-2">
              {attachments.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center bg-teal-600/60 rounded px-2 py-1"
                >
                  <span className="text-white text-xs truncate max-w-[150px]">
                    {file.name}
                  </span>
                  <button
                    onClick={() => removeAttachment(file.id)}
                    className="ml-2 text-white opacity-70 hover:opacity-100"
                  >
                    <CloseIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Textarea
              placeholder="Type your message..."
              className="bg-teal-600/50 border-0 text-white resize-none h-16 placeholder:text-white/70"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-teal-600 hover:bg-teal-500 text-white h-8 px-2 flex-1"
                type="button"
              >
                <PaperclipIcon className="h-5 w-5" />
              </Button>

              <Button
                onClick={handleSendMessage}
                className="bg-teal-600 hover:bg-teal-500 text-white h-8 px-2 flex-1"
                disabled={
                  (!inputMessage.trim() && attachments.length === 0) || isTyping
                }
              >
                <SendIcon className="h-5 w-5" />
              </Button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
            />
          </div>

          <div className="text-white/50 text-xs">
            Supported files: Images, PDFs, Documents, Text files (Max 10MB)
          </div>
        </div>
      </main>
    </div>
  );
}

function ArrowLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function SendIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function PaperclipIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
