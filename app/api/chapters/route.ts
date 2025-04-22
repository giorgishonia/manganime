import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { z } from "zod";

// Define schema for chapter validation
const chapterSchema = z.object({
  contentId: z.string().uuid("Invalid content ID"),
  number: z.number().int().positive("Chapter number must be positive"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  thumbnail: z.string().url("Invalid thumbnail URL").optional(),
  pages: z.array(z.string().url("Invalid page URL")),
  releaseDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const contentId = searchParams.get("contentId");
  
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    if (id) {
      // Get specific chapter by ID
      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error) throw error;
      
      return NextResponse.json(data);
    } else if (contentId) {
      // Get chapters for a specific content
      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("contentId", contentId)
        .order("number");
        
      if (error) throw error;
      
      return NextResponse.json(data);
    } else {
      // Get all chapters with pagination
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await supabase
        .from("chapters")
        .select("*", { count: "exact" })
        .range(offset, offset + limit - 1)
        .order("createdAt", { ascending: false });
        
      if (error) throw error;
      
      return NextResponse.json({
        data,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil((count || 0) / limit),
        },
      });
    }
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return NextResponse.json(
      { error: "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Verify user is authenticated and has admin role
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  const { data: userData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();
    
  if (userData?.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
  
  try {
    const chapterData = await request.json();
    
    // Validate chapter data
    const validatedData = chapterSchema.parse(chapterData);
    
    // Verify content exists
    const { data: contentData, error: contentError } = await supabase
      .from("content")
      .select("id, type")
      .eq("id", validatedData.contentId)
      .single();
      
    if (contentError || !contentData) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }
    
    if (contentData.type !== "manga") {
      return NextResponse.json(
        { error: "Chapters can only be added to manga content" },
        { status: 400 }
      );
    }
    
    // Insert chapter into database
    const { data, error } = await supabase
      .from("chapters")
      .insert(validatedData)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error creating chapter:", error);
    return NextResponse.json(
      { error: "Failed to create chapter" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json(
      { error: "Chapter ID is required" },
      { status: 400 }
    );
  }
  
  // Verify user is authenticated and has admin role
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  const { data: userData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();
    
  if (userData?.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
  
  try {
    const chapterData = await request.json();
    
    // Validate chapter data
    const validatedData = chapterSchema.parse(chapterData);
    
    // Update chapter in database
    const { data, error } = await supabase
      .from("chapters")
      .update(validatedData)
      .eq("id", id)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error updating chapter:", error);
    return NextResponse.json(
      { error: "Failed to update chapter" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json(
      { error: "Chapter ID is required" },
      { status: 400 }
    );
  }
  
  // Verify user is authenticated and has admin role
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  const { data: userData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();
    
  if (userData?.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
  
  try {
    // Delete chapter from database
    const { error } = await supabase
      .from("chapters")
      .delete()
      .eq("id", id);
      
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chapter:", error);
    return NextResponse.json(
      { error: "Failed to delete chapter" },
      { status: 500 }
    );
  }
} 