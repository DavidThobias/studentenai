
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

    console.log(`Getting paragraphs for chapter ${chapterId}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get paragraphs for this chapter
    const { data, error, status } = await supabase
      .from('Paragrafen')
      .select('*')
      .eq('chapter_id', chapterId);

    if (error) {
      console.error(`Error fetching paragraphs: ${JSON.stringify(error)}`);
      throw new Error(`Error fetching paragraphs: ${error.message}`);
    }

    console.log(`Successfully fetched ${data?.length || 0} paragraphs`);

    // Return the paragraphs
    return new Response(
      JSON.stringify({
        success: true,
        paragraphs: data || [],
        count: data?.length || 0,
        query: {
          table: 'Paragrafen',
          chapterId,
          chapterIdType: typeof chapterId
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
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
