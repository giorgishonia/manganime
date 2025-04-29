"use client"

import {
  BookOpen,
  History,
  Home,
  LogOut,
  Settings,
  TrendingUp,
  Lightbulb,
  Users,
  Play,
  User,
  ChevronLeft,
  ChevronRight,
  Search,
  LogIn,
  Book,
  MoveLeft,
  Bell,
  X,
  Loader2,
  RefreshCw
} from "lucide-react"
import { useState, useEffect } from "react"
import { motion as m, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { SearchModal } from "./search-modal"
import { useAuth } from "@/components/supabase-auth-provider"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { 
  getUserNotifications,
  Notification,
  getUnreadNotificationCount,
  markNotificationsAsRead
} from "@/lib/notifications"

// Interface for sidebar items
interface SidebarItemProps {
  icon: React.ReactNode
  label: string
  isActive?: boolean
  href?: string
  accentColor?: string
  onClick?: () => void
  className?: string
  titleOverride?: string
}

// Sidebar item component with Link - text labels hidden in collapsed state
const SidebarItem = ({ icon, label, isActive, href, accentColor = "hsl(var(--primary))", onClick, className, titleOverride }: SidebarItemProps) => {
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
        title={titleOverride || label}
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
      title={titleOverride || label}
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
  const [isMangaReaderOpen, setIsMangaReaderOpen] = useState(false);
  const { user, signOut: supabaseSignOut } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const [notifLoadError, setNotifLoadError] = useState(false);
  
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
  
  // Check if manga reader is open
  useEffect(() => {
    const checkMangaReader = () => {
      setIsMangaReaderOpen(document.body.classList.contains('manga-reader-open'));
    };
    
    checkMangaReader();
    
    // Create a mutation observer to watch for class changes on body
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkMangaReader();
        }
      });
    });
    
    observer.observe(document.body, { attributes: true });
    return () => observer.disconnect();
  }, []);
  
  // Update the existing useEffect to fetch the unread count
  useEffect(() => {
    let isMounted = true;
    
    async function fetchUnreadCount() {
      if (user) {
        try {
          const { success, count } = await getUnreadNotificationCount(user.id);
          if (success && isMounted) {
            setUnreadCount(count || 0);
          }
        } catch (error) {
          console.error("Error fetching unread count:", error);
        }
      }
    }
    
    fetchUnreadCount();
    
    // Set up interval to periodically refresh the unread count
    const intervalId = setInterval(fetchUnreadCount, 60000); // Check every minute
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [user]);
  
  // Function to toggle search modal
  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };
  
  // Handle comprehensive sign out from both providers
  const handleSignOut = async () => {
    try {
      // Use the signOut function directly from the useAuth context
      console.log("Attempting sign out via useAuth...");
      await supabaseSignOut(); // Call the hook's signOut, assume it throws on error
      
      // If signOut doesn't throw, assume success
      console.log("Sign out successful, redirecting...");
      window.location.href = "/"; // Force reload to clear everything

    } catch (error) {
      // Catch any error thrown by supabaseSignOut or other issues
      console.error("Error during sign out:", error);
      toast.error("გასვლა ვერ მოხერხდა. გთხოვთ, სცადოთ ხელახლა.");
    }
  };
  
  // Update the openNotifications function
  const openNotifications = async () => {
    if (!user) {
      toast.error("შეტყობინებების სანახავად გთხოვთ, შეხვიდეთ სისტემაში.");
      return;
    }
    
    setIsNotificationsOpen(true);
    
    // Reset error state on each attempt
    setNotifLoadError(false);
    
    // Show loading only if we don't have cached notifications
    setIsLoadingNotifs(true);
    
    try {
      // Use a shorter timeout for better user experience
      const timeoutId = setTimeout(() => {
        // If still loading after 3 seconds, show a message
        if (isLoadingNotifs) {
          toast.info("იტვირთება შეტყობინებები...");
        }
      }, 3000);
      
      console.log("Fetching notifications for user:", user.id);
      
      // Fetch notifications with caching enabled
      const { success, notifications: fetchedNotifs, error } = await getUserNotifications(user.id);
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (success && fetchedNotifs) {
        console.log(`Successfully loaded ${fetchedNotifs.length} notifications`);
        setNotifications(fetchedNotifs);
        
        // Get unread notification IDs for marking as read
        const unreadIds = fetchedNotifs.filter(n => !n.is_read).map(n => n.id);
        
        // If we have unread notifications, mark them as read
        if (unreadIds.length > 0) {
          // Mark as read after a short delay to ensure user sees them
          setTimeout(async () => {
            try {
              await markNotificationsAsRead(user.id, unreadIds);
              setUnreadCount(0); // Update the count after marking as read
            } catch (markError) {
              console.error("Error marking notifications as read:", markError);
            }
          }, 2000);
        }
      } else {
        console.error("Failed to load notifications:", error || "Unknown error");
        setNotifLoadError(true);
        
        // Don't show error toast for cached responses
        if (!error || typeof error !== 'string' || !error.includes('cached data')) {
          toast.error("შეტყობინებების ჩატვირთვა ვერ მოხერხდა.");
        }
      }
    } catch (error) {
      console.error("Notification fetch error:", error);
      setNotifLoadError(true);
      toast.error("შეტყობინებების ჩატვირთვისას დაფიქსირდა შეცდომა.");
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  // Update the closeNotifications function
  const closeNotifications = () => {
    setIsNotificationsOpen(false);
    
    // Mark all as read when closing the panel
    if (user && notifications.length > 0) {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length > 0) {
        markNotificationsAsRead(user.id, unreadIds).then(() => {
          setUnreadCount(0);
        });
      }
    }
  };
  
  // Only render after component has mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }
  
  // Don't render sidebar when manga reader is open
  if (isMangaReaderOpen) {
    return null;
  }

  // Mobile sidebar
  if (isMobile) {
    return (
      <>
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="fixed left-4 top-4 z-50 p-2.5 bg-black/40 backdrop-blur-lg rounded-full border border-white/10 hover:bg-black/60 transition-all"
          aria-label="მენიუს გახსნა"
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
                  isNotificationsOpen={isNotificationsOpen}
                  openNotifications={openNotifications}
                  closeNotifications={closeNotifications}
                  unreadCount={unreadCount}
                  notifications={notifications}
                  isLoadingNotifs={isLoadingNotifs}
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
        {/* <div className="absolute inset-0 pointer-events-none" /> */}
        
        <div className="h-full flex flex-col relative z-10">
          <div className="flex items-center justify-center p-5 pb-8">
            <Link href="/">
              <div
                className="h-11 w-11 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg"
                title="მთავარი"
              >
                M
              </div>
            </Link>
          </div>
          <div className="space-y-1 px-2">
            <SidebarItem
              icon={<Home className="stroke-[1.5px]" />}
              label="მთავარი"
              href="/"
              isActive={pathname === "/"}
            />
            <SidebarItem
              icon={<Play className="stroke-[1.5px]" />}
              label="ყურება"
              href="/watch"
              isActive={pathname === "/watch"}
            />
            <SidebarItem
              icon={<BookOpen className="stroke-[1.5px]" />}
              label="კითხვა"
              href="/read"
              isActive={pathname === "/read"}
            />
          </div>
          
          <div className="space-y-2 px-2 mb-6">
            <SidebarItem
              icon={<History className="stroke-[1.5px]" />}
              label="ისტორია"
              href="/history"
              isActive={pathname === "/history"}
            />
            {/* Add Notifications Button */} 
            <div className="relative">
              <SidebarItem
                icon={<Bell className="stroke-[1.5px]" />}
                label="შეტყობინებები"
                onClick={openNotifications}
                className="ml-[10px]"
              />
              {/* Unread Count Badge */} 
              {unreadCount > 0 && (
                <m.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold pointer-events-none ring-2 ring-[#0a0a0a]"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </m.div>
              )}
            </div>
          </div>
          
          <div className="space-y-2 px-2 mb-6">
            <SidebarItem
              icon={<Lightbulb className="stroke-[1.5px]" />}
              label="შემოთავაზებები"
              href="/suggestions"
              isActive={pathname === "/suggestions"}
            />
             <SidebarItem
              icon={<Search className="stroke-[1.5px]" />}
              label="ძიება"
              isActive={false}
              onClick={toggleSearch}
              className="ml-[10px]"
            />
          </div>
          
          <div className="mt-auto pb-5 border-t border-white/5 pt-6 mx-3">
          
            <div className="space-y-2 px-2">
              {user ? (
                <>
                  <Link 
                    href="/profile"
                    className={cn(
                      "flex items-center justify-center p-2 rounded-xl transition-all duration-200 group relative",
                      pathname === "/profile" ? "bg-white/10" : "hover:bg-white/5"
                    )}
                    title="პროფილი"
                  >
                    <Avatar className="h-7 w-7 ring-1 ring-white/10" key={user.user_metadata?.avatar_url}>
                      <AvatarImage 
                        src={`${user.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + user.id}${user.user_metadata?.avatar_url ? `?_t=${Date.now()}` : ''}`} 
                        alt="პროფილი" 
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
                    label="პარამეტრები"
                    href="/settings"
                    isActive={pathname === "/settings"}
                  />
                  <SidebarItem
                    icon={<LogOut className="stroke-[1.5px]" />}
                    label="გასვლა"
                    onClick={handleSignOut}
                    accentColor="rgb(248 113 113)"
                    titleOverride="გასვლა"
                  />
                </>
              ) : (
                <SidebarItem
                  icon={<LogIn className="stroke-[1.5px]" />}
                  label="შესვლა"
                  href="/login"
                  isActive={pathname === "/login"}
                  accentColor="rgb(248 113 113)"
                  titleOverride="შესვლა"
                />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* --- Notification Popup --- */} 
      <AnimatePresence>
        {isNotificationsOpen && (
          <>
            {/* Click outside catcher */} 
            <m.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={closeNotifications}
            />
            
            {/* Popup Panel */} 
            <m.div 
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ type: "spring", damping: 20, stiffness: 150 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-[#111]/95 backdrop-blur-lg border-l border-white/10 shadow-2xl z-50 flex flex-col"
            >
              {/* Header */} 
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold">შეტყობინებები</h2>
                <Button variant="ghost" size="icon" onClick={closeNotifications} className="h-8 w-8">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Content */} 
              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingNotifs ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                  </div>
                ) : notifLoadError ? (
                  <div className="text-center text-gray-400 pt-8">
                    <X className="h-10 w-10 mx-auto mb-3 text-red-500" />
                    <p className="mb-4">შეტყობინებების ჩატვირთვა ვერ მოხერხდა.</p>
                    <Button 
                      onClick={() => openNotifications()} 
                      variant="outline" 
                      size="sm"
                      className="mx-auto"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      ხელახლა ცდა
                    </Button>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center text-gray-400 pt-10">
                    <Bell className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                    შეტყობინებები არ არის.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className={cn(
                          "flex items-center p-3 rounded-lg transition-colors",
                          !notif.is_read ? "bg-purple-500/10 hover:bg-purple-500/20" : "bg-white/5 hover:bg-white/10"
                        )}
                      >
                        {/* Display sender avatar if available */} 
                        {notif.sender_profile?.avatar_url && (
                           <Avatar className="h-8 w-8 mr-3 flex-shrink-0">
                              <AvatarImage src={notif.sender_profile.avatar_url} alt={notif.sender_profile.username} />
                              <AvatarFallback>{notif.sender_profile.username?.[0]?.toUpperCase() || 'მ'}</AvatarFallback>
                           </Avatar>
                        )}
                        {/* If no sender profile, maybe show a default icon? */} 
                        {!notif.sender_profile && (
                          <div className="h-8 w-8 mr-3 flex-shrink-0 flex items-center justify-center bg-gray-700 rounded-full">
                            <Bell className="h-4 w-4 text-gray-400" /> 
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm mb-1">
                            {/* Use sender_profile.username if available */} 
                            {notif.sender_profile?.username && <span className="font-medium">{notif.sender_profile.username} </span>}
                            {notif.message} 
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {/* TODO: Add link based on type/ids */} 
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Footer (Optional: Mark all read button) */} 
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Mobile-only component
function MobileSidebarContent({ 
  onClose, 
  pathname, 
  onSearchClick,
  user,
  onSignOut,
  isNotificationsOpen,
  openNotifications,
  closeNotifications,
  unreadCount,
  notifications,
  isLoadingNotifs
}: { 
  onClose: () => void;
  pathname: string; 
  onSearchClick: () => void;
  user: any;
  onSignOut: () => void;
  isNotificationsOpen: boolean;
  openNotifications: () => void;
  closeNotifications: () => void;
  unreadCount: number;
  notifications: Notification[];
  isLoadingNotifs: boolean;
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
          aria-label="მენიუს დახურვა"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>
      
      {user ? (
        <div className="flex items-center gap-3 p-3 mb-5 rounded-xl bg-white/5 backdrop-blur-md border border-white/5">
          <Avatar className="h-10 w-10 ring-2 ring-white/10" key={user.user_metadata?.avatar_url}>
            <AvatarImage 
              src={`${user.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + user.id}${user.user_metadata?.avatar_url ? `?_t=${Date.now()}` : ''}`} 
              alt="პროფილი" 
            />
            <AvatarFallback>{user.email?.charAt(0).toUpperCase() || 'მ'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.user_metadata?.name || user.email}</p>
            <p className="text-xs text-gray-400 truncate">წევრი</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 mb-5 rounded-xl bg-white/5 backdrop-blur-md border border-white/5">
          <Avatar className="h-10 w-10 ring-2 ring-white/10">
            <AvatarImage src="https://api.dicebear.com/7.x/pixel-art/svg?seed=guest" alt="სტუმარი" />
            <AvatarFallback>ს</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">სტუმარი</p>
            <p className="text-xs text-gray-400 truncate">ავტორიზაციის გარეშე</p>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        <div className="mb-5">
          <h3 className="text-xs uppercase text-gray-400 font-semibold tracking-wider px-3 mb-2">აღმოჩენა</h3>
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
              <span>მთავარი</span>
            </Link>
            <button 
              className="flex items-center px-3 py-3 rounded-xl transition-colors text-white/70 hover:text-white hover:bg-white/5 w-full text-left"
              onClick={onSearchClick}
            >
              <Search className="h-5 w-5 mr-3 stroke-[1.5px]" />
              <span>ძიება</span>
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
              <span>ყურება</span>
            </Link>
          </div>
        </div>
        
        <div className="mb-5">
          <h3 className="text-xs uppercase text-gray-400 font-semibold tracking-wider px-3 mb-2">ბიბლიოთეკა</h3>
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
              <span>ისტორია</span>
            </Link>
          </div>
        </div>
        
        <div className="mb-5">
          <h3 className="text-xs uppercase text-gray-400 font-semibold tracking-wider px-3 mb-2">საზოგადოება</h3>
          <div className="space-y-1">
            <Link 
              href="/suggestions" 
              className={cn(
                "flex items-center px-3 py-3 rounded-xl transition-colors",
                pathname === "/suggestions" 
                  ? "bg-white/10 text-white relative" 
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
              onClick={onClose}
            >
              {pathname === "/suggestions" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--primary))] rounded-r-full" />}
              <Lightbulb className={cn("h-5 w-5 mr-3 stroke-[1.5px]", pathname === "/suggestions" && "text-[hsl(var(--primary))]")} />
              <span>შემოთავაზებები</span>
            </Link>
            {/* Notification Button */} 
            <button 
              className="flex items-center px-3 py-3 rounded-xl transition-colors text-white/70 hover:text-white hover:bg-white/5 w-full text-left relative"
              onClick={openNotifications}
            >
              <Bell className={cn("h-5 w-5 mr-3 stroke-[1.5px]")} />
              <span>შეტყობინებები</span>
              {/* Unread Count Badge */} 
              {unreadCount > 0 && (
                <m.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-[#0a0a0a]"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </m.div>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-auto pt-5 border-t border-white/5">
        <div>
          <h3 className="text-xs uppercase text-gray-400 font-semibold tracking-wider px-3 mb-2">პარამეტრები</h3>
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
                  <span>პროფილი</span>
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
                  <span>პარამეტრები</span>
                </Link>
                <button 
                  className="flex items-center px-3 py-3 rounded-xl w-full text-left text-white/70 hover:text-red-400 hover:bg-white/5 transition-colors"
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                >
                  <LogOut className="h-5 w-5 mr-3 text-red-400 stroke-[1.5px]" />
                  <span className="text-red-400">გასვლა</span>
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
                <span>შესვლა</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
