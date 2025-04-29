"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2, Sparkles, UserCheck, ListChecks, MapPin, Cake, Send } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from '@/components/supabase-auth-provider';
import { toast } from 'sonner';
import { 
  checkUsernameAvailability, 
  completeOnboarding, 
  getProfileForUser,
  UserProfile 
} from '@/lib/users';

// --- Zod Schema with Async Refinement --- 

const onboardingSchema = z.object({
  first_name: z.string().max(50, "სახელი ძალიან გრძელია").optional().nullable(),
  last_name: z.string().max(50, "გვარი ძალიან გრძელია").optional().nullable(),
  username: z.string()
    .min(3, "მომხმარებლის სახელი უნდა იყოს 3-20 სიმბოლო")
    .max(20, "მომხმარებლის სახელი უნდა იყოს 3-20 სიმბოლო")
    .regex(/^[a-zA-Z0-9_]+$/, "მომხმარებლის სახელი შეიძლება შეიცავდეს მხოლოდ ლათინურ ასოებს, ციფრებს და ქვედა ტირეს")
    // Add refine for availability check - runs AFTER other checks pass
    .refine(async (username) => {
      // Skip check if username is too short (already handled by min)
      if (username.length < 3) return true; 
      return await checkUsernameAvailability(username);
    }, {
      message: "მომხმარებლის სახელი დაკავებულია.",
      // Optionally specify path: ['username'] if needed, but usually inferred
    }),
  interests: z.array(z.string()).optional().default([]), // e.g., ["anime", "manga"]
  location: z.string().max(100, "მდებარეობა ძალიან გრძელია").optional().nullable(),
  birth_date: z.date().optional().nullable(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

// Define steps and their required fields for progressive validation
const steps = [
  { id: 1, name: 'ძირითადი ინფორმაცია', fields: ['first_name', 'last_name', 'username'] },
  { id: 2, name: 'ინტერესები', fields: ['interests'] },
  { id: 3, name: 'დამატებითი დეტალები', fields: ['location', 'birth_date'] },
  { id: 4, name: 'მიმოხილვა', fields: [] }, // No fields needed for review step
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [checkingOnboardingStatus, setCheckingOnboardingStatus] = useState(true);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    control,
    formState: { errors, isValid, isSubmitting },
    getValues,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onChange', 
    // Note: Async refine might affect instant feedback, consider UX
  });

  const watchedUsername = watch("username");

  // Redirect if user is not logged in or already onboarded
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("გთხოვთ, ჯერ შეხვიდეთ სისტემაში.");
      router.push('/login');
      setCheckingOnboardingStatus(false);
      return;
    }

    if (user && checkingOnboardingStatus) {
      const checkStatus = async () => {
        try {
          console.log("OnboardingPage: Checking onboarding status...");
          const profile = await getProfileForUser(user.id);
          if (profile?.has_completed_onboarding) {
            toast.info("პროფილი უკვე შევსებულია!");
            console.log("OnboardingPage: User already onboarded, redirecting home.");
            router.push('/');
          } else {
            console.log("OnboardingPage: User needs onboarding or profile check failed.");
            setCheckingOnboardingStatus(false);
          }
        } catch (error) {
          console.error("OnboardingPage: Failed to check onboarding status:", error);
          toast.error("პროფილის სტატუსის შემოწმება ვერ მოხერხდა. ვაგრძელებთ პროფილის შევსებას.");
          setCheckingOnboardingStatus(false);
        }
      };
      checkStatus();
    } else if (!user && !authLoading) {
      setCheckingOnboardingStatus(false);
      console.log("OnboardingPage: User logged out, redirecting to login.");
      router.push('/login');
    }
  }, [user, authLoading, router, checkingOnboardingStatus]);

  const handleNextStep = async () => {
    const fieldsToValidate = steps[currentStep - 1].fields as (keyof OnboardingFormData)[];
    const isValidStep = await trigger(fieldsToValidate);

    if (isValidStep) {
      if (currentStep < steps.length) {
        setCurrentStep(prev => prev + 1);
      }
    } else {
       // Optional: Show a general toast if validation fails for the step
       toast.error("გთხოვთ, შეასწოროთ შეცდომები გასაგრძელებლად."); 
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const onSubmit: SubmitHandler<OnboardingFormData> = async (data) => {
    if (currentStep !== steps.length) return; 
    if (!user) return; 

    try {
       const dataToSend = {
         ...data,
         birth_date: data.birth_date ? format(data.birth_date, 'yyyy-MM-dd') : null,
       };
       // Remove nullish values that Supabase might reject if column isn't nullable
       Object.keys(dataToSend).forEach(key => {
         if (dataToSend[key as keyof typeof dataToSend] === null || dataToSend[key as keyof typeof dataToSend] === undefined) {
           // Keep null for birth_date if intended, otherwise delete
           if (key !== 'birth_date') {
             delete dataToSend[key as keyof typeof dataToSend];
           }
         }
       });

      const { success, error } = await completeOnboarding(user.id, dataToSend);
      if (success) {
        toast.success("კეთილი იყოს თქვენი მობრძანება! პროფილი წარმატებით შეიქმნა.");
        router.push('/'); 
        router.refresh(); 
      } else {
        // Handle specific errors like username taken again, if API returns it
        if (error?.message?.includes('Username already taken')) {
           toast.error("მომხმარებლის სახელი დაკავებულია. გთხოვთ, დაბრუნდეთ და აირჩიოთ სხვა.");
           // Optionally force back to step 1: setCurrentStep(1);
        } else {
          toast.error(error?.message || "პროფილის შენახვა ვერ მოხერხდა.");
        }
      }
    } catch (err) { 
      console.error("Onboarding submission error:", err);
      toast.error("დაფიქსირდა შეცდომა.");
    } 
  };
  
  const pageIsLoading = authLoading || (!user && !authLoading) || checkingOnboardingStatus;

  if (pageIsLoading) {
     return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    ); 
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 p-4">
      <motion.div 
        className="w-full max-w-xl p-8 space-y-6 bg-black/40 rounded-xl backdrop-blur-lg border border-white/10 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center mb-4">
          <Sparkles className="h-10 w-10 mx-auto text-purple-400 mb-2" />
          <h1 className="text-2xl font-bold text-white">კეთილი იყოს თქვენი მობრძანება Manganime-ში!</h1>
          <p className="text-gray-300 mt-1">მოდით, შევავსოთ თქვენი პროფილი ({currentStep}/{steps.length - 1})</p> {/* Exclude Review step from count */}
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-1.5 mb-6">
          <motion.div 
            className="bg-purple-600 h-1.5 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${(currentStep / steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 1: Basic Info */} 
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="first_name" className="text-gray-300">სახელი (არასავალდებულო)</Label>
                      <Input id="first_name" {...register("first_name")} placeholder="მაგ., გიორგი" className="bg-black/30 border-white/10" />
                      {errors.first_name && <p className="text-xs text-red-400">{errors.first_name.message}</p>}
                    </div>
                     <div className="space-y-1.5">
                      <Label htmlFor="last_name" className="text-gray-300">გვარი (არასავალდებულო)</Label>
                      <Input id="last_name" {...register("last_name")} placeholder="მაგ., ბერიძე" className="bg-black/30 border-white/10" />
                      {errors.last_name && <p className="text-xs text-red-400">{errors.last_name.message}</p>}
                    </div>
                  </div>
                   <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-gray-300">მომხმარებლის სახელი *</Label>
                      <Input 
                        id="username" 
                        {...register("username")} 
                        placeholder="აირჩიეთ უნიკალური მომხმარებლის სახელი" 
                        className="bg-black/30 border-white/10" 
                      />
                      {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
                    </div>
                </div>
              )}
              
              {/* Step 2: Interests */} 
              {currentStep === 2 && (
                <div className="space-y-3">
                  <Label className="text-base font-medium text-gray-200">რა გაინტერესებთ?</Label>
                   <p className="text-sm text-gray-400">აირჩიეთ ყველა შესაბამისი. ეს დაგვეხმარება გამოცდილების პერსონალიზებაში.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {[ { id: 'anime', label: 'ანიმე' }, { id: 'manga', label: 'მანგა' } ].map((item) => (
                      <Controller
                        key={item.id}
                        name="interests"
                        control={control}
                        render={({ field }) => (
                          <Label 
                            htmlFor={item.id}
                            className={cn(
                              "flex items-center space-x-3 rounded-md border p-4 cursor-pointer transition-all",
                              field.value?.includes(item.id) ? 'border-purple-500 bg-purple-900/20' : 'border-white/10 bg-black/30 hover:bg-black/40'
                            )}
                          >
                            <Checkbox 
                              id={item.id}
                              checked={field.value?.includes(item.id)} 
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), item.id])
                                  : field.onChange(field.value?.filter((value) => value !== item.id));
                              }}
                              className={cn(
                                 "transition-colors",
                                 field.value?.includes(item.id) ? "border-purple-500 data-[state=checked]:bg-purple-600 data-[state=checked]:text-white" : "border-gray-500"
                              )}
                            />
                            <span>{item.label}</span>
                          </Label>
                        )}
                      />
                    ))}
                  </div>
                  {errors.interests && <p className="text-xs text-red-400">{errors.interests.message}</p>}
                </div>
              )}

              {/* Step 3: Optional Details */} 
              {currentStep === 3 && (
                 <div className="space-y-4">
                   <p className="text-sm text-gray-400">ეს დეტალები არასავალდებულოა და შეგიძლიათ მოგვიანებით დაამატოთ.</p>
                   <div className="space-y-1.5">
                      <Label htmlFor="location" className="text-gray-300">მდებარეობა</Label>
                      <div className="relative">
                         <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                         <Input id="location" {...register("location")} placeholder="მაგ., თბილისი, საქართველო" className="bg-black/30 border-white/10 pl-10" />
                      </div>
                      {errors.location && <p className="text-xs text-red-400">{errors.location.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                       <Label htmlFor="birth_date" className="text-gray-300">დაბადების თარიღი</Label>
                        <Controller
                           name="birth_date"
                           control={control}
                           render={({ field }) => (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full justify-start text-left font-normal bg-black/30 border-white/10 hover:bg-black/40",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>აირჩიეთ თარიღი</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={field.value ?? undefined}
                                    onSelect={field.onChange}
                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                    initialFocus
                                    captionLayout="dropdown-buttons"
                                    fromYear={1950}
                                    toYear={new Date().getFullYear() - 5} // Example: minimum 5 years old
                                  />
                                </PopoverContent>
                              </Popover>
                           )}
                       />
                      {errors.birth_date && <p className="text-xs text-red-400">{errors.birth_date.message}</p>}
                    </div>
                 </div>
              )}

              {/* Step 4: Review */} 
              {currentStep === 4 && (
                 <div className="space-y-4">
                    <h3 className="font-medium text-lg text-gray-200">ინფორმაციის მიმოხილვა</h3>
                    <div className="space-y-2 text-sm bg-black/20 p-4 rounded-md border border-white/10">
                      <p><strong className="text-gray-400">მომხმარებლის სახელი:</strong> {getValues("username")}</p>
                      <p><strong className="text-gray-400">სახელი:</strong> {getValues("first_name") || '-'}</p>
                      <p><strong className="text-gray-400">გვარი:</strong> {getValues("last_name") || '-'}</p>
                      <p><strong className="text-gray-400">ინტერესები:</strong> {getValues("interests")?.map(i => i === 'anime' ? 'ანიმე' : i === 'manga' ? 'მანგა' : i).join(', ') || 'არჩეული არ არის'}</p>
                      <p><strong className="text-gray-400">მდებარეობა:</strong> {getValues("location") || '-'}</p>
                      <p><strong className="text-gray-400">დაბადების თარიღი:</strong> {getValues("birth_date") ? format(getValues("birth_date")!, 'PPP') : '-'}</p>
                    </div>
                 </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */} 
          <div className="flex justify-between pt-4 border-t border-white/10 mt-6">
            <Button 
              type="button"
              variant="outline"
              onClick={handlePreviousStep} 
              disabled={currentStep === 1 || isSubmitting}
              className={cn(currentStep === 1 && "invisible")}
            >
              უკან
            </Button>
            
            {currentStep < steps.length ? (
              <Button 
                type="button"
                onClick={handleNextStep}
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 min-w-[100px]"
              >
                {currentStep === steps.length - 1 ? 'მიმოხილვა' : 'შემდეგი'}
              </Button>
            ) : (
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 min-w-[100px] flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><Send className="h-4 w-4" /> დაყენების დასრულება</>
                )}
              </Button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
} 