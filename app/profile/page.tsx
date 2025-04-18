"use client"

import type React from "react"

import { useState } from "react"
import {
  BookOpen,
  Calendar,
  ChevronDown,
  Clock,
  Edit,
  Eye,
  Film,
  Heart,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Plus,
  Settings,
  Star,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ImageSkeleton } from "@/components/image-skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// Sample user data
const userData = {
  username: "AnimeEnjoyer",
  displayName: "Anime Enjoyer",
  avatar: "/placeholder.svg?height=200&width=200",
  joinDate: "April 2023",
  bio: "Just a person who loves anime and manga. Currently obsessed with Jujutsu Kaisen and One Piece.",
  location: "Tokyo, Japan",
  stats: {
    anime: {
      watching: 12,
      completed: 247,
      onHold: 8,
      dropped: 15,
      planToWatch: 56,
      totalEpisodes: 3842,
      daysWatched: 68.5,
      meanScore: 7.8,
    },
    manga: {
      reading: 8,
      completed: 124,
      onHold: 5,
      dropped: 7,
      planToRead: 32,
      totalChapters: 2756,
      daysRead: 42.3,
      meanScore: 8.1,
    },
  },
}

// Sample anime lists
const animeWatching = [
  {
    id: 1,
    title: "Jujutsu Kaisen Season 2",
    image: "/placeholder.svg?height=450&width=300",
    progress: 18,
    total: 23,
    score: 9.2,
  },
  {
    id: 2,
    title: "One Piece",
    image: "/placeholder.svg?height=450&width=300",
    progress: 1082,
    total: null,
    score: 9.5,
  },
  {
    id: 3,
    title: "Demon Slayer: Swordsmith Village Arc",
    image: "/placeholder.svg?height=450&width=300",
    progress: 8,
    total: 11,
    score: 8.7,
  },
]

const animeCompleted = [
  {
    id: 4,
    title: "Attack on Titan Final Season",
    image: "/placeholder.svg?height=450&width=300",
    progress: 16,
    total: 16,
    score: 9.8,
  },
  {
    id: 5,
    title: "Fullmetal Alchemist: Brotherhood",
    image: "/placeholder.svg?height=450&width=300",
    progress: 64,
    total: 64,
    score: 9.7,
  },
  { id: 6, title: "Steins;Gate", image: "/placeholder.svg?height=450&width=300", progress: 24, total: 24, score: 9.5 },
]

const animePlanToWatch = [
  {
    id: 7,
    title: "Vinland Saga Season 2",
    image: "/placeholder.svg?height=450&width=300",
    progress: 0,
    total: 24,
    score: null,
  },
  { id: 8, title: "Monster", image: "/placeholder.svg?height=450&width=300", progress: 0, total: 74, score: null },
  { id: 9, title: "Cowboy Bebop", image: "/placeholder.svg?height=450&width=300", progress: 0, total: 26, score: null },
]

// Sample manga lists
const mangaReading = [
  {
    id: 101,
    title: "One Piece",
    image: "/placeholder.svg?height=450&width=300",
    progress: 1094,
    total: null,
    score: 9.8,
  },
  {
    id: 102,
    title: "Jujutsu Kaisen",
    image: "/placeholder.svg?height=450&width=300",
    progress: 223,
    total: null,
    score: 9.3,
  },
  {
    id: 103,
    title: "Chainsaw Man",
    image: "/placeholder.svg?height=450&width=300",
    progress: 145,
    total: null,
    score: 9.1,
  },
]

const mangaCompleted = [
  {
    id: 104,
    title: "Death Note",
    image: "/placeholder.svg?height=450&width=300",
    progress: 108,
    total: 108,
    score: 9.6,
  },
  {
    id: 105,
    title: "Fullmetal Alchemist",
    image: "/placeholder.svg?height=450&width=300",
    progress: 116,
    total: 116,
    score: 9.5,
  },
  {
    id: 106,
    title: "Tokyo Ghoul",
    image: "/placeholder.svg?height=450&width=300",
    progress: 143,
    total: 143,
    score: 8.9,
  },
]

