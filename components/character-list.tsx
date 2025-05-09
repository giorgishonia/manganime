import { motion as m } from "framer-motion"
import { CharacterCard } from "@/components/character-card"

interface Character {
  id: number
  name: string
  age: string
  role: string
  image: string
}

interface CharacterListProps {
  characters: Character[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  }
}

export function CharacterList({ characters }: CharacterListProps) {
  if (!characters || characters.length === 0) {
    return (
      <div className="text-gray-400 py-2">No character information available</div>
    )
  }

  return (
    <m.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
    >
      {characters.map((character) => (
        <m.div
          key={character.id}
          variants={itemVariants}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
          <CharacterCard character={character} />
        </m.div>
      ))}
    </m.div>
  )
} 
 
 