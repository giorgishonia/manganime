import {
  BookOpen,
  Calendar,
  Clock,
  Compass,
  Download,
  Heart,
  History,
  Home,
  LogOut,
  Settings,
  Globe,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar className="border-r border-gray-800/20 bg-transparent" collapsible="icon">
        <SidebarHeader className="flex justify-center p-3">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 bg-indigo-600 text-white rounded-md flex items-center justify-center font-bold">
              S
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="px-2">
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Home">
                <a href="#" className="flex items-center justify-center">
                  <Home className="h-5 w-5" />
                  <span>Home</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Discover" isActive>
                <a href="#" className="flex items-center justify-center">
                  <Compass className="h-5 w-5" />
                  <span>Discover</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Library">
                <a href="#" className="flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                  <span>Library</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Calendar">
                <a href="#" className="flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                  <span>Calendar</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="History">
                <a href="#" className="flex items-center justify-center">
                  <History className="h-5 w-5" />
                  <span>History</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Watchlist">
                <a href="#" className="flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                  <span>Watchlist</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Favorites">
                <a href="#" className="flex items-center justify-center">
                  <Heart className="h-5 w-5" />
                  <span>Favorites</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Downloads">
                <a href="#" className="flex items-center justify-center">
                  <Download className="h-5 w-5" />
                  <span>Downloads</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu className="px-2">
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Language">
                <a href="#" className="flex items-center justify-center">
                  <Globe className="h-5 w-5" />
                  <span>Language</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                <a href="#" className="flex items-center justify-center">
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Logout">
                <a href="#" className="flex items-center justify-center">
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  )
}
