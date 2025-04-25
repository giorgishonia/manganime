"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion as m, AnimatePresence } from "framer-motion";
import { Search, X, Film, BookOpen, ArrowRight, Check, Users, PlusCircle, Trash2 } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { getAnimeById, getMangaById, searchAniList } from "@/lib/anilist";

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

// Define Character type
type Character = {
  id?: string;
  name: string;
  image: string;
  role: string;
  age?: string;
  gender?: string;
};

// Define extended schema with georgian title
const contentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  georgianTitle: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["anime", "manga"], {
    required_error: "Content type is required",
  }),
  status: z.enum(["ongoing", "completed", "hiatus"], {
    required_error: "Status is required",
  }),
  thumbnail: z.string().min(1, "Thumbnail URL is required"),
  bannerImage: z.string().optional(),
  genres: z.array(z.string()).min(1, "At least one genre is required"),
  alternativeTitles: z.array(z.string()).optional(),
  releaseYear: z.number().optional(),
  anilistId: z.number().optional(),
  season: z.string().optional(),
  rating: z.number().min(0).max(10).optional(),
  characters: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, "Character name is required"),
      image: z.string().min(1, "Character image URL is required"),
      role: z.string().min(1, "Character role is required"),
      age: z.string().optional(),
      gender: z.string().optional(),
    })
  ).optional(),
});

type ContentFormValues = z.infer<typeof contentFormSchema>;

interface SearchResult {
  id: number;
  title: string;
  image: string;
  type: "anime" | "manga";
  year?: number;
}

