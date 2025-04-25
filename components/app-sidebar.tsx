"use client"

import {
  BookOpen,
  Calendar,
  Clock,
  Compass,
  Download,
  History,
  Home,
  LogOut,
  Settings,
  TrendingUp,
  MessageCircle,
  Users,
  Play,
  User,
  ChevronLeft,
  ChevronRight,
  Search,
  LogIn,
  Book,
  MoveLeft
} from "lucide-react"
import { useState, useEffect } from "react"
import { motion as m, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { SearchModal } from "./search-modal"
import { useAuth } from "@/components/supabase-auth-provider"
import { signOut as nextAuthSignOut } from "next-auth/react"
import { toast } from "sonner"
import { signOutFromAllProviders } from "@/lib/auth-utils"

// Interface for sidebar items
interface SidebarItemProps {
  icon: React.ReactNode
  label: string
  isActive?: boolean
  href?: string
  accentColor?: string
  onClick?: () => void
  className?: string
}

// Sidebar item component with Link - text labels hidden in collapsed state
const SidebarItem = ({ icon, label, isActive, href, accentColor = "hsl(var(--primary))", onClick, className }: SidebarItemProps) => {
  // Common layout and styling for both button and link variants
  const contentElement = (
    <>
      {isActive && (
        <m.div 
          layoutId="activeTab"
          className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-xl border border-white/5"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      
      <div 
        className={cn(
          "flex items-center justify-center h-5 w-5 z-10 transition-all",
          isActive ? `text-[${accentColor}]` : `group-hover:text-[${accentColor}]`
        )}
      >
        {icon}
      </div>

      {isActive && (
        <m.div 
          className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--primary))] rounded-r-full"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: '100%' }}
          exit={{ opacity: 0, height: 0 }}
        />
      )}
    </>
  );

  // Shared class names for both button and link
  const sharedClassNames = cn(
    "flex items-center justify-center px-3 py-3 rounded-xl transition-all duration-200 group relative",
    isActive 
      ? "text-white" 
      : "text-white/60 hover:text-white",
    className
  );

  // Render as button if onClick is provided
  if (onClick) {
    return (
      <button 
        onClick={onClick}
        className={sharedClassNames}
        title={label}
        type="button"
      >
        {contentElement}
      </button>
    );
  }

  // Otherwise render as Link
  return (
    <Link 
      href={href || '/'}
      className={sharedClassNames}
      title={label}
    >
      {contentElement}
    </Link>
  );
};

// Section component - simplified for collapsed state
const SidebarSection = ({ title, children }: { 
  title: string,
  children: React.ReactNode
}) => (
  <div className="mb-5">
    <div className="text-xs uppercase text-gray-500 font-semibold tracking-wider text-center mb-2.5 px-1 truncate" title={title}>
      {title.charAt(0)}
    </div>
    <div className="space-y-1 px-2">
      {children}
    </div>
  </div>
);

