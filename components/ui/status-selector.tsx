import { useState } from 'react';
import { toast } from 'sonner';
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { 
  BookOpen, 
  Play, 
  Bookmark,
  CheckCheck, 
  PauseCircle, 
  X, 
  MoreHorizontal
} from "lucide-react";
import { MediaStatus, MediaType, updateItemStatus } from "@/lib/user-library";

export interface StatusInfo {
  status: MediaStatus | null;
  icon: JSX.Element;
  label: string;
  color: string;
}

const STATUS_CONFIG = {
  manga: {
    reading: {
      icon: <BookOpen className="h-4 w-4" />,
      label: "Reading",
      color: "text-green-400",
      bgColor: "bg-green-900/20"
    },
    plan_to_read: {
      icon: <Bookmark className="h-4 w-4" />,
      label: "Plan to Read",
      color: "text-purple-400",
      bgColor: "bg-purple-900/20"
    },
    completed: {
      icon: <CheckCheck className="h-4 w-4" />,
      label: "Completed",
      color: "text-blue-400",
      bgColor: "bg-blue-900/20"
    },
    on_hold: {
      icon: <PauseCircle className="h-4 w-4" />,
      label: "On Hold",
      color: "text-yellow-400",
      bgColor: "bg-yellow-900/20"
    },
    dropped: {
      icon: <X className="h-4 w-4" />,
      label: "Dropped",
      color: "text-red-400",
      bgColor: "bg-red-900/20"
    }
  },
  anime: {
    reading: {
      icon: <Play className="h-4 w-4" />,
      label: "Watching", // Note: internally still uses "reading" status
      color: "text-green-400",
      bgColor: "bg-green-900/20"
    },
    plan_to_read: {
      icon: <Bookmark className="h-4 w-4" />,
      label: "Plan to Watch", // Note: internally still uses "plan_to_read" status
      color: "text-purple-400", 
      bgColor: "bg-purple-900/20"
    },
    completed: {
      icon: <CheckCheck className="h-4 w-4" />,
      label: "Completed",
      color: "text-blue-400",
      bgColor: "bg-blue-900/20"
    },
    on_hold: {
      icon: <PauseCircle className="h-4 w-4" />,
      label: "On Hold",
      color: "text-yellow-400",
      bgColor: "bg-yellow-900/20"
    },
    dropped: {
      icon: <X className="h-4 w-4" />,
      label: "Dropped",
      color: "text-red-400",
      bgColor: "bg-red-900/20"
    }
  }
};

// Default status info when no status is selected
const DEFAULT_STATUS_INFO: StatusInfo = {
  status: null,
  icon: <MoreHorizontal className="h-4 w-4" />,
  label: "Add to Library",
  color: "text-gray-400"
};

interface StatusSelectorProps {
  mediaId: string;
  mediaType: MediaType;
  mediaTitle: string;
  mediaThumbnail: string;
  currentStatus: MediaStatus | null;
  currentProgress?: number;
  totalItems?: number;
  score?: number;
  onStatusChange?: (newStatus: MediaStatus | null) => void;
  compact?: boolean;
  className?: string;
}

export function StatusSelector({
  mediaId,
  mediaType,
  mediaTitle,
  mediaThumbnail,
  currentStatus,
  currentProgress = 0,
  totalItems,
  score,
  onStatusChange,
  compact = false,
  className,
}: StatusSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Get the status info object for the current status
  const getStatusInfo = (status: MediaStatus | null): StatusInfo => {
    if (!status) return DEFAULT_STATUS_INFO;
    
    const config = STATUS_CONFIG[mediaType][status];
    return {
      status,
      icon: config.icon,
      label: config.label,
      color: config.color
    };
  };
  
  const statusInfo = getStatusInfo(currentStatus);
  
  const handleStatusChange = async (status: MediaStatus) => {
    if (isUpdating) return;
    setIsUpdating(true);
    
    try {
      // If trying to set the same status, remove from library
      if (currentStatus === status) {
        // Handle removal
        // This would require a removeFromLibrary function to be called
        // For now we'll just set it to the status anyway
        await updateItemStatus(
          mediaId,
          mediaType,
          status,
          mediaTitle,
          mediaThumbnail,
          currentProgress,
          totalItems,
          score
        );
      } else {
        // Update to new status
        await updateItemStatus(
          mediaId,
          mediaType,
          status,
          mediaTitle,
          mediaThumbnail,
          currentProgress,
          totalItems,
          score
        );
      }
      
      // Notify parent component
      if (onStatusChange) {
        onStatusChange(status);
      }
      
      toast({
        title: "Status Updated",
        description: `"${mediaTitle}" marked as ${status.replace('_', ' ')}`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        duration: 3000,
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "px-3 py-2 border rounded-md flex items-center gap-2 transition-all",
            currentStatus
              ? "bg-black/40 border-white/20 hover:border-white/30" 
              : "bg-black/30 border-gray-700 hover:border-gray-500",
            className
          )}
          disabled={isUpdating}
        >
          <span className={statusInfo.color}>{statusInfo.icon}</span>
          {!compact && <span className="hidden md:inline">{statusInfo.label}</span>}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-48 bg-gray-900/95 backdrop-blur-md border-white/10">
        {Object.entries(STATUS_CONFIG[mediaType]).map(([key, value]) => {
          const status = key as MediaStatus;
          return (
            <DropdownMenuItem 
              key={status}
              className={currentStatus === status ? value.bgColor + " " + value.color : ""}
              onClick={() => handleStatusChange(status)}
            >
              {value.icon}
              <span className="ml-2">{value.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 