type ContentFormProps = {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
};

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function ContentForm({
  initialData,
  onSuccess,
  onCancel,
}: ContentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchType, setSearchType] = useState<"anime" | "manga">("anime");
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Process initialData to handle characters and special fields
  const processedInitialData = useMemo(() => {
    if (!initialData) return null;
    
    // Create a copy of the initialData to avoid modifying the original
    const processed = { ...initialData };
    
    // Ensure characters array exists
    if (processed.characters === undefined) {
      // Characters array might be directly present or needs to be extracted
      processed.characters = [];
      
      // Extract characters from alternative_titles if present
      if (processed.alternative_titles && Array.isArray(processed.alternative_titles)) {
        const characterEntries = processed.alternative_titles.filter((title: string) => 
          typeof title === 'string' && title.startsWith('character:')
        );
        
        if (characterEntries.length > 0) {
          try {
            const extractedCharacters = characterEntries.map((entry: string) => {
              const jsonStr = entry.substring(10); // 'character:'.length = 10
              return JSON.parse(jsonStr);
            });
            processed.characters = extractedCharacters;
            console.log(`Extracted ${extractedCharacters.length} characters from alternative_titles`);
          } catch (err) {
            console.error('Error extracting characters from alternative_titles:', err);
          }
        }
      }
    }
    
    // Ensure there's at least one empty character if editing
    if (initialData.id && (!processed.characters || processed.characters.length === 0)) {
      console.log('Adding default empty character for editing');
      processed.characters = [{ name: "", image: "", role: "SUPPORTING" }];
    }
    
    // Extract georgian title from alternative_titles if not directly present
    if (!processed.georgianTitle && processed.alternative_titles && Array.isArray(processed.alternative_titles)) {
      const georgianTitleEntry = processed.alternative_titles.find((title: string) => 
        typeof title === 'string' && title.startsWith('georgian:')
      );
      
      if (georgianTitleEntry) {
        processed.georgianTitle = georgianTitleEntry.substring(9); // 'georgian:'.length = 9
        console.log('Extracted georgian title from alternative_titles');
      }
    }
    
    return processed;
  }, [initialData]);
  
  // Minimal default values
  const defaultValues = processedInitialData ? {
    title: processedInitialData.title || "",
    georgianTitle: processedInitialData.georgianTitle || processedInitialData.georgian_title || "",
    description: processedInitialData.description || "",
    type: processedInitialData.type || "anime",
    status: processedInitialData.status || "ongoing",
    thumbnail: processedInitialData.thumbnail || "",
    bannerImage: processedInitialData.bannerImage || processedInitialData.banner_image || "",
    genres: processedInitialData.genres || [],
    alternativeTitles: processedInitialData.alternativeTitles || [],
    releaseYear: processedInitialData.releaseYear || processedInitialData.release_year || undefined,
    anilistId: processedInitialData.anilistId || processedInitialData.anilist_id || undefined,
    season: processedInitialData.season || undefined,
    rating: processedInitialData.rating || undefined,
    characters: processedInitialData.characters || [],
  } : {
    title: "",
    georgianTitle: "",
    description: "",
    type: "anime" as const,
    status: "ongoing" as const,
    thumbnail: "",
    bannerImage: "",
    genres: [],
    alternativeTitles: [],
    releaseYear: undefined,
    anilistId: undefined,
    season: undefined,
    rating: undefined,
    characters: [],
  };

  // Log what characters we're initializing with
  useEffect(() => {
    if (defaultValues.characters && defaultValues.characters.length > 0) {
      console.log(`Form initialized with ${defaultValues.characters.length} characters:`, 
        defaultValues.characters);
    }
  }, [defaultValues.characters]);

  const form = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues,
  });

  // Add after other state variables
  const debouncedSearch = useRef(
    debounce(async (query: string, type: "anime" | "manga") => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const results = await searchAniList(query, type);
        
        if (results && results.length > 0) {
          setSearchResults(results.map((item: {
            id: number;
            title: { english: string; romaji: string };
            coverImage: { medium: string };
            seasonYear?: number;
            startDate?: { year: string | number };
            type: string;
          }) => ({
            id: item.id,
            title: item.title.english || item.title.romaji,
            image: item.coverImage.medium,
            type: item.type === "ANIME" ? "anime" : "manga",
            year: item.seasonYear || (item.startDate?.year ? parseInt(item.startDate.year.toString()) : undefined)
          })));
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Error searching AniList:", error);
        toast.error("Failed to search AniList");
      } finally {
        setIsSearching(false);
      }
    }, 300)
  ).current;
  
  // Replace the handleSearch function with this:
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    debouncedSearch(searchQuery, searchType);
  };
  
  // Add an effect to trigger search when query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      debouncedSearch(searchQuery, searchType);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchType, debouncedSearch]);

  async function onSubmit(data: ContentFormValues) {
    setIsLoading(true);
    console.log("Submitting form with data:", data);
    
    try {
      // Create a minimal content data object with only essential fields
      const contentData: any = {
        title: data.title,
        description: data.description,
        type: data.type,
        status: data.status === "hiatus" ? "ongoing" : data.status, // Map hiatus to ongoing as a workaround
      };

      // Only add fields that we're certain about
      if (data.genres && data.genres.length > 0) {
        contentData.genres = data.genres;
      }
      
      if (data.thumbnail) {
        contentData.thumbnail = data.thumbnail;
      }

      // Only add optional fields if they have values
      if (data.alternativeTitles && data.alternativeTitles.length > 0) {
        contentData.alternative_titles = data.alternativeTitles;
      }

      // Handle release year properly - this will be stored in alternative_titles by the backend
      if (data.releaseYear) {
        contentData.release_year = parseInt(data.releaseYear.toString(), 10);
        console.log(`Release year set to: ${contentData.release_year}`);
        
        // Default month/day if year is provided but not month/day
        contentData.release_month = 1; // Default to January
        contentData.release_day = 1;   // Default to 1st
      }

      // Add rating if it exists
      if (data.rating !== undefined) {
        contentData.rating = Number(data.rating);
        console.log(`Rating being sent: ${contentData.rating} (type: ${typeof contentData.rating})`);
      }

      // Optional fields - only add if they have values
      if (data.bannerImage) {
        contentData.banner_image = data.bannerImage;
        console.log("Setting banner image:", data.bannerImage);
      }
      
      if (data.season) {
        contentData.season = data.season;
      }

      if (data.georgianTitle) {
        // Georgian title is handled by the backend via alternative_titles
        contentData.georgian_title = data.georgianTitle;
        console.log("Georgian title set:", data.georgianTitle);
      }
      
      // Characters will be handled by the backend and stored in alternative_titles
      if (data.characters && data.characters.length > 0) {
        contentData.characters = data.characters;
        console.log(`Sending ${data.characters.length} characters to be stored`);
      }
      
      // The content.ts functions will handle special fields appropriately
      console.log("Final content data to submit:", contentData);
      
      if (initialData?.id) {
        // Update existing content
        console.log(`Updating content with ID: ${initialData.id}`);
        const result = await updateContent(initialData.id, contentData);
        if (result.success) {
          console.log("Content updated successfully:", result.content);
          toast.success("Content updated successfully");
          onSuccess();
        } else {
          console.error("Content update error:", result.error);
          toast.error("Failed to update content");
        }
      } else {
        // Create new content
        console.log("Creating new content with filtered fields");
        const result = await createContent(contentData);
        if (result.success) {
          console.log("Content created successfully:", result.content);
          toast.success("Content created successfully");
          onSuccess();
        } else {
          console.error("Content creation error:", result.error);
          toast.error("Failed to create content");
        }
      }
    } catch (error) {
      console.error("Error saving content:", error);
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      toast.error(initialData ? `Failed to update content: ${errorMessage}` : `Failed to create content: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Open search modal
  const handleOpenSearch = () => {
    setSearchModalOpen(true);
    setSearchQuery("");
    setSearchResults([]);
    
    // Focus the search input after modal is opened
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  // Select result and fill form
  const handleSelectResult = async (result: SearchResult) => {
    // Close the modal first to provide visual feedback
    setSearchModalOpen(false);
    setIsLoading(true);

    try {
      console.log('Selected content:', result);
      console.log(`Fetching details for ${result.type} with ID: ${result.id}`);
      
      let mediaData;
      if (result.type === "anime") {
        mediaData = await getAnimeById(result.id);
      } else {
        mediaData = await getMangaById(result.id);
      }

      if (!mediaData) {
        console.error(`No data returned from API for ${result.type} ID: ${result.id}`);
        toast.error("Could not retrieve details from AniList. Please fill the form manually.");
        setIsLoading(false);
        return;
      }

      console.log('API returned data:', mediaData);

      // Set form values with optional chaining to prevent errors
      form.setValue("type", mediaData.type === "ANIME" ? "anime" : "manga");
      form.setValue("title", mediaData.title?.english || mediaData.title?.romaji || "");
      
      // Convert title object to array of alternative titles
      const alternativeTitles = [];
      if (mediaData.title?.romaji) alternativeTitles.push(mediaData.title.romaji);
      if (mediaData.title?.native) alternativeTitles.push(mediaData.title.native);
      form.setValue("alternativeTitles", alternativeTitles);
      
      form.setValue("description", stripHtml(mediaData.description || ""));
      
      // Set images with null checks
      if (mediaData.coverImage?.large) {
        form.setValue("thumbnail", mediaData.coverImage.large);
      }
      if (mediaData.bannerImage) {
        form.setValue("bannerImage", mediaData.bannerImage);
      }
      
      // Set dates and genres with checks
      if (mediaData.startDate?.year) {
        form.setValue("releaseYear", parseInt(mediaData.startDate.year.toString()));
      }
      if (mediaData.season) {
        form.setValue("season", mediaData.season.toLowerCase());
      }
      if (mediaData.genres && Array.isArray(mediaData.genres)) {
        form.setValue("genres", mediaData.genres.slice(0, 4));
      }
      
      // Set external IDs - ensure it's a number
      form.setValue("anilistId", result.id);
      
      toast.success("Form populated with AniList data");
    } catch (error) {
      console.error("Error in handleSelectResult:", error);
      toast.error("Failed to populate form with AniList data. Please try again or fill manually.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to strip HTML tags from description
  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };
  
  // Map AniList status to our status format
  const mapAniListStatus = (status: string) => {
    const statusMap: Record<string, "ongoing" | "completed" | "hiatus"> = {
      "RELEASING": "ongoing",
      "FINISHED": "completed",
      "HIATUS": "hiatus",
      "CANCELLED": "completed",
      "NOT_YET_RELEASED": "ongoing"
    };
    
    return statusMap[status] || "ongoing";
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Basic Information</h2>
                <Button 
                  type="button" 
                  onClick={handleOpenSearch}
                  variant="outline"
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  Search on AniList
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="georgianTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Georgian Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Georgian title (ქართულად)" {...field} />
                      </FormControl>
                      <FormDescription>
                        Title in Georgian language (e.g. "ბერსერკი")
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>English Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter English title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="bannerImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banner Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter banner image URL" {...field} />
                    </FormControl>
                    <FormDescription>
                      URL for the banner image (16:9 recommended)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        // Convert "no_season" to undefined for the form data
                        field.onChange(value === "no_season" ? undefined : value);
                      }}
                      value={field.value || "no_season"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select season" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="no_season">None</SelectItem>
                        <SelectItem value="WINTER">Winter</SelectItem>
                        <SelectItem value="SPRING">Spring</SelectItem>
                        <SelectItem value="SUMMER">Summer</SelectItem>
                        <SelectItem value="FALL">Fall</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="releaseYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Release Year</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Release year" 
                        {...field}
                        value={field.value || ""}
                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="anilistId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AniList ID</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="AniList ID" 
                      {...field}
                      value={field.value || ""}
                      onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>
                    ID from AniList (will be filled automatically when searching)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 mt-6 border-t pt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Character Management
              </h2>
            </div>
            
            <div className="space-y-4">
              {form.watch("characters")?.map((_, index) => (
                <div 
                  key={index} 
                  className="p-4 border rounded-md bg-card"
                >
                  <div className="flex justify-between mb-3">
                    <h3 className="font-medium">Character #{index + 1}</h3>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        const currentCharacters = form.getValues("characters") || [];
                        form.setValue(
                          "characters", 
                          currentCharacters.filter((_, i) => i !== index)
                        );
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`characters.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Character name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`characters.${index}.role`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MAIN">Main</SelectItem>
                              <SelectItem value="SUPPORTING">Supporting</SelectItem>
                              <SelectItem value="BACKGROUND">Background</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`characters.${index}.image`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <Input placeholder="Character image URL" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`characters.${index}.gender`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Non-binary">Non-binary</SelectItem>
                              <SelectItem value="Unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`characters.${index}.age`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input placeholder="Character age" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const currentCharacters = form.getValues("characters") || [];
                  form.setValue("characters", [
                    ...currentCharacters,
                    { name: "", image: "", role: "SUPPORTING" }
                  ]);
                }}
                className="w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Character
              </Button>
            </div>
          </div>

          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rating (0-10)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Rating" 
                    {...field}
                    value={field.value === undefined ? "" : field.value}
                    onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    min="0"
                    max="10"
                    step="0.1"
                  />
                </FormControl>
                <FormDescription>
                  Rating from 0 to 10
                </FormDescription>
                <FormMessage />
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
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></span>
                  Saving...
                </>
              ) : initialData ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Search Modal */}
      <AnimatePresence>
        {searchModalOpen && (
          <>
            {/* Backdrop */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setSearchModalOpen(false)}
            />
            
            {/* Modal */}
            <m.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/3 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-4 rounded-2xl bg-[#121212] border border-white/10 shadow-2xl overflow-hidden">
                {/* Search header with form */}
                <form onSubmit={(e) => handleSearch(e)} className="relative">
                  <div className="flex items-center p-4">
                    <Search className="h-5 w-5 text-gray-400 mr-3" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search on AniList..."
                      className="flex-1 bg-transparent text-white placeholder:text-gray-500 focus:outline-none text-lg"
                    />
                    {searchQuery && (
                      <button 
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="p-1 text-gray-400 hover:text-white"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Toggles */}
                  <div className="border-t border-white/5 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ToggleButton
                        active={searchType === "anime"}
                        onClick={() => setSearchType("anime")}
                        icon={<Film className="h-4 w-4" />}
                        label="Anime"
                      />
                      <ToggleButton
                        active={searchType === "manga"}
                        onClick={() => setSearchType("manga")}
                        icon={<BookOpen className="h-4 w-4" />}
                        label="Manga"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      className="py-1.5 px-3 bg-primary text-white rounded-lg flex items-center gap-1 text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={searchQuery.length < 2}
                      onClick={() => handleSearch()}
                    >
                      Search
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </button>
                  </div>
                </form>
                
                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {isSearching ? (
                      <m.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-8 text-center text-gray-400"
                      >
                        <div className="w-8 h-8 rounded-full border-2 border-t-primary border-r-primary border-b-gray-700 border-l-gray-700 animate-spin mx-auto mb-3"></div>
                        <p>Searching on AniList...</p>
                      </m.div>
                    ) : searchResults.length > 0 ? (
                      <m.div
                        key="results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-1"
                      >
                        <m.div 
                          className="space-y-1"
                          variants={{
                            hidden: { opacity: 1 },
                            show: {
                              opacity: 1,
                              transition: {
                                staggerChildren: 0.05
                              }
                            }
                          }}
                          initial="hidden"
                          animate="show"
                        >
                          {searchResults.map((result) => (
                            <m.div
                              key={result.id}
                              variants={{
                                hidden: { opacity: 0, y: 10 },
                                show: { opacity: 1, y: 0 }
                              }}
                              className="p-3 hover:bg-white/5 rounded-lg cursor-pointer flex items-center gap-3 transition-colors"
                              onClick={() => handleSelectResult(result)}
                            >
                              <div className="w-12 h-16 rounded-md bg-gray-800 overflow-hidden flex-shrink-0">
                                <img 
                                  src={result.image} 
                                  alt={result.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-white">{result.title}</h3>
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  {result.type === "anime" ? (
                                    <Film className="h-3 w-3" />
                                  ) : (
                                    <BookOpen className="h-3 w-3" />
                                  )}
                                  <span className="capitalize">{result.type}</span>
                                  {result.year && <span>• {result.year}</span>}
                                </p>
                                <div className="mt-1">
                                  <button 
                                    className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded flex items-center gap-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectResult(result);
                                    }}
                                  >
                                    <Check className="h-3 w-3" /> Select
                                  </button>
                                </div>
                              </div>
                            </m.div>
                          ))}
                        </m.div>
                      </m.div>
                    ) : searchQuery.length >= 2 ? (
                      <m.div
                        key="no-results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-8 text-center text-gray-400"
                      >
                        <p>No results found on AniList</p>
                      </m.div>
                    ) : searchQuery.length > 0 ? (
                      <m.div
                        key="keep-typing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-8 text-center text-gray-400"
                      >
                        <p>Keep typing to search</p>
                      </m.div>
                    ) : (
                      <m.div
                        key="tips"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-8 text-center text-gray-400"
                      >
                        <p>Search for {searchType} on AniList to auto-fill form fields</p>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Toggle button component for anime/manga selection
function ToggleButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all",
        active 
          ? "bg-white/10 text-white" 
          : "text-gray-400 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
} 