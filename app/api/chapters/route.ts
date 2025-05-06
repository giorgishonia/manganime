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

// Helper function to check admin status
async function checkAdminStatus(request: NextRequest, supabase: any) {
  // Check for service role key in header
  const serviceRoleKey = request.headers.get('x-supabase-service-role');
  
  // If service role key is provided and matches the expected value, bypass auth check
  if (serviceRoleKey && process.env.SUPABASE_SERVICE_ROLE_KEY && 
      serviceRoleKey === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { isAdmin: true };
  }
  
  // Otherwise do normal admin check
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { isAdmin: false, error: "Not authenticated", status: 401 };
  }
  
  // Get user profile to check admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  
  if (profileError) {
    console.error("Error fetching user profile:", profileError);
    return { isAdmin: false, error: "Failed to verify user role", status: 500 };
  }
  
  // Check if user is admin
  const isAdmin = profile?.role === 'admin';
  
  if (!isAdmin) {
    return { isAdmin: false, error: "Forbidden - Admin access required", status: 403 };
  }
  
  return { isAdmin: true };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const contentId = searchParams.get("contentId");
  const contentType = searchParams.get("contentType");
  
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
      // Note: Using the content_id field (snake_case) as per database schema
      console.log("Fetching chapters for contentId:", contentId, "contentType:", contentType);
      
      let query = supabase
        .from("chapters")
        .select("*")
        .eq("content_id", contentId);
      
      // If content type is specified, filter by it
      if (contentType) {
        query = query.eq("content_type", contentType);
      }
      
      const { data, error } = await query.order("number");
        
      if (error) {
        console.error("Error fetching chapters:", error);
        return NextResponse.json([], { status: 200 }); // Return empty array if error
      }
      
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
  try {
    console.log("POST /api/chapters - Starting authentication check");
    const supabase = createRouteHandlerClient({ cookies });
    
    // DEVELOPMENT MODE BYPASS - Skip admin check in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      console.log("DEVELOPMENT MODE: Bypassing admin check for API");
      // Skip admin validation and proceed
    } else {
      // Check admin status
      const adminStatus = await checkAdminStatus(request, supabase);
      
      if (!adminStatus.isAdmin) {
        console.error("Authorization failed:", adminStatus.error);
        return NextResponse.json(
          { error: adminStatus.error || "Unauthorized" },
          { status: adminStatus.status || 401 }
        );
      }
    }
    
    console.log("Admin access confirmed, proceeding with chapter creation");
    
    // Get the raw request body for debugging
    const rawData = await request.text();
    console.log("Raw request body:", rawData);
    
    // Parse the JSON manually with better error handling
    let chapterData;
    try {
      chapterData = JSON.parse(rawData);
      console.log("Parsed chapter data:", chapterData);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: parseError.message },
        { status: 400 }
      );
    }
    
    // Validate chapter data with detailed errors
    let validatedData;
    try {
      validatedData = chapterSchema.parse(chapterData);
      console.log("Validation passed, validated data:", validatedData);
    } catch (validationError) {
      console.error("Validation error:", validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }
    
    // Verify content exists with better error handling
    console.log("Verifying content exists for ID:", validatedData.contentId);
    const { data: contentData, error: contentError } = await supabase
      .from("content")
      .select("id, type")
      .eq("id", validatedData.contentId)
      .single();
      
    if (contentError) {
      console.error("Content error:", contentError);
      return NextResponse.json(
        { error: "Content lookup failed", details: contentError.message },
        { status: 500 }
      );
    }
    
    if (!contentData) {
      console.error("Content not found for ID:", validatedData.contentId);
      return NextResponse.json(
        { error: "Content not found", details: `No content with ID: ${validatedData.contentId}` },
        { status: 404 }
      );
    }
    
    console.log("Content found:", contentData);
    
    if (contentData.type !== "manga" && contentData.type !== "comics") {
      console.error("Content type mismatch:", contentData.type);
      return NextResponse.json(
        { error: "Chapters can only be added to manga or comics content", details: `Content type is: ${contentData.type}` },
        { status: 400 }
      );
    }
    
    // Insert chapter into database with better error handling
    console.log("Inserting chapter into database");
    try {
      // Create a database-ready object using snake_case field names to match database schema
      const dbData = {
        content_id: validatedData.contentId,
        number: validatedData.number,
        title: validatedData.title,
        description: validatedData.description || '',
        thumbnail: validatedData.thumbnail || '',
        pages: validatedData.pages,
        release_date: validatedData.releaseDate
      };
      
      console.log("Database data:", dbData);
      
      const { data, error } = await supabase
        .from("chapters")
        .insert(dbData)
        .select()
        .single();
        
      if (error) {
        console.error("Database insert error:", error);
        throw error;
      }
      
      console.log("Chapter created successfully:", data);
      return NextResponse.json(data, { status: 201 });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Database operation failed", details: dbError.message || String(dbError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unhandled error in chapter creation:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create chapter", details: error.message || String(error) },
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
  
  // DEVELOPMENT MODE BYPASS - Skip admin check in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment) {
    console.log("DEVELOPMENT MODE: Bypassing admin check for API");
    // Skip admin validation and proceed
  } else {
    // Check admin status
    const adminStatus = await checkAdminStatus(request, supabase);
    
    if (!adminStatus.isAdmin) {
      console.error("Authorization failed:", adminStatus.error);
      return NextResponse.json(
        { error: adminStatus.error || "Unauthorized" },
        { status: adminStatus.status || 401 }
      );
    }
  }
  
  try {
    const chapterData = await request.json();
    
    // Validate chapter data
    const validatedData = chapterSchema.parse(chapterData);
    
    // Create a database-ready object using snake_case field names to match database schema
    const dbData = {
      content_id: validatedData.contentId,
      number: validatedData.number,
      title: validatedData.title,
      description: validatedData.description || '',
      thumbnail: validatedData.thumbnail || '',
      pages: validatedData.pages,
      release_date: validatedData.releaseDate
    };
    
    console.log("Updating chapter with data:", dbData);
    
    // Update chapter in database
    const { data, error } = await supabase
      .from("chapters")
      .update(dbData)
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
  
  // DEVELOPMENT MODE BYPASS - Skip admin check in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment) {
    console.log("DEVELOPMENT MODE: Bypassing admin check for API");
    // Skip admin validation and proceed
  } else {
    // Check admin status
    const adminStatus = await checkAdminStatus(request, supabase);
    
    if (!adminStatus.isAdmin) {
      console.error("Authorization failed:", adminStatus.error);
      return NextResponse.json(
        { error: adminStatus.error || "Unauthorized" },
        { status: adminStatus.status || 401 }
      );
    }
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