const mangaPlanToRead = [
  { id: 107, title: "Vagabond", image: "/placeholder.svg?height=450&width=300", progress: 0, total: 327, score: null },
  { id: 108, title: "Berserk", image: "/placeholder.svg?height=450&width=300", progress: 0, total: 364, score: null },
  {
    id: 109,
    title: "Vinland Saga",
    image: "/placeholder.svg?height=450&width=300",
    progress: 0,
    total: 194,
    score: null,
  },
]

export default function ProfilePage() {
  const [activeAnimeTab, setActiveAnimeTab] = useState("watching")
  const [activeMangaTab, setActiveMangaTab] = useState("reading")
  const [activeMainTab, setActiveMainTab] = useState("anime")

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden">
        {/* Profile header */}
        <div className="relative">
          {/* Cover image */}
          <div className="h-48 bg-gradient-to-r from-purple-900 to-blue-900">
            <div className="absolute inset-0 bg-[url('/placeholder.svg?height=300&width=1200')] opacity-20 bg-cover bg-center mix-blend-overlay" />
          </div>

          {/* Profile info */}
          <div className="container mx-auto px-4">
            <div className="relative -mt-16 flex flex-col md:flex-row items-start md:items-end gap-6 pb-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-black">
                  <ImageSkeleton
                    src={userData.avatar || "/placeholder.svg"}
                    alt={userData.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button className="absolute bottom-0 right-0 bg-gray-800 hover:bg-gray-700 p-1.5 rounded-full">
                  <Edit className="h-4 w-4" />
                </button>
              </div>

              {/* User info */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <h1 className="text-3xl font-bold">{userData.displayName}</h1>
                  <div className="text-gray-400">@{userData.username}</div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {userData.joinDate}</span>
                  </div>
                  {userData.location && (
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 22C16 18 20 14.4183 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 14.4183 8 18 12 22Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>{userData.location}</span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-gray-300">{userData.bio}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 md:mt-0">
                <Button variant="outline" className="bg-gray-800 border-gray-700 hover:bg-gray-700">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="bg-gray-800 border-gray-700 hover:bg-gray-700 px-2">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
                    <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                      <Eye className="h-4 w-4 mr-2" />
                      View as public
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                      <Heart className="h-4 w-4 mr-2" />
                      Add to favorites
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-800" />
                    <DropdownMenuItem className="text-red-500 hover:bg-gray-800 hover:text-red-500 cursor-pointer">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete account
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Stats overview */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Anime stats */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <Film className="h-5 w-5 mr-2 text-blue-400" />
                  Anime Statistics
                </h2>
                <div className="text-sm text-gray-400">
                  {userData.stats.anime.totalEpisodes} episodes • {userData.stats.anime.daysWatched} days
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                <StatCard
                  label="Watching"
                  value={userData.stats.anime.watching}
                  icon={<PlayCircle className="h-4 w-4 text-green-400" />}
                />
                <StatCard
                  label="Completed"
                  value={userData.stats.anime.completed}
                  icon={<Check className="h-4 w-4 text-blue-400" />}
                />
                <StatCard
                  label="On Hold"
                  value={userData.stats.anime.onHold}
                  icon={<PauseCircle className="h-4 w-4 text-yellow-400" />}
                />
                <StatCard
                  label="Dropped"
                  value={userData.stats.anime.dropped}
                  icon={<X className="h-4 w-4 text-red-400" />}
                />
                <StatCard
                  label="Plan to Watch"
                  value={userData.stats.anime.planToWatch}
                  icon={<Clock className="h-4 w-4 text-purple-400" />}
                />
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">Mean Score</div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                  <span className="font-medium">{userData.stats.anime.meanScore}</span>
                </div>
              </div>

              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-yellow-300 h-full rounded-full"
                  style={{ width: `${(userData.stats.anime.meanScore / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Manga stats */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-purple-400" />
                  Manga Statistics
                </h2>
                <div className="text-sm text-gray-400">
                  {userData.stats.manga.totalChapters} chapters • {userData.stats.manga.daysRead} days
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                <StatCard
                  label="Reading"
                  value={userData.stats.manga.reading}
                  icon={<BookOpen className="h-4 w-4 text-green-400" />}
                />
                <StatCard
                  label="Completed"
                  value={userData.stats.manga.completed}
                  icon={<Check className="h-4 w-4 text-blue-400" />}
                />
                <StatCard
                  label="On Hold"
                  value={userData.stats.manga.onHold}
                  icon={<PauseCircle className="h-4 w-4 text-yellow-400" />}
                />
                <StatCard
                  label="Dropped"
                  value={userData.stats.manga.dropped}
                  icon={<X className="h-4 w-4 text-red-400" />}
                />
                <StatCard
                  label="Plan to Read"
                  value={userData.stats.manga.planToRead}
                  icon={<Clock className="h-4 w-4 text-purple-400" />}
                />
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">Mean Score</div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                  <span className="font-medium">{userData.stats.manga.meanScore}</span>
                </div>
              </div>

              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-yellow-300 h-full rounded-full"
                  style={{ width: `${(userData.stats.manga.meanScore / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content tabs */}
        <div className="container mx-auto px-4 py-6">
          <Tabs defaultValue="anime" value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="anime" className="flex items-center gap-2">
                <Film className="h-4 w-4" />
                Anime
              </TabsTrigger>
              <TabsTrigger value="manga" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Manga
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="anime">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      className={cn("text-sm", activeAnimeTab === "watching" ? "bg-gray-800" : "hover:bg-gray-800/50")}
                      onClick={() => setActiveAnimeTab("watching")}
                    >
                      Watching ({userData.stats.anime.watching})
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn("text-sm", activeAnimeTab === "completed" ? "bg-gray-800" : "hover:bg-gray-800/50")}
                      onClick={() => setActiveAnimeTab("completed")}
                    >
                      Completed ({userData.stats.anime.completed})
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn(
                        "text-sm",
                        activeAnimeTab === "planToWatch" ? "bg-gray-800" : "hover:bg-gray-800/50",
                      )}
                      onClick={() => setActiveAnimeTab("planToWatch")}
                    >
                      Plan to Watch ({userData.stats.anime.planToWatch})
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="text-sm hover:bg-gray-800/50">
                          More <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                          On Hold ({userData.stats.anime.onHold})
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                          Dropped ({userData.stats.anime.dropped})
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button variant="outline" className="bg-gray-800 border-gray-700 hover:bg-gray-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Anime
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {activeAnimeTab === "watching" &&
                    animeWatching.map((anime) => <AnimeListItem key={anime.id} item={anime} />)}

                  {activeAnimeTab === "completed" &&
                    animeCompleted.map((anime) => <AnimeListItem key={anime.id} item={anime} />)}

                  {activeAnimeTab === "planToWatch" &&
                    animePlanToWatch.map((anime) => <AnimeListItem key={anime.id} item={anime} />)}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manga">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      className={cn("text-sm", activeMangaTab === "reading" ? "bg-gray-800" : "hover:bg-gray-800/50")}
                      onClick={() => setActiveMangaTab("reading")}
                    >
                      Reading ({userData.stats.manga.reading})
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn("text-sm", activeMangaTab === "completed" ? "bg-gray-800" : "hover:bg-gray-800/50")}
                      onClick={() => setActiveMangaTab("completed")}
                    >
                      Completed ({userData.stats.manga.completed})
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn(
                        "text-sm",
                        activeMangaTab === "planToRead" ? "bg-gray-800" : "hover:bg-gray-800/50",
                      )}
                      onClick={() => setActiveMangaTab("planToRead")}
                    >
                      Plan to Read ({userData.stats.manga.planToRead})
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="text-sm hover:bg-gray-800/50">
                          More <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                          On Hold ({userData.stats.manga.onHold})
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                          Dropped ({userData.stats.manga.dropped})
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button variant="outline" className="bg-gray-800 border-gray-700 hover:bg-gray-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Manga
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {activeMangaTab === "reading" &&
                    mangaReading.map((manga) => <MangaListItem key={manga.id} item={manga} />)}

                  {activeMangaTab === "completed" &&
                    mangaCompleted.map((manga) => <MangaListItem key={manga.id} item={manga} />)}

                  {activeMangaTab === "planToRead" &&
                    mangaPlanToRead.map((manga) => <MangaListItem key={manga.id} item={manga} />)}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Recent Activity</h2>

                <div className="space-y-4">
                  <ActivityItem
                    type="anime"
                    action="watched"
                    title="Jujutsu Kaisen Season 2"
                    details="Episode 18"
                    time="2 hours ago"
                  />
                  <ActivityItem type="manga" action="read" title="One Piece" details="Chapter 1094" time="Yesterday" />
                  <ActivityItem
                    type="anime"
                    action="completed"
                    title="Attack on Titan Final Season"
                    details="16 episodes"
                    time="3 days ago"
                  />
                  <ActivityItem
                    type="manga"
                    action="added"
                    title="Vagabond"
                    details="to Plan to Read"
                    time="1 week ago"
                  />
                  <ActivityItem
                    type="anime"
                    action="rated"
                    title="Fullmetal Alchemist: Brotherhood"
                    details="9.7/10"
                    time="2 weeks ago"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

// Helper components
function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="font-bold">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}

function AnimeListItem({ item }: { item: any }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden">
      <div className="relative">
        <ImageSkeleton
          src={item.image || "/placeholder.svg"}
          alt={item.title}
          className="w-full aspect-[2/3] object-cover"
        />
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
              <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                <Heart className="h-4 w-4 mr-2" />
                Favorite
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-800" />
              <DropdownMenuItem className="text-red-500 hover:bg-gray-800 hover:text-red-500 cursor-pointer">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>

        {item.progress > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Progress</span>
              <span>
                {item.progress}/{item.total || "?"}
              </span>
            </div>
            <Progress value={(item.progress / (item.total || item.progress)) * 100} className="h-1" />
          </div>
        )}

        {item.score && (
          <div className="mt-2 flex items-center">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 mr-1" />
            <span className="text-xs">{item.score}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function MangaListItem({ item }: { item: any }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden">
      <div className="relative">
        <ImageSkeleton
          src={item.image || "/placeholder.svg"}
          alt={item.title}
          className="w-full aspect-[2/3] object-cover"
        />
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
              <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                <Heart className="h-4 w-4 mr-2" />
                Favorite
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-800" />
              <DropdownMenuItem className="text-red-500 hover:bg-gray-800 hover:text-red-500 cursor-pointer">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>

        {item.progress > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Progress</span>
              <span>
                {item.progress}/{item.total || "?"}
              </span>
            </div>
            <Progress value={(item.progress / (item.total || item.progress)) * 100} className="h-1" />
          </div>
        )}

        {item.score && (
          <div className="mt-2 flex items-center">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 mr-1" />
            <span className="text-xs">{item.score}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityItem({
  type,
  action,
  title,
  details,
  time,
}: {
  type: "anime" | "manga"
  action: string
  title: string
  details: string
  time: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
      <div className={`p-2 rounded-full ${type === "anime" ? "bg-blue-500/20" : "bg-purple-500/20"}`}>
        {type === "anime" ? (
          <Film className={`h-5 w-5 ${type === "anime" ? "text-blue-400" : "text-purple-400"}`} />
        ) : (
          <BookOpen className={`h-5 w-5 ${type === "anime" ? "text-blue-400" : "text-purple-400"}`} />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{action}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-300">{title}</span>
        </div>
        <div className="text-sm text-gray-400">{details}</div>
      </div>
      <div className="text-xs text-gray-500">{time}</div>
    </div>
  )
}

function Check(props: React.SVGProps<SVGSVGElement>) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
