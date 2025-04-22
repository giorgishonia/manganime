"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { createContent, updateContent } from "@/lib/content";

// Define genre options
const genreOptions = [
  { label: "Action", value: "action" },
  { label: "Adventure", value: "adventure" },
  { label: "Comedy", value: "comedy" },
  { label: "Drama", value: "drama" },
  { label: "Fantasy", value: "fantasy" },
  { label: "Horror", value: "horror" },
  { label: "Mystery", value: "mystery" },
  { label: "Romance", value: "romance" },
  { label: "Sci-Fi", value: "sci-fi" },
  { label: "Slice of Life", value: "slice-of-life" },
  { label: "Sports", value: "sports" },
  { label: "Supernatural", value: "supernatural" },
  { label: "Thriller", value: "thriller" },
];

// Absolute minimum schema with only essential fields
const contentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["anime", "manga"], {
    required_error: "Content type is required",
  }),
  status: z.enum(["ongoing", "completed", "hiatus"], {
    required_error: "Status is required",
  }),
  thumbnail: z.string().min(1, "Thumbnail URL is required"),
  genres: z.array(z.string()).min(1, "At least one genre is required"),
});

type ContentFormValues = z.infer<typeof contentFormSchema>;

type ContentFormProps = {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function ContentForm({
  initialData,
  onSuccess,
  onCancel,
}: ContentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Minimal default values
  const defaultValues = initialData ? {
    title: initialData.title || "",
    description: initialData.description || "",
    type: initialData.type || "anime",
    status: initialData.status || "ongoing",
    thumbnail: initialData.thumbnail || "",
    genres: initialData.genres || [],
  } : {
    title: "",
    description: "",
    type: "anime" as const,
    status: "ongoing" as const,
    thumbnail: "",
    genres: [],
  };

  const form = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues,
  });

  async function onSubmit(data: ContentFormValues) {
    setIsLoading(true);
    console.log("Submitting form with data:", data);
    
    try {
      if (initialData?.id) {
        // Update existing content
        const result = await updateContent(initialData.id, data);
        if (result.success) {
          toast.success("Content updated successfully");
          onSuccess();
        } else {
          console.error("Content update error:", result.error);
          toast.error("Failed to update content");
        }
      } else {
        // Create new content
        const result = await createContent(data);
        if (result.success) {
          toast.success("Content created successfully");
          onSuccess();
        } else {
          console.error("Content creation error:", result.error);
          toast.error("Failed to create content");
        }
      }
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error(initialData ? "Failed to update content" : "Failed to create content");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="anime">Anime</SelectItem>
                      <SelectItem value="manga">Manga</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="hiatus">Hiatus</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter description" 
                    rows={4}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="thumbnail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thumbnail URL</FormLabel>
                <FormControl>
                  <Input placeholder="Enter thumbnail URL" {...field} />
                </FormControl>
                <FormDescription>
                  URL for the thumbnail image (aspect ratio 2:3 recommended)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="genres"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Genres</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={genreOptions}
                    placeholder="Select genres"
                    selected={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></span>
                Saving...
              </>
            ) : initialData ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 