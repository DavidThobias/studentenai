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
    // Parse the request body
    const reqBody = await req.json().catch(err => {
      console.error('Error parsing request body:', err);
      throw new Error('Invalid JSON in request body');
    });
    
    const { chapterId } = reqBody;
    
    if (!chapterId) {
      throw new Error('Chapter ID is required');
    }

    // Force conversion to number to ensure type consistency
    const numericChapterId = Number(chapterId);
    
    // Validate that we have a valid number
    if (isNaN(numericChapterId)) {
      throw new Error(`Invalid chapter ID: ${chapterId} (cannot be converted to a number)`);
    }
    
    console.log(`Getting paragraphs for chapter ${numericChapterId} (type: ${typeof numericChapterId})`);

    // Create Supabase client - use authorization header if present
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    // Get authorization token from the request headers if available
    const authHeader = req.headers.get('Authorization');
    
    // Create client with either auth header or anon key
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    );

    // First, try a direct SQL query with explicit CAST for the chapter_id
    try {
      console.log(`Executing SQL query with numeric chapter_id: ${numericChapterId}`);
      const { data: rawData, error: rawError } = await supabase.rpc(
        'execute_sql', 
        { 
          sql_query: `SELECT * FROM "Paragrafen" WHERE chapter_id = ${numericChapterId}` 
        }
      );
      
      if (!rawError && rawData && rawData.length > 0) {
        console.log(`Successfully fetched ${rawData.length} paragraphs via direct SQL`);
        return new Response(
          JSON.stringify({
            success: true,
            paragraphs: rawData,
            count: rawData.length,
            method: 'direct_sql',
            query: {
              sql: `SELECT * FROM "Paragrafen" WHERE chapter_id = ${numericChapterId}`,
              chapterId: numericChapterId,
              chapterIdType: typeof numericChapterId
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (rawError) {
        console.error(`Direct SQL error: ${JSON.stringify(rawError)}`);
        // Continue to try other methods
      }
    } catch (sqlError) {
      console.error(`Error executing direct SQL: ${sqlError}`);
      // Continue to try other methods
    }

    // Fall back to standard query with proper type handling
    const { data, error, status } = await supabase
      .from('Paragrafen')
      .select('*')
      .eq('chapter_id', numericChapterId);

    if (error) {
      console.error(`Error fetching paragraphs: ${JSON.stringify(error)}`);
      
      // One more attempt with string conversion
      const { data: stringData, error: stringError } = await supabase
        .from('Paragrafen')
        .select('*')
        .eq('chapter_id', String(numericChapterId));
      
      if (stringError || !stringData) {
        // If all attempts fail, throw error
        throw new Error(`Error fetching paragraphs: ${error.message}`);
      }
      
      console.log(`Successfully fetched ${stringData?.length || 0} paragraphs via string query`);
      
      return new Response(
        JSON.stringify({
          success: true,
          paragraphs: stringData || [],
          count: stringData?.length || 0,
          method: 'string_query',
          query: {
            table: 'Paragrafen',
            chapterId: String(numericChapterId),
            chapterIdType: typeof String(numericChapterId),
            authPresent: !!authHeader
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Successfully fetched ${data?.length || 0} paragraphs via standard query`);
    
    return new Response(
      JSON.stringify({
        success: true,
        paragraphs: data || [],
        count: data?.length || 0,
        method: 'standard_query',
        query: {
          table: 'Paragrafen',
          chapterId: numericChapterId,
          chapterIdType: typeof numericChapterId,
          status,
          authPresent: !!authHeader
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-paragraphs function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        query: {
          requestMethod: req.method,
          contentType: req.headers.get('Content-Type'),
          hasAuth: !!req.headers.get('Authorization')
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
