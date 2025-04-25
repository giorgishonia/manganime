"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function FixDatabasePage() {
  const [sql, setSql] = useState(`
-- Add missing columns to chapters table
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS thumbnail TEXT DEFAULT '';
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS pages JSONB DEFAULT '[]'::jsonb;
  `.trim());
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const executeSql = async () => {
    if (!sql.trim()) {
      toast.error("Please enter SQL to execute");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/setup/execute-sql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || "SQL execution failed");
      }
      
      setResult(JSON.stringify(data, null, 2));
      toast.success("SQL executed successfully");
    } catch (error) {
      console.error("Error executing SQL:", error);
      toast.error(error.message || "Failed to execute SQL");
      setResult(JSON.stringify({ error: error.message }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Fix Database Schema</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Execute SQL</h2>
        <Textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          className="font-mono h-40 mb-4"
          placeholder="Enter SQL to execute..."
        />
        <Button onClick={executeSql} disabled={isLoading}>
          {isLoading ? "Executing..." : "Execute SQL"}
        </Button>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Result</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-80">
          {result || "No result yet"}
        </pre>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Common Fixes</h2>
        <div className="space-y-4">
          <div className="p-4 border rounded">
            <h3 className="font-medium">Fix Chapters Table Schema</h3>
            <p className="text-sm mb-2">
              Adds missing columns to the chapters table: description, thumbnail, pages
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSql(`
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS thumbnail TEXT DEFAULT '';
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS pages JSONB DEFAULT '[]'::jsonb;
                `.trim());
              }}
            >
              Load SQL
            </Button>
          </div>
          
          <div className="p-4 border rounded">
            <h3 className="font-medium">Create or Update Comments Table</h3>
            <p className="text-sm mb-2">
              Creates or updates the comments table with proper RLS policies for user comments
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSql(`
-- Create comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('anime', 'manga')),
  text TEXT NOT NULL,
  media_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policies for comments
DO $$
BEGIN
  -- Public read access for all comments
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Comments are viewable by everyone'
  ) THEN
    CREATE POLICY "Comments are viewable by everyone" 
      ON comments FOR SELECT 
      USING (true);
  END IF;

  -- Users can add comments
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can add comments'
  ) THEN
    CREATE POLICY "Users can add comments" 
      ON comments FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Users can edit their own comments
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can update their own comments'
  ) THEN
    CREATE POLICY "Users can update their own comments" 
      ON comments FOR UPDATE 
      TO authenticated 
      USING (auth.uid() = user_id);
  END IF;

  -- Users can delete their own comments
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can delete their own comments'
  ) THEN
    CREATE POLICY "Users can delete their own comments" 
      ON comments FOR DELETE 
      TO authenticated 
      USING (auth.uid() = user_id);
  END IF;
END;
$$;
                  `.trim());
                }}
              >
                Load SQL
              </Button>

              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    setResult("Fixing comments table...");
                    
                    const response = await fetch("/api/setup/fix-comments-table");
                    const data = await response.json();
                    
                    setResult(JSON.stringify(data, null, 2));
                    
                    if (data.success) {
                      toast.success("Comments table fixed successfully");
                    } else {
                      toast.error("Failed to fix comments table: " + (data.error || "Unknown error"));
                    }
                  } catch (error) {
                    console.error("Error fixing comments table:", error);
                    toast.error("Failed to fix comments table");
                    setResult(JSON.stringify({ error: error.message }, null, 2));
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                Force Fix (Recreate Table)
              </Button>
            </div>
          </div>
          
          <div className="p-4 border rounded">
            <h3 className="font-medium">Fix Watchlist Schema</h3>
            <p className="text-sm mb-2">
              Fixes the foreign key relationship between watchlist/favorites and content tables
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    setResult("Fixing watchlist schema...");
                    
                    const response = await fetch("/api/setup/fix-watchlist-schema");
                    const data = await response.json();
                    
                    setResult(JSON.stringify(data, null, 2));
                    
                    if (data.success) {
                      toast.success("Watchlist schema fixed successfully");
                    } else {
                      toast.error("Failed to fix watchlist schema: " + (data.error || "Unknown error"));
                    }
                  } catch (error) {
                    console.error("Error fixing watchlist schema:", error);
                    toast.error("Failed to fix watchlist schema");
                    setResult(JSON.stringify({ error: error.message }, null, 2));
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                Fix Watchlist Schema
              </Button>
            </div>
          </div>
          
          <div className="p-4 border rounded">
            <h3 className="font-medium">Fix Profiles Schema</h3>
            <p className="text-sm mb-2">
              Adds missing columns to the profiles table: banner, role
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    setResult("Fixing profiles schema...");
                    
                    const response = await fetch("/api/setup/fix-profiles-schema");
                    const data = await response.json();
                    
                    setResult(JSON.stringify(data, null, 2));
                    
                    if (data.success) {
                      toast.success("Profiles schema fixed successfully");
                    } else {
                      toast.error("Failed to fix profiles schema: " + (data.error || "Unknown error"));
                    }
                  } catch (error) {
                    console.error("Error fixing profiles schema:", error);
                    toast.error("Failed to fix profiles schema");
                    setResult(JSON.stringify({ error: error.message }, null, 2));
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                Fix Profiles Schema
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 