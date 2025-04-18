import { ImageSkeleton } from "@/components/image-skeleton"

interface Character {
  id: number
  name: string
  age: string
  role: string
  image: string
}

interface CharacterCardProps {
  character: Character
}

export function CharacterCard({ character }: CharacterCardProps) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden hover:bg-gray-800 transition-colors cursor-pointer">
      <div className="aspect-square overflow-hidden">
        <ImageSkeleton
          src={character.image || "/placeholder.svg"}
          alt={character.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm">{character.name}</h3>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{character.age}</span>
          <span>{character.role}</span>
        </div>
      </div>
    </div>
  )
}
