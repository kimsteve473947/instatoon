import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// API endpoint to clean up trash items older than 30 days
// This can be called by Vercel Cron, external cron service, or manually
export async function GET(req: NextRequest) {
  try {
    // Optional: Add authentication to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    
    // Get projects that have been in trash for more than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: oldProjects, error: fetchError } = await supabase
      .from('project')
      .select('id, title')
      .not('deletedAt', 'is', null)
      .lt('deletedAt', thirtyDaysAgo.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    if (!oldProjects || oldProjects.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No projects to delete",
        deletedCount: 0
      });
    }

    // Delete panels for these projects
    const projectIds = oldProjects.map(p => p.id);
    
    const { error: panelDeleteError } = await supabase
      .from('panel')
      .delete()
      .in('projectId', projectIds);

    if (panelDeleteError) {
      console.error('Error deleting panels:', panelDeleteError);
    }

    // Delete the projects
    const { error: projectDeleteError } = await supabase
      .from('project')
      .delete()
      .in('id', projectIds);

    if (projectDeleteError) {
      throw projectDeleteError;
    }

    console.log(`Cleaned up ${oldProjects.length} old projects from trash`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${oldProjects.length} old projects`,
      deletedCount: oldProjects.length,
      deletedProjects: oldProjects.map(p => ({ id: p.id, title: p.title }))
    });
  } catch (error) {
    console.error('Trash cleanup error:', error);
    return NextResponse.json(
      { 
        error: "Failed to clean up trash",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(req: NextRequest) {
  return GET(req);
}