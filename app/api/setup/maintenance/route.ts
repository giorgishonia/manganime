import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  console.log("[maintenance] Starting database maintenance tasks");
  const supabase = createClient();
  
  try {
    // Array to track all maintenance operations and their results
    const operations = [];
    
    // Operation 1: Ensure has_completed_onboarding column exists
    console.log("[maintenance] Checking if has_completed_onboarding column exists");
    const { data: columnExists, error: columnCheckError } = await supabase.rpc(
      "execute_sql",
      {
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'profiles' AND column_name = 'has_completed_onboarding'
        `
      }
    );
    
    if (columnCheckError) {
      console.error("[maintenance] Error checking column:", columnCheckError);
      operations.push({
        operation: "check_has_completed_onboarding",
        success: false,
        error: columnCheckError.message
      });
    } else if (!columnExists || columnExists.length === 0) {
      // Column doesn't exist, add it
      console.log("[maintenance] Column not found, adding has_completed_onboarding column");
      
      const { error: addColumnError } = await supabase.rpc(
        "execute_sql",
        {
          query: `
            ALTER TABLE profiles 
            ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;
          `
        }
      );
      
      if (addColumnError) {
        console.error("[maintenance] Error adding column:", addColumnError);
        operations.push({
          operation: "add_has_completed_onboarding",
          success: false,
          error: addColumnError.message
        });
      } else {
        console.log("[maintenance] Column added successfully");
        operations.push({
          operation: "add_has_completed_onboarding",
          success: true,
          message: "Column added"
        });
        
        // Force a schema cache refresh
        await supabase.rpc(
          "execute_sql",
          { query: "NOTIFY pgrst, 'reload schema';" }
        );
      }
    } else {
      console.log("[maintenance] has_completed_onboarding column already exists");
      operations.push({
        operation: "check_has_completed_onboarding",
        success: true,
        message: "Column already exists"
      });
    }
    
    // Operation 2: Ensure first_name and last_name columns exist
    console.log("[maintenance] Checking if first_name and last_name columns exist");
    const { data: nameColumns, error: nameColumnCheckError } = await supabase.rpc(
      "execute_sql",
      {
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'profiles' AND column_name IN ('first_name', 'last_name')
        `
      }
    );
    
    if (nameColumnCheckError) {
      console.error("[maintenance] Error checking name columns:", nameColumnCheckError);
      operations.push({
        operation: "check_name_columns",
        success: false,
        error: nameColumnCheckError.message
      });
    } else {
      // Check which columns exist and which need to be added
      const existingColumns = nameColumns ? nameColumns.map((row: { column_name: string }) => row.column_name) : [];
      const columnsToAdd = ['first_name', 'last_name'].filter(
        col => !existingColumns.includes(col)
      );
      
      if (columnsToAdd.length > 0) {
        console.log(`[maintenance] Adding missing name columns: ${columnsToAdd.join(', ')}`);
        
        const addColumnsQuery = columnsToAdd.map(
          col => `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ${col} TEXT;`
        ).join('\n');
        
        const { error: addColumnsError } = await supabase.rpc(
          "execute_sql",
          { query: addColumnsQuery }
        );
        
        if (addColumnsError) {
          console.error("[maintenance] Error adding name columns:", addColumnsError);
          operations.push({
            operation: "add_name_columns",
            success: false,
            error: addColumnsError.message
          });
        } else {
          console.log("[maintenance] Name columns added successfully");
          operations.push({
            operation: "add_name_columns",
            success: true,
            message: `Added columns: ${columnsToAdd.join(', ')}`
          });
          
          // Force a schema cache refresh
          await supabase.rpc(
            "execute_sql",
            { query: "NOTIFY pgrst, 'reload schema';" }
          );
        }
      } else {
        console.log("[maintenance] All name columns already exist");
        operations.push({
          operation: "check_name_columns",
          success: true,
          message: "All columns already exist"
        });
      }
    }
    
    // Operation 3: Ensure interests column exists as an array
    console.log("[maintenance] Checking if interests column exists");
    const { data: interestsColumn, error: interestsColumnCheckError } = await supabase.rpc(
      "execute_sql",
      {
        query: `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'profiles' AND column_name = 'interests'
        `
      }
    );
    
    if (interestsColumnCheckError) {
      console.error("[maintenance] Error checking interests column:", interestsColumnCheckError);
      operations.push({
        operation: "check_interests_column",
        success: false,
        error: interestsColumnCheckError.message
      });
    } else if (!interestsColumn || interestsColumn.length === 0) {
      // Column doesn't exist, add it
      console.log("[maintenance] Interests column not found, adding it");
      
      const { error: addColumnError } = await supabase.rpc(
        "execute_sql",
        {
          query: `
            ALTER TABLE profiles 
            ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT NULL;
          `
        }
      );
      
      if (addColumnError) {
        console.error("[maintenance] Error adding interests column:", addColumnError);
        operations.push({
          operation: "add_interests_column",
          success: false,
          error: addColumnError.message
        });
      } else {
        console.log("[maintenance] Interests column added successfully");
        operations.push({
          operation: "add_interests_column",
          success: true,
          message: "Column added"
        });
        
        // Force a schema cache refresh
        await supabase.rpc(
          "execute_sql",
          { query: "NOTIFY pgrst, 'reload schema';" }
        );
      }
    } else {
      console.log("[maintenance] Interests column already exists");
      operations.push({
        operation: "check_interests_column",
        success: true,
        message: "Column already exists"
      });
    }
    
    // Operation 4: Update onboarding status for profiles with data
    console.log("[maintenance] Updating onboarding status based on profile data");
    const { data: updateResult, error: updateError } = await supabase.rpc(
      "execute_sql",
      {
        query: `
          UPDATE profiles
          SET has_completed_onboarding = true
          WHERE 
            (has_completed_onboarding IS NULL OR has_completed_onboarding = false)
            AND username IS NOT NULL 
            -- If the profile has first_name, or interests, consider it complete
            AND (
              first_name IS NOT NULL 
              OR interests IS NOT NULL AND array_length(interests, 1) > 0 
              OR bio IS NOT NULL
            )
          RETURNING id;
        `
      }
    );
    
    if (updateError) {
      console.error("[maintenance] Error updating onboarding status:", updateError);
      operations.push({
        operation: "update_onboarding_status",
        success: false,
        error: updateError.message
      });
    } else {
      const updatedCount = updateResult ? updateResult.length : 0;
      console.log(`[maintenance] Updated ${updatedCount} profile(s) with onboarding status`);
      operations.push({
        operation: "update_onboarding_status",
        success: true,
        message: `Updated ${updatedCount} profile(s)`
      });
    }
    
    // Return combined results
    return NextResponse.json({
      success: true,
      operations,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("[maintenance] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
} 