// Main sidebar component
export function AppSidebar() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, signOut: supabaseSignOut } = useAuth();
  
  // Check if we're on mobile - only run on client side
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    // Set mounted first to avoid hydration issues
    setMounted(true);
    checkMobile();
    
    // Add event listener for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Function to toggle search modal
  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };
  
  // Handle comprehensive sign out from both providers
  const handleSignOut = async () => {
    try {
      // Use the comprehensive sign out function
      const { success, error } = await signOutFromAllProviders();
      
      if (!success) {
        throw error || new Error("Failed to sign out");
      }
      
      // Redirect to home page
      window.location.href = "/";
    } catch (error) {
      console.error("Error during sign out:", error);
      toast.error("Failed to sign out completely. Please try again.");
    }
  };
  
  // Only render after component has mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  // Mobile sidebar
  if (isMobile) {
    return (
      <>
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="fixed left-4 top-4 z-50 p-2.5 bg-black/40 backdrop-blur-lg rounded-full border border-white/10 hover:bg-black/60 transition-all"
          aria-label="Open menu"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        
        <AnimatePresence>
          {isMobileOpen && (
            <>
              <m.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                onClick={() => setIsMobileOpen(false)}
              />
              
              <m.div 
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", damping: 26, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 w-[290px] z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-r border-white/5 p-5 overflow-y-auto"
              >
                <MobileSidebarContent 
                  onClose={() => setIsMobileOpen(false)} 
                  pathname={pathname}
                  onSearchClick={() => {
                    setIsMobileOpen(false);
                    toggleSearch();
                  }}
                  user={user}
                  onSignOut={handleSignOut}
                />
              </m.div>
            </>
          )}
        </AnimatePresence>
        
        {/* Search Modal */}
        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </>
    );
  }

  // Desktop sidebar - always collapsed
  return (
    <>
      <div 
        className="fixed top-0 left-0 h-screen z-40 w-[78px] overflow-hidden"
      >
        {/* Gradient overlay for visual depth */}
        <div className="absolute inset-0 pointer-events-none" />
        
        <div className="h-full flex flex-col relative z-10">
          <div className="flex items-center justify-center p-5 pb-8">
            <Link href="/">
              <div
                className="h-11 w-11 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg"
              >
                M
              </div>
            </Link>
          </div>
          <div className="space-y-1 px-2 mb-4">
            <SidebarItem
              icon={<Home className="stroke-[1.5px]" />}
              label="Home"
              href="/"
              isActive={pathname === "/"}
            />
            <SidebarItem
              icon={<Search className="stroke-[1.5px]" />}
              label="Search"
              isActive={false}
              onClick={toggleSearch}
              className="ml-[10px]"
            />
            <SidebarItem
              icon={<Play className="stroke-[1.5px]" />}
              label="Watch"
              href="/watch"
              isActive={pathname === "/watch"}
            />
            <SidebarItem
              icon={<BookOpen className="stroke-[1.5px]" />}
              label="Read"
              href="/read"
              isActive={pathname === "/read"}
            />
          </div>
          
          <div className="space-y-1 px-2 mb-4">
            <SidebarItem
              icon={<History className="stroke-[1.5px]" />}
              label="History"
              href="/history"
              isActive={pathname === "/history"}
            />
          </div>
          
          <div className="space-y-1 px-2">
            <SidebarItem
              icon={<MessageCircle className="stroke-[1.5px]" />}
              label="Feedback"
              href="/feedback"
              isActive={pathname === "/feedback"}
            />
          </div>
          
          <div className="mt-auto pb-5 border-t border-white/5 pt-5 mx-3">
          
            <div className="space-y-1 px-2">
              {user ? (
                <>
                  <Link 
                    href="/profile"
                    className={cn(
                      "flex items-center justify-center p-2 rounded-xl transition-all duration-200 group relative",
                      pathname === "/profile" ? "bg-white/10" : "hover:bg-white/5"
                    )}
                    title="Profile"
                  >
                    <Avatar className="h-7 w-7 ring-1 ring-white/10" key={user.user_metadata?.avatar_url}>
                      <AvatarImage 
                        src={`${user.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + user.id}${user.user_metadata?.avatar_url ? `?_t=${Date.now()}` : ''}`} 
                        alt="Profile" 
                      />
                      <AvatarFallback>
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {pathname === "/profile" && (
                      <m.div 
                        className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--primary))] rounded-r-full"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: '100%' }}
                        exit={{ opacity: 0, height: 0 }}
                      />
                    )}
                  </Link>
                  <SidebarItem
                    icon={<Settings className="stroke-[1.5px]" />}
                    label="Settings"
                    href="/settings"
                    isActive={pathname === "/settings"}
                  />
                  <SidebarItem
                    icon={<LogOut className="stroke-[1.5px]" />}
                    label="Logout"
                    onClick={handleSignOut}
                    accentColor="rgb(248 113 113)"
                  />
                </>
              ) : (
                <SidebarItem
                  icon={<LogIn className="stroke-[1.5px]" />}
                  label="Login"
                  href="/login"
                  isActive={pathname === "/login"}
                  accentColor="rgb(248 113 113)"
                />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}

