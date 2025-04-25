"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowDownAZ, ArrowUpAZ, Loader2, Sparkles, MessageSquare, BugIcon, Lightbulb, BadgeInfo, PenTool, ChevronRight, BookOpen, Search, Filter, Plus, RefreshCcw, SortAsc } from "lucide-react";
import { useAuth } from "@/components/supabase-auth-provider";
import {
  getAllSuggestions,
  toggleVote,
  Suggestion,
} from "@/lib/feedback";
import NewSuggestionDialog from "./components/new-suggestion-dialog";
import SuggestionCard from "./components/suggestion-card";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { motion as m, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

import "./feedback.css";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export default function FeedbackPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sortOrder, setSortOrder] = useState<"popular" | "newest">("popular");
  const [filterType, setFilterType] = useState("all");
  
  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const data = await getAllSuggestions(userId);
      setSuggestions(data);
      setIsLoadingSuggestions(false);
    } catch (error) {
      console.error("Error loading suggestions:", error);
      toast.error("Could not load suggestions. Please try again later.");
      setIsLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [userId]);

  useEffect(() => {
    const type = searchParams.get("type");
    if (type && ["anime", "manga", "sticker", "gif", "feature", "bug", "improvement"].includes(type)) {
      setSelectedType(type);
    }
  }, [searchParams]);

  useEffect(() => {
    let filtered = [...suggestions];
    
    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter(
        (suggestion) => suggestion.type === selectedType
      );
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (suggestion) =>
          suggestion.title.toLowerCase().includes(query) ||
          suggestion.description.toLowerCase().includes(query)
      );
    }
    
    // Sort suggestions
    filtered.sort((a, b) => {
      if (sortOrder === "popular") {
        return b.vote_count - a.vote_count;
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    
    setFilteredSuggestions(filtered);
  }, [suggestions, selectedType, searchQuery, sortOrder]);

  const handleVote = async (suggestionId: string, hasVoted: boolean) => {
    if (!userId) {
      toast.error("You must be signed in to vote");
      return;
    }
    
    try {
      const result = await toggleVote(suggestionId, userId);
      
      // Update local state
      setSuggestions((prev) =>
        prev.map((s) => {
          if (s.id === suggestionId) {
            return {
              ...s,
              vote_count: hasVoted ? s.vote_count - 1 : s.vote_count + 1,
              has_voted: !hasVoted,
            };
          }
          return s;
        })
      );
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Could not register your vote. Please try again.");
    }
  };

  const handleNewSuggestion = (suggestion: Suggestion) => {
    setSuggestions((prev) => [suggestion, ...prev]);
    toast.success("Your suggestion has been added!");
  };

  const changeType = (value: string) => {
    setSelectedType(value);
    
    // Update URL to reflect the selected type
    if (value !== "all") {
      router.push(`/feedback?type=${value}`, { scroll: false });
    } else {
      router.push("/feedback", { scroll: false });
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case "anime": return <PenTool className="h-4 w-4 mr-2" />;
      case "manga": return <BookOpen className="h-4 w-4 mr-2" />;
      case "sticker": return <MessageSquare className="h-4 w-4 mr-2" />;
      case "bug": return <BugIcon className="h-4 w-4 mr-2" />;
      case "feature": return <Lightbulb className="h-4 w-4 mr-2" />;
      default: return <BadgeInfo className="h-4 w-4 mr-2" />;
    }
  };

  // Apply additional filtering based on UI state
  const getFilteredSuggestions = () => {
    return suggestions
      .filter((suggestion) => {
        // Filter by type
        if (filterType !== "all" && suggestion.type !== filterType) return false;

        // Filter by active tab
        if (selectedType === "voted" && !suggestion.has_voted) return false;
        if (selectedType === "mine" && suggestion.user?.id !== userId) return false;

        // Filter by search
        if (searchQuery.trim() && !suggestion.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === "popular") {
          return (b.vote_count || 0) - (a.vote_count || 0);
        } else {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });
  };

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <m.div 
        className="flex-1 px-4 sm:px-6 py-6 container pl-[70px]"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <header className="mb-8 pl-[10px] relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-indigo-900/10 rounded-xl blur-3xl opacity-30 -z-10"></div>
          <m.h1 
            className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            მოთხოვნები და უკუკავშირი
          </m.h1>
          <m.p 
            className="text-muted-foreground max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            გაგვიზიარეთ თქვენი იდეები პლატფორმისთვის ან შემოგვთავაზეთ ახალი ანიმე და მანგა.
            ჩვენ ღიად ვართ თქვენი წინადადებებისთვის და მუდმივად ვცდილობთ გავაუმჯობესოთ პლატფორმა.
          </m.p>
        </header>
        <m.div 
          className="container max-w-5xl py-6 space-y-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <m.div className="flex flex-col gap-2" variants={fadeIn}>
            <h1 className="text-2xl font-bold tracking-tight flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-purple-400" />
              უკუკავშირი
            </h1>
            <p className="text-muted-foreground">
              წარმოადგინეთ თქვენი იდეები, შეგვატყობინეთ შეცდომებისშესახებ ან შემოგვთავაზეთ გაუმჯობესებები. 
              ასევე შეგიძლიათ მისცეთ ხმა მოთხოვნებს, რომელთა დანერგვაც გსურთ.
            </p>
          </m.div>

          <m.div 
            className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
            variants={fadeIn}
          >
            <div className="flex-1 w-full sm:max-w-sm relative">
              <Input
                placeholder="მოთხოვნების ძიება..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 focus:border-purple-500 transition-all"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="flex-1 sm:flex-none bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-600/20 transition-all"
                size="sm"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                ახალი მოთხოვნა
              </Button>

              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "popular" | "newest")}>
                <SelectTrigger className="w-full sm:w-[140px] border-white/10 bg-black/30">
                  <SelectValue placeholder="დალაგება" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-900/95 backdrop-blur-md">
                  <SelectItem value="popular">
                    <div className="flex items-center">
                      <ArrowUpAZ className="h-4 w-4 mr-2" />
                      პოპულარული
                    </div>
                  </SelectItem>
                  <SelectItem value="newest">
                    <div className="flex items-center">
                      <ArrowDownAZ className="h-4 w-4 mr-2" />
                      ახალი
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </m.div>

          <m.div variants={fadeIn}>
            <Tabs value={selectedType} onValueChange={changeType} className="w-full">
              <TabsList className="w-full sm:w-auto bg-black/20 border border-white/5 p-1">
                <TabsTrigger 
                  value="all" 
                  className="flex-1 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-600/80 data-[state=active]:to-indigo-600/80 data-[state=active]:text-white"
                >
                  ყველა
                </TabsTrigger>
                <TabsTrigger 
                  value="anime" 
                  className="flex-1 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-600/80 data-[state=active]:to-indigo-600/80 data-[state=active]:text-white"
                >
                  ანიმე
                </TabsTrigger>
                <TabsTrigger 
                  value="manga" 
                  className="flex-1 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-600/80 data-[state=active]:to-indigo-600/80 data-[state=active]:text-white"
                >
                  მანგა
                </TabsTrigger>
                <TabsTrigger 
                  value="sticker" 
                  className="flex-1 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-600/80 data-[state=active]:to-indigo-600/80 data-[state=active]:text-white"
                >
                  სტიკერები
                </TabsTrigger>
                <TabsTrigger 
                  value="bug" 
                  className="flex-1 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-600/80 data-[state=active]:to-indigo-600/80 data-[state=active]:text-white"
                >
                  შეცდომები
                </TabsTrigger>
                <TabsTrigger 
                  value="feature" 
                  className="flex-1 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-600/80 data-[state=active]:to-indigo-600/80 data-[state=active]:text-white"
                >
                  ფუნქციები
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </m.div>

          <m.div 
            className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
            variants={fadeIn}
          >
            <div className="flex-1 w-full sm:max-w-sm relative">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">ტიპი</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={filterType === "all" ? "default" : "outline"} 
                  size="sm" 
                  className="justify-start text-xs"
                  onClick={() => setFilterType("all")}
                >
                  ყველა
                </Button>
                <Button 
                  variant={filterType === "bug" ? "default" : "outline"} 
                  size="sm" 
                  className="justify-start text-xs"
                  onClick={() => setFilterType("bug")}
                >
                  <BugIcon className="h-3 w-3 mr-1" /> ბაგი
                </Button>
                <Button 
                  variant={filterType === "feature" ? "default" : "outline"} 
                  size="sm" 
                  className="justify-start text-xs"
                  onClick={() => setFilterType("feature")}
                >
                  <Lightbulb className="h-3 w-3 mr-1" /> ფიჩა
                </Button>
                <Button 
                  variant={filterType === "anime" ? "default" : "outline"} 
                  size="sm" 
                  className="justify-start text-xs"
                  onClick={() => setFilterType("anime")}
                >
                  <BookOpen className="h-3 w-3 mr-1" /> ანიმე
                </Button>
                <Button 
                  variant={filterType === "manga" ? "default" : "outline"} 
                  size="sm" 
                  className="justify-start text-xs"
                  onClick={() => setFilterType("manga")}
                >
                  <PenTool className="h-3 w-3 mr-1" /> მანგა
                </Button>
              </div>
            </div>

            <div className="flex-1 w-full sm:max-w-sm relative">
              <div className="flex items-center gap-2">
                <SortAsc className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">დალაგება</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={sortOrder === "popular" ? "default" : "outline"} 
                  size="sm" 
                  className="justify-start text-xs"
                  onClick={() => setSortOrder("popular")}
                >
                  <ArrowDownAZ className="h-3 w-3 mr-1" /> პოპულარული
                </Button>
                <Button 
                  variant={sortOrder === "newest" ? "default" : "outline"} 
                  size="sm" 
                  className="justify-start text-xs"
                  onClick={() => setSortOrder("newest")}
                >
                  <ArrowUpAZ className="h-3 w-3 mr-1" /> ახალი
                </Button>
              </div>
            </div>
          </m.div>

          <AnimatePresence mode="wait">
            {isLoadingSuggestions ? (
              <m.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center items-center py-12"
              >
                <div className="loader">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                </div>
              </m.div>
            ) : getFilteredSuggestions().length === 0 ? (
              <m.div 
                key="empty"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-12 border rounded-lg bg-gradient-to-b from-black/30 to-purple-900/5 backdrop-blur-sm border-white/5"
              >
                <div className="w-16 h-16 mx-auto bg-black/30 rounded-full flex items-center justify-center border border-white/10 mb-4">
                  {selectedType !== "all" ? getTypeIcon(selectedType) : <BadgeInfo className="h-8 w-8 text-purple-400" />}
                </div>
                <h3 className="text-lg font-medium">მოთხოვნები ვერ მოიძებნა</h3>
                <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                  {searchQuery.trim()
                    ? "სცადეთ სხვა საძიებო ტერმინი"
                    : "იყავით პირველი, ვინც დაამატებს მოთხოვნას!"}
                </p>
                <Button 
                  onClick={() => setIsDialogOpen(true)} 
                  className="mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  ახალი მოთხოვნა
                </Button>
              </m.div>
            ) : (
              <m.div 
                className="space-y-4"
                key="suggestions-list"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {getFilteredSuggestions().map((suggestion) => (
                  <m.div 
                    key={suggestion.id}
                    variants={fadeIn}
                    transition={{ duration: 0.3 }}
                    layout
                  >
                    <SuggestionCard
                      suggestion={{
                        id: suggestion.id,
                        title: suggestion.title,
                        description: suggestion.description,
                        type: suggestion.type,
                        userId: suggestion.user?.id || "",
                        createdAt: suggestion.created_at,
                        votes: suggestion.vote_count,
                        userHasVoted: suggestion.has_voted,
                        profile: {
                          displayName: suggestion.user?.name || suggestion.user?.username || "Anonymous",
                          avatarUrl: suggestion.user?.image || ""
                        }
                      }}
                      onVote={() =>
                        handleVote(suggestion.id, suggestion.has_voted)
                      }
                    />
                  </m.div>
                ))}
              </m.div>
            )}
          </AnimatePresence>

          <NewSuggestionDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onSuggestionAdded={handleNewSuggestion}
          />
        </m.div>
      </m.div>
    </div>
  );
} 