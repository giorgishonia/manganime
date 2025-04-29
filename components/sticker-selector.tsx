"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
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
    name: 'Reactions',
    stickers: [
      { id: 'reaction1', url: '/stickers/reactions/lol.gif', alt: 'LOL' },
      { id: 'reaction2', url: '/stickers/reactions/wow.gif', alt: 'Wow' },
      { id: 'reaction3', url: '/stickers/reactions/cool.gif', alt: 'Cool' },
      { id: 'reaction4', url: '/stickers/reactions/facepalm.gif', alt: 'Facepalm' },
      { id: 'reaction5', url: '/stickers/reactions/thinking.gif', alt: 'Thinking' },
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
  },
  // For development/testing - using actual accessible GIFs
  {
    name: 'Test',
    stickers: [
      { id: 'test1', url: 'https://media.tenor.com/BEfvQnxnYgEAAAAi/bunny-cute.gif', alt: 'Bunny' },
      { id: 'test2', url: 'https://media.tenor.com/oDz2eTc4kLIAAAAi/pikachu-happy.gif', alt: 'Pikachu' },
      { id: 'test3', url: 'https://media.tenor.com/tMxsyVcq1HEAAAAC/anime-love.gif', alt: 'Anime love' },
      { id: 'test4', url: 'https://media.tenor.com/Gt6-uKqJl8QAAAAC/anime-girl.gif', alt: 'Anime girl' },
      { id: 'test5', url: 'https://media.tenor.com/uIm2qPDp_NkAAAAd/anime-funny.gif', alt: 'Anime funny' },
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
  const [activeCategory, setActiveCategory] = useState(STICKER_CATEGORIES[3].name) // Default to Test category for now
  
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
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">Select a Sticker</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
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
            onClick={() => setActiveCategory(category.name)}
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
            onClick={() => handleStickerClick(sticker)}
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