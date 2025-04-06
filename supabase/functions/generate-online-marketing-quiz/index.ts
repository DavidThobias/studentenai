
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookId, chapterId, paragraphId, batchIndex = 0, batchSize = 5, debug = false } = await req.json();

    console.log(`Generating online marketing quiz for book ${bookId}, chapter ${chapterId}, paragraph ${paragraphId}, batch ${batchIndex}`);

    if (!bookId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Book ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get book data first to get the title
    const { data: bookData, error: bookError } = await supabase
      .from('books')
      .select('book_title')
      .eq('id', bookId)
      .limit(1)
      .single();

    if (bookError || !bookData) {
      console.error('Error fetching book data:', bookError);
      return new Response(
        JSON.stringify({ success: false, error: 'Book not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const bookTitle = bookData.book_title;
    let chapterContent = '';
    let chapterTitle = '';
    let objectives = '';

    // Fetch content based on provided IDs
    if (paragraphId) {
      // For a specific paragraph
      const { data: paragraphData, error: paragraphError } = await supabase
        .from('books')
        .select('content, chapter_title, chapter_number, objectives')
        .eq('id', paragraphId)
        .single();

      if (paragraphError || !paragraphData) {
        console.error('Error fetching paragraph data:', paragraphError);
        return new Response(
          JSON.stringify({ success: false, error: 'Paragraph not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      chapterContent = paragraphData.content || '';
      chapterTitle = paragraphData.chapter_title || '';
      objectives = paragraphData.objectives || '';

      // If paragraph has no objectives, try to get chapter objectives
      if (!objectives && paragraphData.chapter_number) {
        const { data: chapterData, error: chapterError } = await supabase
          .from('books')
          .select('objectives')
          .eq('chapter_number', paragraphData.chapter_number)
          .limit(1)
          .single();

        if (!chapterError && chapterData && chapterData.objectives) {
          objectives = chapterData.objectives;
        }
      }
    } else if (chapterId) {
      // For an entire chapter
      const { data: chapterContent, error: chapterError } = await supabase
        .from('books')
        .select('content, chapter_title, objectives')
        .eq('chapter_number', chapterId)
        .eq('book_title', bookTitle)
        .order('paragraph_number', { ascending: true });

      if (chapterError || !chapterContent || chapterContent.length === 0) {
        console.error('Error fetching chapter data:', chapterError);
        return new Response(
          JSON.stringify({ success: false, error: 'Chapter not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Combine all paragraphs content
      chapterContent = chapterContent.map(p => p.content).join('\n\n');
      chapterTitle = chapterContent[0]?.chapter_title || '';
      
      // Get objectives from first paragraph that has them
      for (const paragraph of chapterContent) {
        if (paragraph.objectives) {
          objectives = paragraph.objectives;
          break;
        }
      }
    } else {
      // For the entire book (or multiple chapters)
      const { data: bookParagraphs, error: bookError } = await supabase
        .from('books')
        .select('content, chapter_title, objectives')
        .eq('book_title', bookTitle)
        .order('chapter_number', { ascending: true })
        .order('paragraph_number', { ascending: true });

      if (bookError || !bookParagraphs || bookParagraphs.length === 0) {
        console.error('Error fetching book paragraphs:', bookError);
        return new Response(
          JSON.stringify({ success: false, error: 'Book content not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Take a subset of paragraphs to avoid too large requests
      const maxParagraphs = 10;
      const selectedParagraphs = bookParagraphs.slice(0, maxParagraphs);
      
      chapterContent = selectedParagraphs.map(p => p.content).join('\n\n');
      chapterTitle = "Multiple Chapters";
      
      // Get objectives from first paragraph that has them
      for (const paragraph of selectedParagraphs) {
        if (paragraph.objectives) {
          objectives = paragraph.objectives;
          break;
        }
      }
    }

    // Extract key terms or concepts from the content for batching
    const extractTermsFromContent = (content) => {
      // Simple extraction of terms in **bold** format
      const boldTerms = content.match(/\*\*(.*?)\*\*/g)?.map(term => term.replace(/\*\*/g, '')) || [];
      
      // Extract terms from lists (bullet points)
      const listItems = content.match(/^-\s+(.*?)$/gm)?.map(item => item.replace(/^-\s+/, '')) || [];
      
      // Extract terms after colons (definitions)
      const definitions = content.match(/([A-Za-z\s/]+):\s/g)?.map(def => def.replace(':', '').trim()) || [];
      
      // Combine all terms and remove duplicates
      const allTerms = [...boldTerms, ...listItems, ...definitions];
      return [...new Set(allTerms)].filter(term => term.length > 3);
    };

    // Extract relevant terms from the content
    const extractedTerms = extractTermsFromContent(chapterContent);
    const totalTerms = extractedTerms.length;
    
    // Calculate batch information
    const totalBatches = Math.max(1, Math.ceil(totalTerms / batchSize));
    const startIndex = batchIndex * batchSize;
    const endIndex = Math.min(startIndex + batchSize, totalTerms);
    const currentBatchTerms = extractedTerms.slice(startIndex, endIndex);
    const isLastBatch = endIndex >= totalTerms;
    
    // Limit chapter content to avoid token limit issues
    const maxContentLength = 8000; // reduced from 10000 to account for batch processing
    let contentForPrompt = chapterContent;
    if (contentForPrompt.length > maxContentLength) {
      contentForPrompt = contentForPrompt.substring(0, maxContentLength);
      console.log(`Content truncated to ${maxContentLength} characters`);
    }

    // Build the prompt for OpenAI
    // Emphasize the specific terms for this batch
    const batchTermsText = currentBatchTerms.length > 0 
      ? `Voor deze batch focus je op de volgende termen/concepten: ${currentBatchTerms.join(', ')}`
      : 'Kies zelf enkele belangrijke concepten uit de inhoud om vragen over te stellen.';
      
    const prompt = `
Genereer meervoudige-keuzevragen over online marketing op basis van de theorie en doelstellingen van het meegeleverde hoofdstuk.

${batchTermsText}

Boektitel: ${bookTitle}
Hoofdstuktitel: ${chapterTitle}

Doelstellingen:
${objectives || 'Geen specifieke doelstellingen gedefinieerd.'}

Inhoud:
${contentForPrompt}

Genereer voor deze batch ${Math.min(batchSize, currentBatchTerms.length || batchSize)} quizvragen. Elke vraag moet de volgende structuur hebben:
{
  "question": "De vraag hier",
  "options": ["Optie A", "Optie B", "Optie C", "Optie D"],
  "correctAnswer": 0, // index van het correcte antwoord (0-3)
  "explanation": "Uitleg waarom dit het juiste antwoord is"
}

Geef alleen de JSON-array terug, geen omliggende tekst.
`;

    // Call OpenAI API
    console.log('Calling OpenAI API for batch', batchIndex);
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Je bent een online marketing expert en onderwijsspecialist die quizvragen ontwerpt om studenten te helpen leren.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });

    const responseData = await openAIResponse.json();
    console.log('OpenAI API response received for batch', batchIndex);

    if (!responseData.choices || !responseData.choices[0]) {
      console.error('Invalid response from OpenAI:', responseData);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid response from AI' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const aiResponse = responseData.choices[0].message.content;
    
    // Parse the response to extract the JSON array of questions
    let questions;
    try {
      // Try to parse the entire response as JSON
      questions = JSON.parse(aiResponse);
      
      // If it's not an array, try to extract JSON from the text
      if (!Array.isArray(questions)) {
        const jsonMatch = aiResponse.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Response does not contain a valid JSON array');
        }
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('Raw AI response:', aiResponse);
      
      // Attempt more aggressive JSON extraction
      try {
        const fixedJson = aiResponse
          .replace(/^```json/g, '') // Remove markdown code block markers
          .replace(/```$/g, '')
          .trim();
        questions = JSON.parse(fixedJson);
      } catch (e) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to parse questions from AI response',
            rawResponse: aiResponse
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    // Ensure response is an array
    if (!Array.isArray(questions)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'AI response is not an array of questions',
          parsedResponse: questions
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Calculate answer distribution for debugging
    const answerDistribution = questions.reduce((dist, q) => {
      const letter = ['A', 'B', 'C', 'D'][q.correctAnswer];
      dist[letter] = (dist[letter] || 0) + 1;
      return dist;
    }, { A: 0, B: 0, C: 0, D: 0 });

    // Prepare the response
    const responsePayload = {
      success: true,
      questions,
      metadata: {
        bookId,
        chapterId,
        paragraphId,
        batchIndex,
        totalTerms: extractedTerms.length,
        processedTerms: Math.min(endIndex, extractedTerms.length),
        isLastBatch,
        totalBatches
      },
      context: {
        bookTitle,
        chapterTitle
      }
    };

    // Add debug info if requested
    if (debug) {
      responsePayload.debug = {
        prompt,
        response: aiResponse,
        answerDistribution,
        objectives,
        extractedTerms,
        batchTerms: currentBatchTerms,
        tokenEstimates: {
          promptTokens: Math.ceil(prompt.length / 4),
          requestedMaxTokens: 2500
        }
      };
    }

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-online-marketing-quiz function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
