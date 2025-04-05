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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Learning Session</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="topic">What would you like to learn?</Label>
            <Input
              id="topic"
              placeholder="Enter a topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="learning-option">Learning Method</Label>
            <Select value={learningOption} onValueChange={setLearningOption}>
              <SelectTrigger id="learning-option">
                <SelectValue placeholder="Select a learning method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="memorizing">Memorization</SelectItem>
                <SelectItem value="understanding">Understanding</SelectItem>
                <SelectItem value="testing">Testing Knowledge</SelectItem>
                <SelectItem value="reinforcement">Reinforcement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="duration">Session Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration">
                <SelectValue placeholder="Select session duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PT15M">15 minutes</SelectItem>
                <SelectItem value="PT30M">30 minutes</SelectItem>
                <SelectItem value="PT45M">45 minutes</SelectItem>
                <SelectItem value="PT1H">1 hour</SelectItem>
                <SelectItem value="PT2H">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
