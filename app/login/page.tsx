"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion as m } from "framer-motion"
import { LucideMessagesSquare, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import Link from "next/link"
import { useAuth } from "@/components/supabase-auth-provider"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { signIn, signUp } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError("Email and password are required")
      return
    }
    
    setIsLoading(true)
    setError("")
    
    try {
      const result = await signIn(email, password)
      
      if (!result.success) {
        setError(result.error?.message || "Invalid email or password")
        setIsLoading(false)
        return
      }
      
      // Success - redirect to homepage
      router.push("/")
      router.refresh()
    } catch (err) {
      console.error("Login error:", err)
      setError("Something went wrong. Please try again.")
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password || !username) {
      setError("All fields are required")
      return
    }
    
    setIsLoading(true)
    setError("")
    
    try {
      // Use our auth provider's signUp method
      const result = await signUp(email, password, username)
      
      if (!result.success) {
        setError(result.error?.message || "Registration failed")
        setIsLoading(false)
        return
      }
      
      // Success - redirect to homepage
      router.push("/")
      router.refresh()
    } catch (err: any) {
      console.error("Registration error:", err)
      setError(err.message || "Something went wrong. Please try again.")
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: string) => {
    setIsLoading(true)
    try {
      if (provider === "google") {
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        })
      } else if (provider === "discord") {
        await supabase.auth.signInWithOAuth({
          provider: "discord",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        })
      }
    } catch (error) {
      console.error("OAuth error:", error)
      setIsLoading(false)
      setError("Failed to sign in with OAuth provider")
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#070707] flex items-center justify-center">
      <m.div 
        className="w-full max-w-md p-8 space-y-8 bg-zinc-900/50 rounded-xl backdrop-blur-md border border-zinc-800"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Welcome to Manganime</h1>
          <p className="text-zinc-400 mt-2">Sign in to your account</p>
        </div>

        <div className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:text-white flex items-center gap-2"
            onClick={() => handleOAuthSignIn("discord")}
            disabled={isLoading}
          >
            <LucideMessagesSquare className="h-5 w-5 text-indigo-400" />
            Continue with Discord
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:text-white flex items-center gap-2"
            onClick={() => handleOAuthSignIn("google")}
            disabled={isLoading}
          >
            <Globe className="h-5 w-5 text-red-400" />
            Continue with Google
          </Button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-zinc-800 w-full absolute"></div>
          <span className="bg-zinc-900 text-zinc-500 text-sm px-2 relative">or</span>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="w-full bg-zinc-800/50">
            <TabsTrigger className="w-full data-[state=active]:bg-zinc-700" value="login">Login</TabsTrigger>
            <TabsTrigger className="w-full data-[state=active]:bg-zinc-700" value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-sm text-blue-500 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                  required
                />
              </div>
              
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="register" className="mt-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="hello@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                  required
                />
              </div>
              
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </m.div>
    </div>
  )
}
