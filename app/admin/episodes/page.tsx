"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusCircle, Pencil, Trash2, Loader2, Film, Book } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/supabase-auth-provider";

import EpisodeForm from "@/components/admin/episode-form";
import ChapterForm from "@/components/admin/chapter-form";
import { getContentById, getAllContent } from "@/lib/content";
import { supabase } from "@/lib/supabase";

// Define types for content items
type ContentItem = {
  id: string;
  title: string;
  number: number;
  releaseDate?: string;
  duration?: number;
  pages?: string[];
  [key: string]: any;
};

// Wrapper function to get all content for admin use
async function getAllContentForAdmin() {
  try {
    // Get both anime and manga content and combine them
    const animeResult = await getAllContent('anime', 100, 0);
    const mangaResult = await getAllContent('manga', 100, 0);
    
    // Extract content arrays or use empty arrays
    const animeContent = animeResult?.success ? animeResult.content || [] : [];
    const mangaContent = mangaResult?.success ? mangaResult.content || [] : [];
    
    // Combine anime and manga content
    return [...animeContent, ...mangaContent];
  } catch (error) {
    console.error("Failed to fetch all content:", error);
    return [];
  }
}

// Declare component prop types for TypeScript
declare module "@/components/admin/episode-form" {
  export interface EpisodeFormProps {
    initialData: any;
    contentId: string;
    onSuccess: () => void;
    onCancel: () => void;
  }
  export default function EpisodeForm(props: EpisodeFormProps): JSX.Element;
}

declare module "@/components/admin/chapter-form" {
  export interface ChapterFormProps {
    initialData: any;
    contentId: string;
    onSuccess: () => void;
    onCancel: () => void;
  }
  export default function ChapterForm(props: ChapterFormProps): JSX.Element;
}

