
// @deno-types="https://deno.land/x/xhr@0.1.0/deno.d.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Calling OpenAI API to generate a sales question...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using gpt-4o-mini as a more affordable alternative to gpt-4
        messages: [
          {
            role: 'system',
            content: 'Je bent een ervaren Nederlandse docent die gespecialiseerd is in sales en marketing. Je taak is om uitstekende quizvragen te maken over het Basisboek Sales, altijd in correct JSON formaat.'
          },
          {
            role: 'user',
            content: 'Genereer een meerkeuzevraag over het Basisboek Sales. Gebruik standaard verkoop- en salesconcepten. Geef vier antwoordopties, waarvan er één correct is. Formatteer het als JSON: { "vraag": "...", "opties": ["A: ...", "B: ...", "C: ...", "D: ..."], "correct": "A" } (de waarde van correct moet een van de letters A, B, C, D zijn die overeenkomt met het juiste antwoord)'
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully received OpenAI response');
    
    // Extract the content from the OpenAI response
    const content = data.choices[0].message.content;
    console.log('Generated content:', content);
    
    // Try to parse the JSON from the response
    let questionData;
    try {
      // First try direct parsing
      questionData = JSON.parse(content);
      console.log('Successfully parsed JSON directly');
    } catch (e) {
      console.log('Failed to parse JSON directly, trying to extract JSON from text:', e);
      // If direct parsing fails, try to extract JSON from the text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          questionData = JSON.parse(jsonMatch[0]);
          console.log('Successfully extracted and parsed JSON from text');
        } catch (extractError) {
          console.error('Failed to parse extracted content:', extractError);
          throw new Error('Failed to parse question data');
        }
      } else {
        console.error('No JSON content found in response');
        throw new Error('Invalid format in OpenAI response');
      }
    }

    // Validate the question structure
    if (!questionData || !questionData.vraag || !Array.isArray(questionData.opties) || !questionData.correct) {
      console.error('Invalid question data structure:', questionData);
      throw new Error('Invalid question data structure');
    }

    // Validate the correct answer is one of A, B, C, D
    const correctLetter = questionData.correct.charAt(0).toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(correctLetter)) {
      console.error('Invalid correct answer, must be A, B, C, or D:', questionData.correct);
      throw new Error('Invalid correct answer format');
    }

    // Validate all options start with A:, B:, C:, D:
    const expectedPrefixes = ['A:', 'B:', 'C:', 'D:'];
    const allOptionsHaveCorrectPrefix = questionData.opties.every((option: string, index: number) => {
      return option.startsWith(expectedPrefixes[index]);
    });

    if (!allOptionsHaveCorrectPrefix || questionData.opties.length !== 4) {
      console.warn('Options do not have the expected format, attempting to fix...');
      
      // Try to fix the options format
      questionData.opties = questionData.opties.map((option: string, index: number) => {
        const prefix = expectedPrefixes[index];
        if (option.startsWith(prefix)) {
          return option;
        }
        return `${prefix} ${option.replace(/^[A-D]:\s*/, '')}`;
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        question: questionData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-sales-question function:', error);
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
