"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addConversation } from "@/app/api/actions";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateConversationModal({
  isOpen,
  onClose,
}: CreateConversationModalProps) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [learningOption, setLearningOption] = useState("memorizing");
  const [duration, setDuration] = useState("PT30M");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("duration", duration);
      const response = await addConversation({
        learning_option: learningOption,
        duration: duration,
        summary: `Learning session about: ${topic}`,
      });

      if (response.success) {
        toast.success("Created new learning session!");
        onClose();
        if (response.conversation?.id) {
          // Navigate to the conversation detail page
          router.push(`/dashboard/conversation/${response.conversation.id}`);
        }
      } else {
        toast.error(response.error || "Failed to start session");
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-black border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Learning Session</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="topic" className="text-white">What would you like to learn?</Label>
            <Input
              id="topic"
              placeholder="Enter a topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="border-white/20 bg-black/70 text-white placeholder:text-white/50"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="learning-option" className="text-white">Learning Method</Label>
            <Select value={learningOption} onValueChange={setLearningOption}>
              <SelectTrigger id="learning-option" className="border-white/20 bg-black/70 text-white">
                <SelectValue placeholder="Select a learning method" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/20 text-white">
                <SelectItem value="memorizing" className="focus:bg-white/10 focus:text-white">Memorization</SelectItem>
                <SelectItem value="understanding" className="focus:bg-white/10 focus:text-white">Understanding</SelectItem>
                <SelectItem value="testing" className="focus:bg-white/10 focus:text-white">Testing Knowledge</SelectItem>
                <SelectItem value="reinforcement" className="focus:bg-white/10 focus:text-white">Reinforcement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="duration" className="text-white">Session Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration" className="border-white/20 bg-black/70 text-white">
                <SelectValue placeholder="Select session duration" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/20 text-white">
                <SelectItem value="PT15M" className="focus:bg-white/10 focus:text-white">15 minutes</SelectItem>
                <SelectItem value="PT30M" className="focus:bg-white/10 focus:text-white">30 minutes</SelectItem>
                <SelectItem value="PT45M" className="focus:bg-white/10 focus:text-white">45 minutes</SelectItem>
                <SelectItem value="PT1H" className="focus:bg-white/10 focus:text-white">1 hour</SelectItem>
                <SelectItem value="PT2H" className="focus:bg-white/10 focus:text-white">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-white border-white/20 hover:bg-white/10 hover:text-white">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-white/20 text-white hover:bg-white/30">
            {isSubmitting ? "Creating..." : "Create Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
