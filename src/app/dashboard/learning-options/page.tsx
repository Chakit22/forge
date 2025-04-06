"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Image from "next/image";

export default function LearningOptions() {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const summary = searchParams.get("summary");

  const handleContinue = () => {
    if (selectedOption) {
      router.push(
        `/dashboard/learning-duration?summary=${encodeURIComponent(
          summary || ""
        )}&learningOption=${selectedOption}`
      );
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="flex items-center p-6">
        <Button
          variant="ghost"
          className="text-white p-0"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon className="h-6 w-6 mr-2" />
        </Button>
        <div className="flex items-center">
          <Image
            src="/logo.png"
            alt="Forge Logo"
            width={48}
            height={48}
            className="mr-2"
          />
          <span className="text-xl font-bold text-white">FORGE</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <h1 className="text-3xl font-bold text-white mb-12">
          I need help with ...
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full mb-12">
          <Card
            className={`bg-slate-800 border-0 p-8 rounded-lg cursor-pointer transition-all hover:bg-slate-700 ${
              selectedOption === "memorizing" ? "ring-2 ring-white" : ""
            }`}
            onClick={() => setSelectedOption("memorizing")}
          >
            <div className="flex flex-col items-center text-white">
              <div className="h-24 w-24 flex items-center justify-center mb-6">
                <Image
                  src="/logo.png"
                  alt="Forge Logo"
                  width={48}
                  height={48}
                />
              </div>
              <h3 className="text-xl font-medium">Memorizing</h3>
            </div>
          </Card>

          <Card
            className={`bg-slate-800 border-0 p-8 rounded-lg cursor-pointer transition-all hover:bg-slate-700 ${
              selectedOption === "understanding" ? "ring-2 ring-white" : ""
            }`}
            onClick={() => setSelectedOption("understanding")}
          >
            <div className="flex flex-col items-center text-white">
              <div className="h-24 w-24 flex items-center justify-center mb-6">
                <BookIcon className="h-16 w-16" />
              </div>
              <h3 className="text-xl font-medium">Understanding</h3>
            </div>
          </Card>

          <Card
            className={`bg-slate-800 border-0 p-8 rounded-lg cursor-pointer transition-all hover:bg-slate-700 ${
              selectedOption === "testing" ? "ring-2 ring-white" : ""
            }`}
            onClick={() => setSelectedOption("testing")}
          >
            <div className="flex flex-col items-center text-white">
              <div className="h-24 w-24 flex items-center justify-center mb-6">
                <ClipboardIcon className="h-16 w-16" />
              </div>
              <h3 className="text-xl font-medium">Testing</h3>
            </div>
          </Card>
        </div>

        <Button
          className="bg-slate-800 hover:bg-slate-700 text-white border-0 py-6 px-8 text-lg rounded-md w-48"
          disabled={!selectedOption}
          onClick={handleContinue}
        >
          Continue
        </Button>
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

function BrainIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
      <path d="M12 8v4l3 3 1-1-2.5-2.5V8z" />
    </svg>
  );
}

function BookIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2h11A2.5 2.5 0 0 1 20 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 19.5z" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h6" />
    </svg>
  );
}

function ClipboardIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}
