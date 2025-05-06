"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

// Define sticker categories and their items
const STICKER_CATEGORIES = [
  {
    name: 'Anime',
    stickers: [
      { id: 'anime1', url: '/stickers/anime/dance.gif', alt: 'Dance anime' },
      { id: 'anime2', url: '/stickers/anime/sad.gif', alt: 'Sad anime' },
      { id: 'anime3', url: '/stickers/anime/love.gif', alt: 'Love anime' },
      { id: 'anime4', url: '/stickers/anime/angry.gif', alt: 'Angry anime' },
      { id: 'anime5', url: '/stickers/anime/surprised.gif', alt: 'Surprised anime' },
      { id: 'anime6', url: '/stickers/anime/laugh.gif', alt: 'Laugh anime' },
    ]
  },
  {
    name: 'Manga',
    stickers: [
      { id: 'manga1', url: '/stickers/manga/baka.gif', alt: 'Baka' },
      { id: 'manga2', url: '/stickers/manga/statue-smile.gif', alt: 'Smile manga' },
      { id: 'manga3', url: '/stickers/manga/guts.gif', alt: 'Berserk manga' },
      { id: 'manga4', url: '/stickers/manga/musashi.gif', alt: 'Vagabond manga' },
      { id: 'manga5', url: '/stickers/manga/climber.gif', alt: 'The climber manga' },
      { id: 'manga6', url: '/stickers/manga/punpun.gif', alt: 'Punpun manga' },
    ]
  }
]

export interface Sticker {
  id: string
  url: string
  alt: string
}

interface StickerSelectorProps {
  onSelectSticker: (sticker: Sticker) => void
  onClose: () => void
}

export function StickerSelector({ onSelectSticker, onClose }: StickerSelectorProps) {
  const [activeCategory, setActiveCategory] = useState(STICKER_CATEGORIES[0].name) // Default to Anime category
  
  const handleStickerClick = (sticker: Sticker) => {
    onSelectSticker(sticker)
    onClose()
  }
  
  return (
    <motion.div 
      className="absolute bottom-full left-0 mb-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-4 w-80 z-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">Select a Sticker</h3>
        <div 
          className="h-6 w-6 p-0 text-gray-400 hover:text-white flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </div>
      </div>
      
      {/* Category tabs */}
      <div className="flex space-x-1 mb-3 overflow-x-auto pb-1 scrollbar-hide">
        {STICKER_CATEGORIES.map((category) => (
          <button
            key={category.name}
            className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap ${
              activeCategory === category.name
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-gray-300'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveCategory(category.name);
            }}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Stickers grid */}
      <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
        {STICKER_CATEGORIES.find(c => c.name === activeCategory)?.stickers.map((sticker) => (
          <button
            key={sticker.id}
            className="relative bg-black/50 border border-white/5 rounded-md hover:border-white/20 transition-all h-20 overflow-hidden flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              handleStickerClick(sticker);
            }}
          >
            <Image
              src={sticker.url}
              alt={sticker.alt}
              width={64}
              height={64}
              className="object-contain max-h-full max-w-full"
            />
          </button>
        ))}
      </div>
    </motion.div>
  )
} 