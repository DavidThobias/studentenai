
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
    
    if (chapterId === undefined || chapterId === null) {
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

    let paragraphsData = [];
    let dataSource = '';
    
    // First try the original Paragrafen table with direct SQL
    try {
      console.log(`Executing SQL query with numeric chapter_id: ${numericChapterId}`);
      const { data: rawData, error: rawError } = await supabase.rpc(
        'execute_sql', 
        { 
          sql_query: `SELECT * FROM "Paragrafen" WHERE chapter_id = ${numericChapterId}` 
        }
      );
      
      if (!rawError && rawData && rawData.length > 0) {
        console.log(`Successfully fetched ${rawData.length} paragraphs via direct SQL from Paragrafen`);
        paragraphsData = rawData;
        dataSource = 'Paragrafen_direct_sql';
      } else if (rawError) {
        console.error(`Direct SQL error: ${JSON.stringify(rawError)}`);
      }
    } catch (sqlError) {
      console.error(`Error executing direct SQL: ${sqlError}`);
    }
    
    // If no data yet, try normal Paragrafen query
    if (paragraphsData.length === 0) {
      const { data, error } = await supabase
        .from('Paragrafen')
        .select('*')
        .eq('chapter_id', numericChapterId);
        
      if (!error && data && data.length > 0) {
        console.log(`Successfully fetched ${data.length} paragraphs via standard query from Paragrafen`);
        paragraphsData = data;
        dataSource = 'Paragrafen_standard';
      } else if (error) {
        console.error(`Error fetching from Paragrafen: ${JSON.stringify(error)}`);
      }
    }
    
    // If still no data, try with string conversion
    if (paragraphsData.length === 0) {
      const { data: stringData, error: stringError } = await supabase
        .from('Paragrafen')
        .select('*')
        .eq('chapter_id', String(numericChapterId));
      
      if (!stringError && stringData && stringData.length > 0) {
        console.log(`Successfully fetched ${stringData.length} paragraphs via string query from Paragrafen`);
        paragraphsData = stringData;
        dataSource = 'Paragrafen_string';
      } else if (stringError) {
        console.error(`Error fetching from Paragrafen with string: ${JSON.stringify(stringError)}`);
      }
    }
    
    // If still no data, try the new books table
    if (paragraphsData.length === 0) {
      console.log(`Trying to fetch from books table with chapter_number = ${numericChapterId}`);
      
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('chapter_number', numericChapterId);
        
      if (!booksError && booksData && booksData.length > 0) {
        console.log(`Successfully fetched ${booksData.length} records from books table`);
        
        // Convert books data to match Paragrafen format
        paragraphsData = booksData.map((book) => ({
          id: book.id,
          "paragraaf nummer": book.paragraph_number,
          content: book.content,
          chapter_id: book.chapter_number
        }));
        
        dataSource = 'books_table';
      } else if (booksError) {
        console.error(`Error fetching from books: ${JSON.stringify(booksError)}`);
      }
    }
    
    // Return the combined results
    return new Response(
      JSON.stringify({
        success: true,
        paragraphs: paragraphsData,
        count: paragraphsData.length,
        method: dataSource,
        query: {
          chapterId: numericChapterId,
          chapterIdType: typeof numericChapterId,
          authPresent: !!authHeader,
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
