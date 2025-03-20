
// @deno-types="https://deno.land/x/types/deno.d.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapterId } = await req.json();
    
    if (!chapterId) {
      throw new Error('Chapter ID is required');
    }

    // Ensure chapterId is a number
    const numericChapterId = typeof chapterId === 'string' ? parseInt(chapterId, 10) : chapterId;
    
    console.log(`Getting paragraphs for chapter ${numericChapterId} (type: ${typeof numericChapterId})`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Try direct SQL approach for more reliable results
    const { data: sqlData, error: sqlError } = await supabase
      .rpc('get_paragraphs_by_chapter', { chapter_id_param: numericChapterId });
    
    if (sqlError) {
      console.error(`RPC error: ${JSON.stringify(sqlError)}`);
      
      // Fall back to regular query if RPC fails (likely because function doesn't exist)
      const { data, error, status } = await supabase
        .from('Paragrafen')
        .select('*')
        .eq('chapter_id', numericChapterId);

      if (error) {
        console.error(`Error fetching paragraphs: ${JSON.stringify(error)}`);
        throw new Error(`Error fetching paragraphs: ${error.message}`);
      }

      console.log(`Successfully fetched ${data?.length || 0} paragraphs via regular query`);
      
      // Return the paragraphs
      return new Response(
        JSON.stringify({
          success: true,
          paragraphs: data || [],
          count: data?.length || 0,
          method: 'direct_query',
          query: {
            table: 'Paragrafen',
            chapterId: numericChapterId,
            chapterIdType: typeof numericChapterId,
            status
          }
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
    console.log(`Successfully fetched ${sqlData?.length || 0} paragraphs via RPC`);
    
    return new Response(
      JSON.stringify({
        success: true,
        paragraphs: sqlData || [],
        count: sqlData?.length || 0,
        method: 'rpc',
        query: {
          function: 'get_paragraphs_by_chapter',
          chapterId: numericChapterId,
          chapterIdType: typeof numericChapterId
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in get-paragraphs function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        query: {
          requestMethod: req.method,
          contentType: req.headers.get('Content-Type')
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
