"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Users, ChevronRight, ChevronDown, PlusCircle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { ImageSkeleton } from "@/components/image-skeleton"
import { useAuth } from "@/components/supabase-auth-provider"

export interface Character {
  id: string
  name: string
  image: string
  role: string
  voiceActor?: {
    id: string
    name: string
    image: string
  } | null
}

interface CharacterSectionProps {
  characters: Character[]
  showEmpty?: boolean
  maxCharacters?: number
  sectionVariants?: any
  itemVariants?: any
  contentId?: string  // Add contentId to enable admin edit link
}

const defaultSectionVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

const defaultItemVariants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 }
}

export function CharacterSection({ 
  characters, 
  showEmpty = true,
  maxCharacters = 10,
  sectionVariants = defaultSectionVariants,
  itemVariants = defaultItemVariants,
  contentId
}: CharacterSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  
  // Add safety checks for character data
  const safeCharacters = Array.isArray(characters) ? characters : [];
  
  // Determine which characters to display
  const displayCharacters = expanded ? safeCharacters : safeCharacters.slice(0, maxCharacters);
  const hasMoreToShow = safeCharacters.length > maxCharacters;
  
  console.log("CharacterSection received:", {
    charactersProvided: !!characters,
    count: safeCharacters.length,
    invalid: !Array.isArray(characters),
    expanded,
    displayCount: displayCharacters.length,
    hasMoreToShow,
    isAdmin,
    contentId
  });

  if (safeCharacters.length === 0 && showEmpty) {
    console.log("No characters to display, showing fallback message");
    return (
      <motion.section 
        className="mb-8"
        variants={sectionVariants}
      >
        <motion.h2 
          className="text-2xl font-bold mb-4 flex items-center justify-between"
          variants={itemVariants}
        >
          <div className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-purple-400" />
            Characters
          </div>
          {isAdmin && contentId && (
            <Link 
              href={`/admin/content/edit/${contentId}?focus=characters`}
              className="text-sm flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Characters</span>
            </Link>
          )}
        </motion.h2>
        <motion.div 
          className="p-4 bg-black/30 backdrop-blur-sm border border-white/5 rounded-lg"
          variants={itemVariants}
        >
          <p className="text-gray-400">No character information available.</p>
          {isAdmin && contentId && (
            <Link 
              href={`/admin/content/edit/${contentId}?focus=characters`}
              className="mt-3 inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors text-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Characters</span>
            </Link>
          )}
        </motion.div>
      </motion.section>
    );
  }

  if (safeCharacters.length === 0 && !showEmpty) {
    return null;
  }

  return (
    <motion.section 
      className="mb-8"
      variants={sectionVariants}
    >
      <motion.h2 
        className="text-2xl font-bold mb-4 flex items-center justify-between"
        variants={itemVariants}
      >
        <div className="flex items-center">
          <Users className="mr-2 h-5 w-5 text-purple-400" />
          Characters {safeCharacters.length > 0 && <span className="ml-2 text-sm text-gray-400">({safeCharacters.length})</span>}
        </div>
        {isAdmin && contentId && (
          <Link 
            href={`/admin/content/edit/${contentId}?focus=characters`}
            className="text-sm flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Edit Characters</span>
          </Link>
        )}
      </motion.h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {displayCharacters.map((character, index) => (
          <motion.div 
            key={`character-${character.id || index}`}
            className="bg-black/30 backdrop-blur-sm border border-white/5 rounded-lg overflow-hidden transition-all duration-300"
            variants={itemVariants}
            whileHover={{ y: -5, scale: 1.03, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)" }}
          >
            <div className="aspect-square relative overflow-hidden">
              <ImageSkeleton
                src={character.image || "/placeholder-character.png"}
                alt={character.name || "Unknown character"}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm line-clamp-1">{character.name || "Unknown"}</h3>
              <p className="text-xs text-gray-400">{character.role || "Unknown role"}</p>
              
              {character.voiceActor && (
                <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden">
                    <ImageSkeleton
                      src={character.voiceActor.image || "/placeholder-character.png"}
                      alt={character.voiceActor.name || "Unknown voice actor"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs line-clamp-1">{character.voiceActor.name || "Unknown VA"}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Show view more/less button if needed */}
      {hasMoreToShow && (
        <motion.button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
          variants={itemVariants}
          whileHover={{ x: expanded ? -2 : 2 }}
        >
          {expanded ? (
            <>
              <ChevronDown className="h-4 w-4" />
              <span>Show fewer characters</span>
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4" />
              <span>Show all {safeCharacters.length} characters</span>
            </>
          )}
        </motion.button>
      )}
    </motion.section>
  );
} 