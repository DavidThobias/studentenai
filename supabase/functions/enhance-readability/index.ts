
// @deno-types="https://deno.land/x/xhr@0.1.0/mod.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

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
    const { chapterId, paragraphId } = await req.json();
    
    if (!chapterId) {
      throw new Error('Chapter ID is required');
    }

    console.log(`Processing chapter ${chapterId}${paragraphId ? ` paragraph ${paragraphId}` : ''}`);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get content based on chapter/paragraph
    let query = supabase
      .from('books')
      .select('content, chapter_title, paragraph_number, book_title')
      .eq('chapter_number', chapterId);
    
    // If a specific paragraph is requested, filter by it
    if (paragraphId) {
      query = query.eq('id', paragraphId);
    }
    
    const { data: contentData, error: contentError } = await query
      .order('paragraph_number', { ascending: true });
      
    if (contentError) {
      console.error(`Error fetching content: ${JSON.stringify(contentError)}`);
      throw new Error(`Error fetching content: ${contentError.message}`);
    }
    
    if (!contentData || contentData.length === 0) {
      throw new Error('No content found for the specified chapter/paragraph');
    }

    // Extract book and chapter info
    const bookTitle = contentData[0]?.book_title || '';
    const chapterTitle = contentData[0]?.chapter_title || '';
    
    // Combine all paragraph content
    const originalContent = contentData.map(item => {
      return `Paragraaf ${item.paragraph_number || 'onbekend'}: ${item.content || ''}`;
    }).join('\n\n');

    // Process with OpenAI to enhance readability
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Je bent een ervaren docent die teksten duidelijker en makkelijker te begrijpen maakt voor studenten. 
            Je taak is om de volgende tekst beter leesbaar te maken door:
            1. Complexe zinnen te herformuleren in eenvoudigere taal
            2. Vakjargon uit te leggen met duidelijke definities tussen haakjes
            3. De structuur te verbeteren met duidelijke kopjes per paragraaf
            4. Af en toe belangrijke punten te benadrukken met bullet points of vetgedrukte tekst (markdown)
            
            BELANGRIJK: Je mag de tekst NIET samenvatten. Alle informatie moet behouden blijven.
            Je voegt alleen toelichting en structuur toe om het begrijpelijker te maken.
            Behoud de oorspronkelijke paragraafnummers precies zoals in de input, maar maak de rest van 
            de tekst helderder en toegankelijker voor studenten.`
          },
          {
            role: 'user',
            content: `Hier is de tekst uit het boek "${bookTitle}", hoofdstuk: "${chapterTitle}":\n\n${originalContent}`
          }
        ],
        temperature: 0.5,
        max_tokens: 4096,
      }),
    });

    const openaiData = await response.json();
    const enhancedContent = openaiData.choices?.[0]?.message?.content || '';

    if (!enhancedContent) {
      throw new Error('Failed to enhance content with OpenAI');
    }

    // Return the enhanced content
    return new Response(
      JSON.stringify({
        success: true,
        originalContent,
        enhancedContent,
        bookTitle,
        chapterTitle,
        paragraphs: contentData.map(p => ({ 
          id: p.id,
          paragraph_number: p.paragraph_number,
          content: p.content
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enhance-readability function:', error);
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
