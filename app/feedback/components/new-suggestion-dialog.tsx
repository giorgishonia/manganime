"use client";

import { useState } from "react";
import { useAuth } from "@/components/supabase-auth-provider";
import { addSuggestion, SuggestionType } from "@/lib/feedback";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface NewSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuggestionAdded: (suggestion: any) => void;
}

export default function NewSuggestionDialog({
  open,
  onOpenChange,
  onSuggestionAdded,
}: NewSuggestionDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<SuggestionType | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be signed in to submit a suggestion");
      return;
    }

    if (!title.trim() || !description.trim() || !type) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const suggestion = await addSuggestion({
        title,
        description,
        type: type as SuggestionType,
        userId: user.id,
      });

      onSuggestionAdded(suggestion);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding suggestion:", error);
      toast.error("Failed to add suggestion. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Suggestion</DialogTitle>
          <DialogDescription>
            Share your ideas, report bugs, or suggest improvements.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a clear, concise title"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as SuggestionType)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anime">Anime request</SelectItem>
                  <SelectItem value="manga">Manga request</SelectItem>
                  <SelectItem value="sticker">Sticker request</SelectItem>
                  <SelectItem value="feature">Feature request</SelectItem>
                  <SelectItem value="bug">Bug report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about your suggestion"
                className="min-h-[120px]"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !user}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 