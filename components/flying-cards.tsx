"use client"

import { useEffect, useRef } from "react"
import { motion as m, useAnimation, useInView } from "framer-motion"

// Sample card data with both anime and manga
const cardData = [
  { type: "anime", title: "Attack on Titan", image: "/placeholder.svg?height=450&width=300" },
  { type: "manga", title: "One Piece", image: "/placeholder.svg?height=450&width=300" },
  { type: "anime", title: "Demon Slayer", image: "/placeholder.svg?height=450&width=300" },
  { type: "manga", title: "Berserk", image: "/placeholder.svg?height=450&width=300" },
  { type: "anime", title: "Jujutsu Kaisen", image: "/placeholder.svg?height=450&width=300" },
  { type: "manga", title: "Chainsaw Man", image: "/placeholder.svg?height=450&width=300" },
  { type: "anime", title: "My Hero Academia", image: "/placeholder.svg?height=450&width=300" },
  { type: "manga", title: "Vagabond", image: "/placeholder.svg?height=450&width=300" },
  { type: "anime", title: "Fullmetal Alchemist", image: "/placeholder.svg?height=450&width=300" },
  { type: "manga", title: "Vinland Saga", image: "/placeholder.svg?height=450&width=300" },
  { type: "anime", title: "Hunter x Hunter", image: "/placeholder.svg?height=450&width=300" },
  { type: "manga", title: "Tokyo Ghoul", image: "/placeholder.svg?height=450&width=300" },
]

// Generate random position and rotation for each card
const generateRandomProps = () => {
  return {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    rotate: Math.random() * 40 - 20,
    scale: 0.6 + Math.random() * 0.4,
  }
}

export function FlyingCards() {
  const controls = useAnimation()
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef)

  useEffect(() => {
    if (isInView) {
      controls.start("animate")
    }
  }, [controls, isInView])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {cardData.map((card, index) => {
        // Determine starting position (top, right, bottom, or left edge)
        const startEdge = Math.floor(Math.random() * 4)
        const endEdge = (startEdge + 2) % 4 // Opposite edge

        let startX, startY, endX, endY

        // Set starting position
        switch (startEdge) {
          case 0: // Top
            startX = Math.random() * window.innerWidth
            startY = -300
            break
          case 1: // Right
            startX = window.innerWidth + 300
            startY = Math.random() * window.innerHeight
            break
          case 2: // Bottom
            startX = Math.random() * window.innerWidth
            startY = window.innerHeight + 300
            break
          case 3: // Left
            startX = -300
            startY = Math.random() * window.innerHeight
            break
        }

        // Set ending position
        switch (endEdge) {
          case 0: // Top
            endX = Math.random() * window.innerWidth
            endY = -300
            break
          case 1: // Right
            endX = window.innerWidth + 300
            endY = Math.random() * window.innerHeight
            break
          case 2: // Bottom
            endX = Math.random() * window.innerWidth
            endY = window.innerHeight + 300
            break
          case 3: // Left
            endX = -300
            endY = Math.random() * window.innerHeight
            break
        }

        // Random duration between 15-25 seconds
        const duration = 15 + Math.random() * 10

        // Random delay so cards don't all start at once
        const delay = Math.random() * 10

        // Random rotation
        const rotation = Math.random() * 360
        const rotationEnd = rotation + Math.random() * 360 - 180

        // Random scale
        const scale = 0.4 + Math.random() * 0.3

        // Random z-index for layering
        const zIndex = Math.floor(Math.random() * 10)

        return (
          <m.div
            key={index}
            className="absolute"
            style={{
              zIndex,
              perspective: "1000px",
              transformStyle: "preserve-3d",
            }}
            initial={{
              x: startX,
              y: startY,
              rotateX: 0,
              rotateY: 0,
              rotateZ: rotation,
              scale,
            }}
            animate={{
              x: endX,
              y: endY,
              rotateX: Math.random() * 30 - 15,
              rotateY: Math.random() * 30 - 15,
              rotateZ: rotationEnd,
              scale,
            }}
            transition={{
              duration,
              delay,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
            }}
          >
            <div
              className={`w-48 h-64 rounded-lg overflow-hidden shadow-lg ${
                card.type === "anime" ? "border-2 border-blue-500" : "border-2 border-purple-500"
              }`}
              style={{
                transformStyle: "preserve-3d",
                transform: "rotateY(10deg) rotateX(5deg)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              <div className="relative h-full">
                <img src={card.image || "/placeholder.svg"} alt={card.title} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <div className="text-sm font-medium text-white truncate">{card.title}</div>
                  <div className={`text-xs ${card.type === "anime" ? "text-blue-300" : "text-purple-300"}`}>
                    {card.type === "anime" ? "Anime" : "Manga"}
                  </div>
                </div>

                {/* Badge for type */}
                <div
                  className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${
                    card.type === "anime" ? "bg-blue-500/80 text-white" : "bg-purple-500/80 text-white"
                  }`}
                >
                  {card.type === "anime" ? "ANIME" : "MANGA"}
                </div>
              </div>
            </div>
          </m.div>
        )
      })}
    </div>
  )
}
