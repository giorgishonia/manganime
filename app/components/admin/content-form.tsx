"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Film, 
  BookOpen, 
  X, 
  Calendar, 
  CheckSquare, 
  Image as ImageIcon,
  Upload,
  Loader2
} from "lucide-react";
import { createContent, updateContent } from "@/lib/content";
import { uploadFile } from "@/lib/upload";
import { supabase } from "@/lib/supabase";

type ContentType = "anime" | "manga";

interface ContentFormProps {
  initialData?: {
    id?: string;
    title: string;
    description: string;
    thumbnail: string;
    type: ContentType;
    status: string;
    releaseYear: number;
    genres: string[];
  };
  mode: "create" | "edit";
}

const statusOptions = {
  Ongoing: "მიმდინარე",
  Completed: "დასრულებული",
  Hiatus: "შეჩერებული",
  Cancelled: "გაუქმებული",
  Upcoming: "მალე"
};

const genreOptions = {
  Action: "მოქმედებითი", Adventure: "სათავგადასავლო", Comedy: "კომედია", Drama: "დრამა", Fantasy: "ფენტეზი", 
  Horror: "საშინელებათა", Mystery: "მისტიკა", Romance: "რომანტიკა", "Sci-Fi": "სამეცნიერო ფანტასტიკა", "Slice of Life": "ცხოვრების ნაწილი", 
  Sports: "სპორტული", Thriller: "თრილერი", Supernatural: "ზებუნებრივი", Mecha: "მექა", Music: "მუსიკალური", 
  Psychological: "ფსიქოლოგიური", Historical: "ისტორიული", School: "სკოლა", Seinen: "სეინენი", Shoujo: "შოუჯო", 
  Shounen: "შონენი"
};

export default function ContentForm({ initialData, mode }: ContentFormProps) {
  const isEditing = mode === "edit";
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    thumbnail: initialData?.thumbnail || "",
    type: initialData?.type || "anime" as ContentType,
    status: initialData?.status || "Ongoing",
    releaseYear: initialData?.releaseYear || new Date().getFullYear(),
    genres: initialData?.genres || [],
  });
  
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(initialData?.thumbnail || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };
  
  const handleTypeChange = (type: ContentType) => {
    setFormData((prev) => ({ ...prev, type }));
  };
  
  const handleGenreToggle = (genre: string) => {
    setFormData((prev) => {
      const currentGenres = [...prev.genres];
      if (currentGenres.includes(genre)) {
        return { ...prev, genres: currentGenres.filter(g => g !== genre) };
      } else {
        return { ...prev, genres: [...currentGenres, genre] };
      }
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    let finalFormData = { ...formData };

    if (thumbnailFile) {
      const uploadResult = await uploadFile(thumbnailFile, 'thumbnails');
      if (uploadResult.success && uploadResult.url) {
        finalFormData.thumbnail = uploadResult.url;
      } else {
        setError(uploadResult.error || "Failed to upload thumbnail.");
        setLoading(false);
        return;
      }
    }
    
    try {
      if (isEditing && initialData?.id) {
        await updateContent(initialData.id, finalFormData);
      } else {
        await createContent(finalFormData);
      }
      
      router.push("/admin/content");
      router.refresh();
    } catch (err) {
      console.error("Error saving content:", err);
      setError("Failed to save content. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          {isEditing ? "კონტენტის რედაქტირება" : "ახალი კონტენტის დამატება"}
        </h2>
        
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => handleTypeChange("anime")}
            className={`flex items-center px-4 py-2 rounded-lg ${
              formData.type === "anime"
                ? "bg-purple-600 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            <Film className="mr-2 h-5 w-5" />
            ანიმე
          </button>
          
          <button
            type="button"
            onClick={() => handleTypeChange("manga")}
            className={`flex items-center px-4 py-2 rounded-lg ${
              formData.type === "manga"
                ? "bg-purple-600 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            <BookOpen className="mr-2 h-5 w-5" />
            მანგა
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block mb-2 text-sm font-medium text-gray-300">
              სათაური
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block mb-2 text-sm font-medium text-gray-300">
              აღწერა
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block mb-2 text-sm font-medium text-gray-300">
                სტატუსი
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                {Object.entries(statusOptions).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="releaseYear" className="block mb-2 text-sm font-medium text-gray-300">
                გამოშვების წელი
              </label>
              <div className="flex items-center">
                <Calendar className="absolute ml-3 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  id="releaseYear"
                  name="releaseYear"
                  value={formData.releaseYear}
                  onChange={handleChange}
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  className="w-full pl-10 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              მინიატურა
            </label>
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-600 rounded-lg bg-gray-700 cursor-pointer">
              {thumbnailPreview ? (
                <div className="relative">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailPreview(null);
                      setThumbnailFile(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-gray-800 rounded-full"
                  >
                    <X className="h-4 w-4 text-gray-300" />
                  </button>
                </div>
              ) : (
                <label htmlFor="thumbnailUpload" className="flex flex-col items-center cursor-pointer">
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-400 mb-1">დააჭირეთ მინიატურის ასატვირთად</p>
                  <p className="text-xs text-gray-500">JPG, PNG ან GIF (მაქს. 2MB)</p>
                  <input
                    id="thumbnailUpload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailChange}
                  />
                </label>
              )}
            </div>
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              ჟანრები
            </label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto bg-gray-700 p-3 rounded-lg">
              {Object.entries(genreOptions).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleGenreToggle(key)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    formData.genres.includes(key)
                      ? "bg-purple-600 text-white"
                      : "bg-gray-600 text-gray-300"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-200">
          {error}
        </div>
      )}
      
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
        >
          გაუქმება
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 flex items-center justify-center bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ინახება...
            </>
          ) : isEditing ? (
            "კონტენტის განახლება"
          ) : (
            "კონტენტის შექმნა"
          )}
        </button>
      </div>
    </form>
  );
} 