// Mobile-only component
function MobileSidebarContent({ 
  onClose, 
  pathname, 
  onSearchClick,
  user,
  onSignOut
}: { 
  onClose: () => void, 
  pathname: string, 
  onSearchClick: () => void,
  user: any,
  onSignOut: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <Link href="/" className="flex items-center">
          <div className="h-11 w-11 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
            M
          </div>
          <h2 className="ml-3 text-xl font-bold text-white">Manganime</h2>
        </Link>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>
      
      {user ? (
        <div className="flex items-center gap-3 p-3 mb-5 rounded-xl bg-white/5 backdrop-blur-md border border-white/5">
          <Avatar className="h-10 w-10 ring-2 ring-white/10" key={user.user_metadata?.avatar_url}>
            <AvatarImage 
              src={`${user.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + user.id}${user.user_metadata?.avatar_url ? `?_t=${Date.now()}` : ''}`} 
              alt="Profile" 
            />
            <AvatarFallback>{user.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.user_metadata?.name || user.email}</p>
            <p className="text-xs text-gray-400 truncate">Member</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 mb-5 rounded-xl bg-white/5 backdrop-blur-md border border-white/5">
          <Avatar className="h-10 w-10 ring-2 ring-white/10">
            <AvatarImage src="https://api.dicebear.com/7.x/pixel-art/svg?seed=guest" alt="Guest" />
            <AvatarFallback>G</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Guest</p>
            <p className="text-xs text-gray-400 truncate">Not signed in</p>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        <div className="mb-5">
          <h3 className="text-xs uppercase text-gray-400 font-semibold tracking-wider px-3 mb-2">Discover</h3>
          <div className="space-y-1">
            <Link 
              href="/" 
              className={cn(
                "flex items-center px-3 py-3 rounded-xl transition-colors",
                pathname === "/" 
                  ? "bg-white/10 text-white relative" 
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
              onClick={onClose}
            >
              {pathname === "/" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--primary))] rounded-r-full" />}
              <Home className={cn("h-5 w-5 mr-3 stroke-[1.5px]", pathname === "/" && "text-[hsl(var(--primary))]")} />
              <span>Home</span>
            </Link>
            <button 
              className="flex items-center px-3 py-3 rounded-xl transition-colors text-white/70 hover:text-white hover:bg-white/5 w-full text-left"
              onClick={onSearchClick}
            >
              <Search className="h-5 w-5 mr-3 stroke-[1.5px]" />
              <span>Search</span>
            </button>
            <Link 
              href="/watch" 
              className={cn(
                "flex items-center px-3 py-3 rounded-xl transition-colors",
                pathname === "/watch" 
                  ? "bg-white/10 text-white relative" 
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
              onClick={onClose}
            >
              {pathname === "/watch" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--primary))] rounded-r-full" />}
              <Play className={cn("h-5 w-5 mr-3 stroke-[1.5px]", pathname === "/watch" && "text-[hsl(var(--primary))]")} />
              <span>Watch</span>
            </Link>
          </div>
        </div>
        
        <div className="mb-5">
          <h3 className="text-xs uppercase text-gray-400 font-semibold tracking-wider px-3 mb-2">Library</h3>
          <div className="space-y-1">
            <Link 
              href="/history" 
              className={cn(
                "flex items-center px-3 py-3 rounded-xl transition-colors",
                pathname === "/history" 
                  ? "bg-white/10 text-white relative" 
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
              onClick={onClose}
            >
              {pathname === "/history" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--primary))] rounded-r-full" />}
              <History className={cn("h-5 w-5 mr-3 stroke-[1.5px]", pathname === "/history" && "text-[hsl(var(--primary))]")} />
              <span>History</span>
            </Link>
          </div>
        </div>
        
        <div className="mb-5">
          <h3 className="text-xs uppercase text-gray-400 font-semibold tracking-wider px-3 mb-2">Community</h3>
          <div className="space-y-1">
            <Link 
              href="/feedback" 
              className={cn(
                "flex items-center px-3 py-3 rounded-xl transition-colors",
                pathname === "/feedback" 
                  ? "bg-white/10 text-white relative" 
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
              onClick={onClose}
            >
              {pathname === "/feedback" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--primary))] rounded-r-full" />}
              <MessageCircle className={cn("h-5 w-5 mr-3 stroke-[1.5px]", pathname === "/feedback" && "text-[hsl(var(--primary))]")} />
              <span>Feedback</span>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="mt-auto pt-5 border-t border-white/5">
        <div>
          <h3 className="text-xs uppercase text-gray-400 font-semibold tracking-wider px-3 mb-2">Settings</h3>
          <div className="space-y-1">
            {user ? (
              <>
                <Link 
                  href="/profile" 
                  className={cn(
                    "flex items-center px-3 py-3 rounded-xl transition-colors",
                    pathname === "/profile" 
                      ? "bg-white/10 text-white relative" 
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                  onClick={onClose}
                >
                  {pathname === "/profile" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--primary))] rounded-r-full" />}
                  <User className={cn("h-5 w-5 mr-3 stroke-[1.5px]", pathname === "/profile" && "text-[hsl(var(--primary))]")} />
                  <span>Profile</span>
                </Link>
                <Link 
                  href="/settings" 
                  className={cn(
                    "flex items-center px-3 py-3 rounded-xl transition-colors",
                    pathname === "/settings" 
                      ? "bg-white/10 text-white relative" 
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                  onClick={onClose}
                >
                  {pathname === "/settings" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--primary))] rounded-r-full" />}
                  <Settings className={cn("h-5 w-5 mr-3 stroke-[1.5px]", pathname === "/settings" && "text-[hsl(var(--primary))]")} />
                  <span>Settings</span>
                </Link>
                <button 
                  className="flex items-center px-3 py-3 rounded-xl w-full text-left text-white/70 hover:text-red-400 hover:bg-white/5 transition-colors"
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                >
                  <LogOut className="h-5 w-5 mr-3 text-red-400 stroke-[1.5px]" />
                  <span className="text-red-400">Logout</span>
                </button>
              </>
            ) : (
              <Link 
                href="/login" 
                className={cn(
                  "flex items-center px-3 py-3 rounded-xl transition-colors",
                  pathname === "/login" 
                    ? "bg-white/10 text-white relative" 
                    : "text-white/70 hover:text-white hover:bg-white/5"
                )}
                onClick={onClose}
              >
                {pathname === "/login" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--primary))] rounded-r-full" />}
                <LogIn className={cn("h-5 w-5 mr-3 stroke-[1.5px]", pathname === "/login" && "text-[hsl(var(--primary))]")} />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
