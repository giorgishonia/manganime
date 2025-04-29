"use client";

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from "@/components/ui/switch";
import { Controller } from 'react-hook-form';
import { updateUserProfile } from '@/lib/users'; // Import the actual update function

// Define Zod schema for validation
const profileSchema = z.object({
  username: z.string().min(3, "მომხმარებლის სახელი უნდა იყოს მინიმუმ 3 სიმბოლო").max(50, "მომხმარებლის სახელი უნდა იყოს მაქსიმუმ 50 სიმბოლო"), // Updated messages
  bio: z.string().max(300, "ბიო უნდა იყოს მაქსიმუმ 300 სიმბოლო").optional().nullable(), // Updated messages
  is_public: z.boolean().default(true),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialData: {
    id: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
    is_public: boolean;
  };
  userId: string; // Ensure we always have the userId for the update call
  onSuccess?: (updatedData: Partial<ProfileFormData>) => void; // Callback on successful update
}

export function ProfileForm({ initialData, userId, onSuccess }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty } // Use isDirty to enable/disable save button
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: initialData.username || '',
      bio: initialData.bio || '',
      is_public: initialData.is_public ?? true,
    },
  });

  // Reset form if initialData changes (e.g., after a successful save)
  useEffect(() => {
    reset({
      username: initialData.username || '',
      bio: initialData.bio || '',
      is_public: initialData.is_public ?? true,
    });
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<ProfileFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      // Make sure boolean value is sent correctly
      const dataToSend = { ...data, is_public: !!data.is_public };
      const { success, error } = await updateUserProfile(userId, dataToSend);

      if (success) {
        toast.success("პროფილი წარმატებით განახლდა!");
        if (onSuccess) {
          onSuccess(dataToSend); // Pass updated data back to parent
        }
        reset(dataToSend); // Reset form to new default values, clearing dirty state
      } else {
        toast.error(error?.message || "პროფილის განახლება ვერ შესრულდა.");
      }
    } catch (err) {
      console.error("პროფილის ფორმის გაგზავნის დროს შეცდომა:", err);
      toast.error("შეცდომა მოხდა.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Avatar Display (Upload functionality to be added later) */}
      <div className="flex items-center space-x-4">
        <Avatar className="h-20 w-20 ring-2 ring-purple-500/30">
          <AvatarImage src={initialData.avatar_url || ''} alt={initialData.username} />
          <AvatarFallback className="text-3xl bg-gray-800">
            {initialData.username?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div>
           <p className="text-sm text-gray-400">ავატარის შეცვლა მალე იქნება შესაძლებელი.</p>
           {/* <Button type="button" variant="outline" size="sm" disabled>Change Avatar</Button> */}
        </div>
      </div>

      {/* Username */} 
      <div className="space-y-2">
        <Label htmlFor="username">მომხმარებლის სახელი</Label>
        <Input 
          id="username"
          {...register("username")}
          className="bg-black/30 border-white/10" 
        />
        {errors.username && <p className="text-sm text-red-500">{errors.username.message}</p>}
      </div>

      {/* Bio */} 
      <div className="space-y-2">
        <Label htmlFor="bio">ბიო</Label>
        <Textarea 
          id="bio"
          {...register("bio")}
          placeholder="მოგვიყევით ცოტა თქვენს შესახებ..."
          rows={4}
          className="bg-black/30 border-white/10 resize-none" 
        />
        {errors.bio && <p className="text-sm text-red-500">{errors.bio.message}</p>}
      </div>

      {/* Public Profile Toggle */}
      <div className="space-y-2 border-t border-white/10 pt-6">
        <Label htmlFor="is_public" className="text-base font-medium">პროფილის კონფიდენციალურობა</Label>
        <div className="flex items-center space-x-3 rounded-md border border-input bg-black/30 p-4">
          <Controller
            name="is_public"
            control={control}
            render={({ field }) => (
              <Switch
                id="is_public"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-readonly
              />
            )}
          />
          <div className="flex flex-col">
            <Label htmlFor="is_public" className="cursor-pointer">საჯარო პროფილი</Label>
            <p className="text-xs text-gray-400">
              სხვა მომხმარებლებს შეეძლებათ თქვენი პროფილის გვერდის, ბიბლიოთეკის და აქტივობის ნახვა.
            </p>
          </div>
        </div>
        {errors.is_public && <p className="text-sm text-red-500">{errors.is_public.message}</p>}
      </div>

      {/* Submit Button */} 
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isSubmitting || !isDirty} // Disable if submitting or form hasn't changed
          className="bg-purple-600 hover:bg-purple-700 min-w-[100px]"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "ცვლილებების შენახვა"
          )}
        </Button>
      </div>
    </form>
  );
} 