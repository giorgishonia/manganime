"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Loader2, Plus, X, ImagePlus } from "lucide-react";
import { format } from "date-fns";
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
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Form schema for chapter validation
const chapterSchema = z.object({
  number: z.coerce.number().int().positive("Chapter number must be positive"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  thumbnail: z.string().url("Invalid thumbnail URL").optional().or(z.literal("")),
  pages: z.array(z.string().url("Invalid page URL")).min(1, "At least one page is required"),
  releaseDate: z.date().optional(),
});

type ChapterFormValues = z.infer<typeof chapterSchema>;

type ChapterFormProps = {
  initialData?: any;
  contentId: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function ChapterForm({
  initialData,
  contentId,
  onSuccess,
  onCancel,
}: ChapterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newPageUrl, setNewPageUrl] = useState("");
  
  // Set default values for the form
  const defaultValues = initialData ? {
    ...initialData,
    // Convert any string dates to Date objects
    releaseDate: initialData.releaseDate ? new Date(initialData.releaseDate) : undefined,
    // Ensure number fields are numbers
    number: Number(initialData.number),
    // Ensure pages is an array
    pages: Array.isArray(initialData.pages) ? initialData.pages : [],
  } : {
    number: 1,
    title: "",
    description: "",
    thumbnail: "",
    pages: [],
    releaseDate: undefined,
  };

  const form = useForm<ChapterFormValues>({
    resolver: zodResolver(chapterSchema),
    defaultValues,
  });

  const watchedPages = form.watch("pages");

  const handleAddPage = () => {
    if (!newPageUrl) return;
    
    // Basic URL validation
    try {
      new URL(newPageUrl);
      form.setValue("pages", [...watchedPages, newPageUrl]);
      setNewPageUrl("");
    } catch (error) {
      toast.error("Please enter a valid URL");
    }
  };

  const handleRemovePage = (index: number) => {
    const updatedPages = [...watchedPages];
    updatedPages.splice(index, 1);
    form.setValue("pages", updatedPages);
  };

  const handleReorderPage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === watchedPages.length - 1)
    ) {
      return;
    }
    
    const updatedPages = [...watchedPages];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const [movedPage] = updatedPages.splice(index, 1);
    updatedPages.splice(newIndex, 0, movedPage);
    
    form.setValue("pages", updatedPages);
  };

  async function onSubmit(data: ChapterFormValues) {
    setIsLoading(true);
    
    try {
      // Process data - format the date as ISO string if it exists
      const formattedData = {
        ...data,
        contentId, // Add the contentId
        releaseDate: data.releaseDate ? data.releaseDate.toISOString() : undefined,
      };
      
      // Define the API endpoint and method
      const endpoint = initialData?.id 
        ? `/api/chapters?id=${initialData.id}` 
        : "/api/chapters";
      const method = initialData?.id ? "PUT" : "POST";
      
      // Make the API request
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save chapter");
      }
      
      toast.success(initialData ? "Chapter updated successfully" : "Chapter created successfully");
      onSuccess();
    } catch (error) {
      console.error("Error saving chapter:", error);
      toast.error(initialData ? "Failed to update chapter" : "Failed to create chapter");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chapter Number *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="1" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  The chapter number in the series
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="releaseDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Release Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  The date when this chapter was released
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="Enter chapter title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter chapter description" 
                  rows={3}
                  {...field}
                  value={field.value || ""} 
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
                <Input 
                  placeholder="https://example.com/thumbnail.jpg" 
                  {...field}
                  value={field.value || ""} 
                />
              </FormControl>
              <FormDescription>
                URL for the chapter thumbnail image
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="pages"
          render={() => (
            <FormItem>
              <FormLabel>Pages *</FormLabel>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/page1.jpg"
                    value={newPageUrl}
                    onChange={(e) => setNewPageUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddPage}
                    variant="secondary"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                
                {watchedPages.length > 0 ? (
                  <ScrollArea className="h-64 border rounded-md p-2">
                    <div className="space-y-2">
                      {watchedPages.map((page, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between bg-secondary/20 p-2 rounded-md"
                        >
                          <div className="flex items-center gap-2 flex-1 overflow-hidden">
                            <div className="bg-background rounded-md p-1 flex-shrink-0">
                              <ImagePlus className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="text-sm truncate">{page}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleReorderPage(index, 'up')}
                              disabled={index === 0}
                            >
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 15 15"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                              >
                                <path
                                  d="M7.5 3C7.77614 3 8 3.22386 8 3.5V11.2929L10.1464 9.14645C10.3417 8.95118 10.6583 8.95118 10.8536 9.14645C11.0488 9.34171 11.0488 9.65829 10.8536 9.85355L7.85355 12.8536C7.75979 12.9473 7.63261 13 7.5 13C7.36739 13 7.24021 12.9473 7.14645 12.8536L4.14645 9.85355C3.95118 9.65829 3.95118 9.34171 4.14645 9.14645C4.34171 8.95118 4.65829 8.95118 4.85355 9.14645L7 11.2929V3.5C7 3.22386 7.22386 3 7.5 3Z"
                                  fill="currentColor"
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  transform="rotate(180 7.5 7.5)"
                                ></path>
                              </svg>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleReorderPage(index, 'down')}
                              disabled={index === watchedPages.length - 1}
                            >
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 15 15"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                              >
                                <path
                                  d="M7.5 3C7.77614 3 8 3.22386 8 3.5V11.2929L10.1464 9.14645C10.3417 8.95118 10.6583 8.95118 10.8536 9.14645C11.0488 9.34171 11.0488 9.65829 10.8536 9.85355L7.85355 12.8536C7.75979 12.9473 7.63261 13 7.5 13C7.36739 13 7.24021 12.9473 7.14645 12.8536L4.14645 9.85355C3.95118 9.65829 3.95118 9.34171 4.14645 9.14645C4.34171 8.95118 4.65829 8.95118 4.85355 9.14645L7 11.2929V3.5C7 3.22386 7.22386 3 7.5 3Z"
                                  fill="currentColor"
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                ></path>
                              </svg>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleRemovePage(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center h-20 border rounded-md">
                    <p className="text-sm text-muted-foreground">No pages added yet</p>
                  </div>
                )}
                
                {watchedPages.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {watchedPages.length} page{watchedPages.length !== 1 && "s"} added
                  </p>
                )}
                
                <FormMessage />
              </div>
              <FormDescription>
                Add URLs for each page of the chapter (in order)
              </FormDescription>
            </FormItem>
          )}
        />
        
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : initialData ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 