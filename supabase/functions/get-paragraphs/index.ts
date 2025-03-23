
// @deno-types="https://deno.land/x/xhr@0.1.0/mod.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  chapterId: number;
  paragraphId?: number; // Add paragraphId as an optional parameter
}

interface TableInfoArgs {
  table_name: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Explicitly type the request body
    const body = await req.json() as RequestBody;
    const { chapterId, paragraphId } = body;
    
    if (!chapterId) {
      throw new Error('Chapter ID is required');
    }

    console.log(`Fetching paragraphs for chapter ${chapterId}${paragraphId ? ` and paragraph ${paragraphId}` : ''}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get chapter info from books table
    const { data: chapterInfo, error: chapterError } = await supabase
      .from('books')
      .select('chapter_title')
      .eq('chapter_number', chapterId)
      .limit(1)
      .maybeSingle();
    
    if (chapterError) {
      console.error(`Error fetching chapter: ${JSON.stringify(chapterError)}`);
      throw new Error(`Error fetching chapter: ${chapterError.message}`);
    }
    
    // Get all paragraphs for this chapter
    let query = supabase
      .from('books')
      .select('id, paragraph_number, content, chapter_number')
      .eq('chapter_number', chapterId);
    
    // If a specific paragraph ID is provided, filter by that as well
    if (paragraphId) {
      console.log(`Filtering by specific paragraph ID: ${paragraphId}`);
      query = query.eq('id', paragraphId);
    }
    
    const { data: paragraphs, error: paragraphsError } = await query
      .order('paragraph_number', { ascending: true });
      
    if (paragraphsError) {
      console.error(`Error fetching paragraphs: ${JSON.stringify(paragraphsError)}`);
      throw new Error(`Error fetching paragraphs: ${paragraphsError.message}`);
    }

    // Get diagnostic information about database (updated to not use generics)
    const { data: tableInfo, error: tableInfoError } = await supabase
      .rpc('get_table_info', { table_name: 'books' } as TableInfoArgs)
      .catch(() => ({ data: null, error: { message: 'get_table_info function not available' } }));

    return new Response(
      JSON.stringify({
        success: true,
        chapterInfo: chapterInfo,
        paragraphs: paragraphs,
        count: paragraphs?.length || 0,
        diagnostics: {
          tableInfo: tableInfo || 'Not available',
          tableInfoError: tableInfoError,
          timestamp: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-paragraphs function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
