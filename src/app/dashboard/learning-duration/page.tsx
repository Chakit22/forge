"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Image from "next/image";

export default function LearningDuration() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hours, setHours] = useState("00");
  const [minutes, setMinutes] = useState("30");
  const [seconds, setSeconds] = useState("00");

  const summary = searchParams.get("summary");
  const learningOption = searchParams.get("learningOption");

  const handleContinue = () => {
    const totalSeconds =
      parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);

    if (totalSeconds === 0) {
      alert("Please select a study duration");
      return;
    }

    router.push(
      `/dashboard/session?summary=${encodeURIComponent(
        summary || ""
      )}&learningOption=${encodeURIComponent(
        learningOption || ""
      )}&duration=${encodeURIComponent(`${hours}:${minutes}:${seconds}`)}`
    );
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
          How long would you like to study for?
        </h1>

        <div className="flex items-center justify-center gap-4 mb-12">
          <TimeCard
            value={hours}
            label="Hour"
            onChange={(val) => setHours(val.padStart(2, "0"))}
            min={0}
            max={23}
          />
          <span className="text-white text-6xl font-bold">:</span>
          <TimeCard
            value={minutes}
            label="Minute"
            onChange={(val) => setMinutes(val.padStart(2, "0"))}
            min={0}
            max={59}
          />
          <span className="text-white text-6xl font-bold">:</span>
          <TimeCard
            value={seconds}
            label="Second"
            onChange={(val) => setSeconds(val.padStart(2, "0"))}
            min={0}
            max={59}
          />
        </div>

        <Button
          className="bg-slate-800 hover:bg-slate-700 text-white border-0 py-6 px-8 text-lg rounded-md w-48"
          onClick={handleContinue}
        >
          Continue
        </Button>
      </main>
    </div>
  );
}

interface TimeCardProps {
  value: string;
  label: string;
  min: number;
  max: number;
  onChange: (value: string) => void;
}

function TimeCard({ value, label, min, max, onChange }: TimeCardProps) {
  const increment = () => {
    const nextVal = (parseInt(value) + 1) % (max + 1);
    onChange(nextVal.toString());
  };

  const decrement = () => {
    const nextVal = parseInt(value) - 1 < min ? max : parseInt(value) - 1;
    onChange(nextVal.toString());
  };

  return (
    <div className="flex flex-col items-center">
      <Card className="bg-teal-600/50 border-0 w-32 h-32 rounded-lg flex items-center justify-center">
        <Button
          variant="ghost"
          className="absolute top-0 w-full h-8 text-white hover:bg-transparent hover:text-teal-300"
          onClick={increment}
        >
          <ChevronUpIcon className="h-6 w-6" />
        </Button>
        <span className="text-white text-6xl font-bold">{value}</span>
        <Button
          variant="ghost"
          className="absolute bottom-0 w-full h-8 text-white hover:bg-transparent hover:text-teal-300"
          onClick={decrement}
        >
          <ChevronDownIcon className="h-6 w-6" />
        </Button>
      </Card>
      <span className="text-white text-xl mt-3">{label}</span>
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

function ChevronUpIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