export default function AdminEpisodesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState("episodes");
  const [content, setContent] = useState<any[]>([]);
  const [filteredContent, setFilteredContent] = useState<any[]>([]);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [contentDetails, setContentDetails] = useState<any | null>(null);
  const [episodes, setEpisodes] = useState<ContentItem[]>([]);
  const [chapters, setChapters] = useState<ContentItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [contentType, setContentType] = useState<string | null>(null);

  // Check auth and load content
  useEffect(() => {
    async function checkAuth() {
      if (!authLoading) {
        if (!user) {
          toast.error("Unauthorized", {
            description: "You must be logged in to access this page",
          });
          router.push("/login");
          return;
        }

        // TEMPORARY: Skip admin check during development
        // Comment this out before production!
        const isDevelopment = process.env.NODE_ENV === 'development';
        if (isDevelopment) {
          console.log("DEVELOPMENT MODE: Bypassing admin check");
          
          try {
            // Load content for dropdown
            const contentData = await getAllContentForAdmin();
            setContent(contentData);
            setFilteredContent(contentData);
            setLoading(false);
          } catch (error) {
            console.error("Failed to fetch content:", error);
            toast.error("Failed to load content data");
            setLoading(false);
          }
          return;
        }

        // Check if user is admin
        const { data: userData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
          
        if (userData?.role !== "admin") {
          toast.error("Permission Denied", {
            description: "You don't have permission to access this page",
          });
          router.push("/");
          return;
        }

        try {
          // Load content for dropdown
          const contentData = await getAllContentForAdmin();
          setContent(contentData);
          setFilteredContent(contentData);
          setLoading(false);
        } catch (error) {
          console.error("Failed to fetch content:", error);
          toast.error("Failed to load content data");
          setLoading(false);
        }
      }
    }

    checkAuth();
  }, [authLoading, user, router]);

  // Filter content based on search and type
  useEffect(() => {
    if (!content.length) return;
    
    let filtered = [...content];
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (contentType) {
      filtered = filtered.filter(item => item.type === contentType);
    }
    
    setFilteredContent(filtered);
  }, [content, searchTerm, contentType]);

  // Load episodes/chapters when content is selected
  useEffect(() => {
    async function loadContentDetails() {
      if (!selectedContent) {
        setEpisodes([]);
        setChapters([]);
        setContentDetails(null);
        return;
      }
      
      setLoading(true);
      try {
        // Get content details
        const detailsResponse = await getContentById(selectedContent);
        if (!detailsResponse.success || !detailsResponse.content) {
          toast.error("Content not found");
          setLoading(false);
          return;
        }
        
        const details = detailsResponse.content;
        setContentDetails(details);
        
        // Get episodes or chapters based on content type
        if (details.type === "anime") {
          const response = await fetch(`/api/episodes?contentId=${selectedContent}`);
          if (!response.ok) throw new Error("Failed to fetch episodes");
          const data = await response.json();
          setEpisodes(data || []);
          setActiveTab("episodes");
        } else {
          const response = await fetch(`/api/chapters?contentId=${selectedContent}`);
          if (!response.ok) throw new Error("Failed to fetch chapters");
          const data = await response.json();
          setChapters(data || []);
          setActiveTab("chapters");
        }
      } catch (error) {
        console.error("Error loading content details:", error);
        toast.error("Failed to load content details");
      } finally {
        setLoading(false);
      }
    }
    
    loadContentDetails();
  }, [selectedContent]);

  const handleAddItem = () => {
    setEditItem(null);
    setFormOpen(true);
  };

  const handleEditItem = (item: ContentItem) => {
    setEditItem(item);
    setFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    
    try {
      let endpoint = activeTab === "episodes" ? "/api/episodes" : "/api/chapters";
      const response = await fetch(`${endpoint}?id=${deleteId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) throw new Error(`Failed to delete ${activeTab === "episodes" ? "episode" : "chapter"}`);
      
      if (activeTab === "episodes") {
        setEpisodes(prev => prev.filter(item => item.id !== deleteId));
      } else {
        setChapters(prev => prev.filter(item => item.id !== deleteId));
      }
      
      toast.success(`${activeTab === "episodes" ? "Episode" : "Chapter"} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting ${activeTab === "episodes" ? "episode" : "chapter"}:`, error);
      toast.error(`Failed to delete ${activeTab === "episodes" ? "episode" : "chapter"}`);
    } finally {
      setDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  const handleFormClose = (refresh = false) => {
    setFormOpen(false);
    setEditItem(null);
    
    if (refresh && selectedContent && contentDetails) {
      setLoading(true);
      const endpoint = contentDetails.type === "anime" 
        ? `/api/episodes?contentId=${selectedContent}` 
        : `/api/chapters?contentId=${selectedContent}`;
      
      fetch(endpoint)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch ${contentDetails.type === "anime" ? "episodes" : "chapters"}`);
          return response.json();
        })
        .then(async (data) => { // Make async for notification
          if (contentDetails.type === "anime") {
            setEpisodes(data || []);
          } else {
            setChapters(data || []);
          }
          
          // Conceptual: If a new item was added (not edited), notify subscribers
          const wasCreating = !editItem; 
          if (wasCreating) {
              const itemType = contentDetails.type === 'anime' ? 'new_episode' : 'new_chapter';
              const itemNumber = data?.number || 'new'; // Get number from response if possible
              const itemName = contentDetails.title;
              
              console.log(`Conceptual: Creating ${itemType} notification for subscribers of: ${itemName}`);
              // const { success: subSuccess, userIds } = await getSubscribedUsers(selectedContent);
              // if (subSuccess && userIds && userIds.length > 0) {
              //   const notificationPromises = userIds.map(subUserId => 
              //     createNotification(subUserId, itemType, {
              //       content_id: selectedContent,
              //       content_title: itemName,
              //       message: `${itemType === 'new_episode' ? 'Episode' : 'Chapter'} ${itemNumber} of ${itemName} is out!`
              //     })
              //   );
              //   await Promise.all(notificationPromises);
              // }
          }
        })
        .catch(error => {
          console.error(`Error reloading ${contentDetails.type === "anime" ? "episodes" : "chapters"}:`, error);
          toast.error(`Failed to reload ${contentDetails.type === "anime" ? "episodes" : "chapters"}`);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  if (loading && !content.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Episode & Chapter Management</h1>
      </div>

      <div className="grid gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/3">
            <Input
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full md:w-1/3">
            <Select
              value={contentType || "all-types"}
              onValueChange={(value) => setContentType(value === "all-types" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-types">All Types</SelectItem>
                <SelectItem value="anime">Anime</SelectItem>
                <SelectItem value="manga">Manga</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-1/3">
            <Select
              value={selectedContent || "placeholder"}
              onValueChange={(value) => setSelectedContent(value === "placeholder" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select content" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder">Select Content</SelectItem>
                {Array.isArray(filteredContent) && filteredContent.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title} ({item.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {selectedContent && contentDetails ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">{contentDetails.title}</h2>
              <p className="text-sm text-muted-foreground capitalize">{contentDetails.type} • {contentDetails.status}</p>
            </div>
            <Button onClick={handleAddItem}>
              <PlusCircle className="mr-2 h-4 w-4" /> 
              Add {contentDetails.type === "anime" ? "Episode" : "Chapter"}
            </Button>
          </div>

          {contentDetails.type === "anime" ? (
            <div className="border rounded-md">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : episodes.length === 0 ? (
                <div className="text-center p-10">
                  <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No episodes found</p>
                  <Button onClick={handleAddItem} className="mt-4">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Episode
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Ep #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Release Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {episodes.map((episode) => (
                      <TableRow key={episode.id}>
                        <TableCell className="font-medium">{episode.number}</TableCell>
                        <TableCell>{episode.title}</TableCell>
                        <TableCell>{episode.duration ? `${episode.duration} min` : "N/A"}</TableCell>
                        <TableCell>{episode.releaseDate ? new Date(episode.releaseDate).toLocaleDateString() : "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <span className="sr-only">Open menu</span>
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 15 15"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                >
                                  <path
                                    d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
                                    fill="currentColor"
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                  ></path>
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditItem(episode)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteClick(episode.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : (
            <div className="border rounded-md">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : chapters.length === 0 ? (
                <div className="text-center p-10">
                  <Book className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No chapters found</p>
                  <Button onClick={handleAddItem} className="mt-4">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Chapter
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Ch #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Pages</TableHead>
                      <TableHead>Release Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chapters.map((chapter) => (
                      <TableRow key={chapter.id}>
                        <TableCell className="font-medium">{chapter.number}</TableCell>
                        <TableCell>{chapter.title}</TableCell>
                        <TableCell>{chapter.pages ? chapter.pages.length : 0} pages</TableCell>
                        <TableCell>{chapter.releaseDate ? new Date(chapter.releaseDate).toLocaleDateString() : "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <span className="sr-only">Open menu</span>
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 15 15"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                >
                                  <path
                                    d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
                                    fill="currentColor"
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                  ></path>
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditItem(chapter)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteClick(chapter.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center p-10 border rounded-md">
          <p className="text-muted-foreground">Please select a content to manage its episodes or chapters</p>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editItem 
                ? `Edit ${contentDetails?.type === "anime" ? "Episode" : "Chapter"}` 
                : `Add ${contentDetails?.type === "anime" ? "Episode" : "Chapter"}`}
            </DialogTitle>
            <DialogDescription>
              {editItem 
                ? `Update the ${contentDetails?.type === "anime" ? "episode" : "chapter"} information in the form below.`
                : `Fill out the form below to add a new ${contentDetails?.type === "anime" ? "episode" : "chapter"} to ${contentDetails?.title}.`}
            </DialogDescription>
          </DialogHeader>
          {selectedContent && contentDetails?.type === "anime" ? (
            <EpisodeForm 
              initialData={editItem} 
              contentId={selectedContent!}
              onSuccess={() => handleFormClose(true)}
              onCancel={() => setFormOpen(false)}
            />
          ) : selectedContent && contentDetails?.type === "manga" ? (
            <ChapterForm 
              initialData={editItem} 
              contentId={selectedContent!}
              onSuccess={() => handleFormClose(true)}
              onCancel={() => setFormOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {contentDetails?.type === "anime" ? "episode" : "chapter"}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 