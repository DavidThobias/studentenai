
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
    const { bookId, chapterId, paragraphId, questionsPerObjective = 3, debug = false, batchIndex = 0, batchSize = 10 } = await req.json();

    console.log(`Generating online marketing quiz for book ${bookId}, chapter ${chapterId}, paragraph ${paragraphId}, batch ${batchIndex}`);
    console.log(`Questions per objective: ${questionsPerObjective}`);

    if (!bookId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Book ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

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
    let objectivesArray: string[] = [];

    if (paragraphId) {
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

      if (!objectives && paragraphData.chapter_number) {
        const { data: chapterData, error: chapterError } = await supabase
          .from('books')
          .select('objectives')
          .eq('chapter_number', paragraphData.chapter_number)
          .limit(1)
          .maybeSingle();

        if (!chapterError && chapterData && chapterData.objectives) {
          objectives = chapterData.objectives;
        }
      }
    } else if (chapterId) {
      const { data: chapterData, error: chapterError } = await supabase
        .from('books')
        .select('content, chapter_title, objectives')
        .eq('chapter_number', chapterId)
        .eq('book_title', bookTitle)
        .order('paragraph_number', { ascending: true });

      if (chapterError || !chapterData || chapterData.length === 0) {
        console.error('Error fetching chapter data:', chapterError);
        return new Response(
          JSON.stringify({ success: false, error: 'Chapter not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      chapterContent = chapterData.map(p => p.content).join('\n\n');
      chapterTitle = chapterData[0]?.chapter_title || '';
      
      for (const paragraph of chapterData) {
        if (paragraph.objectives) {
          objectives = paragraph.objectives;
          break;
        }
      }
    } else {
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

      const maxParagraphs = 10;
      const selectedParagraphs = bookParagraphs.slice(0, maxParagraphs);
      
      chapterContent = selectedParagraphs.map(p => p.content).join('\n\n');
      chapterTitle = "Multiple Chapters";
      
      for (const paragraph of selectedParagraphs) {
        if (paragraph.objectives) {
          objectives = paragraph.objectives;
          break;
        }
      }
    }

    if (objectives) {
      objectivesArray = objectives
        .split(/\n|-|\*/)
        .map(obj => obj.trim())
        .filter(obj => obj.length > 10);
    }

    if (objectivesArray.length === 0) {
      const objectivesSection = chapterContent.match(/doelstelling(en)?:?\s*([\s\S]*?)(?=\n\n|$)/i);
      if (objectivesSection && objectivesSection[2]) {
        objectivesArray = objectivesSection[2]
          .split(/\n|-|\*/)
          .map(obj => obj.trim())
          .filter(obj => obj.length > 10);
      }
      
      if (objectivesArray.length === 0) {
        const boldTerms = chapterContent.match(/\*\*(.*?)\*\*/g)?.map(term => term.replace(/\*\*/g, '')) || [];
        const sectionHeaders = chapterContent.match(/^#+\s+(.*?)$/gm)?.map(header => header.replace(/^#+\s+/, '')) || [];
        
        const terms = sectionHeaders.length > 0 ? sectionHeaders : boldTerms;
        
        if (terms.length > 0) {
          objectivesArray = terms.slice(0, 5).map(term => 
            `Na het bestuderen van dit hoofdstuk begrijp je het concept "${term}" en kun je dit toepassen in de praktijk.`
          );
        } else {
          objectivesArray = ["Na het bestuderen van dit hoofdstuk begrijp je de belangrijkste concepten en kun je deze toepassen in de praktijk."];
        }
      }
    }

    console.log(`Found ${objectivesArray.length} learning objectives`);
    
    const totalObjectives = objectivesArray.length;
    const maxBatches = Math.ceil(totalObjectives / batchSize);
    
    if (batchIndex >= maxBatches) {
      console.log(`Invalid batch index ${batchIndex}, max is ${maxBatches - 1}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid batch index',
          metadata: { totalObjectives, totalBatches: maxBatches }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const startIndex = batchIndex * batchSize;
    const endIndex = Math.min(startIndex + batchSize, totalObjectives);
    const batchObjectives = objectivesArray.slice(startIndex, endIndex);
    
    console.log(`Processing batch ${batchIndex + 1}/${maxBatches} with ${batchObjectives.length} objectives`);
    
    if (batchObjectives.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          questions: [],
          metadata: { 
            isLastBatch: true,
            totalObjectives,
            totalBatches: maxBatches,
            processedObjectives: totalObjectives
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const objectivesForPrompt = batchObjectives.join('\n- ');
    // Make sure we request exactly the number of questions per objective specified by the client
    const totalQuestionsExpected = batchObjectives.length * questionsPerObjective;
    
    const maxContentLength = 6000;
    let contentForPrompt = chapterContent;
    if (contentForPrompt.length > maxContentLength) {
      contentForPrompt = contentForPrompt.substring(0, maxContentLength);
      console.log(`Content truncated to ${maxContentLength} characters`);
    }
    
    const prompt = `
Genereer een JSON-array met EXACT ${totalQuestionsExpected} quizvragen, waarbij per leerdoelstelling precies ${questionsPerObjective} vraag wordt gegenereerd uit de volgende leerdoelstellingen:
- ${objectivesForPrompt}

Gebruik de volgende instructies:
1. Alle vragen moeten een praktische focus hebben: ze moeten realistische scenario's of bedrijfscasussen bevatten waarin de student de kennis moet toepassen.
2. Verwerk concrete bedrijfssituaties, waarbij echte bedrijfsnamen of realistische voorbeelden gebruikt worden.
3. Elke vraag is beslissingsgericht en vereist dat de student het juiste begrip kiest uit vergelijkbare en verwante begrippen.
4. De antwoordopties moeten uitdagend zijn: drie onjuiste opties dienen subtiele fouten of gerelateerde, maar foutieve concepten te bevatten.
5. Vermijd vragen die alleen definities of abstracte kennis testen; focus op toepassing en het vergelijken van begrippen.
6. Zorg ervoor dat de correcte antwoorden evenredig verdeeld zijn over de vier opties (A, B, C, D), zodat er geen oververtegenwoordiging is van een bepaalde positie.

Gebruik onderstaande JSON-structuur voor elke vraag:
{
  "question": "De vraag hier",
  "options": ["Optie A", "Optie B", "Optie C", "Optie D"],
  "correctAnswer": <0-3>, // index van het correcte antwoord (0=A, 1=B, 2=C, 3=D)
  "explanation": "Uitleg waarom dit het juiste antwoord is",
  "objective": "De leerdoelstelling waar deze vraag bij hoort",
  "questionType": "Scenario/Case/Toepassing/Analyse" // Type vraag dat bij deze leerdoelstelling past
}

Relevante informatie:
Boektitel: ${bookTitle}
Hoofdstuktitel: ${chapterTitle}
Inhoud:
${contentForPrompt}

Belangrijk: Genereer EXACT ${totalQuestionsExpected} quizvragen, waarbij per leerdoelstelling precies ${questionsPerObjective} vraag wordt gemaakt. Geef enkel de JSON-array terug, zonder extra tekst of uitleg.`;

    console.log(`Calling OpenAI API to generate questions for batch ${batchIndex + 1}/${maxBatches}`);
    
    try {
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Using mini for faster and more cost-effective responses
          messages: [
            { role: 'system', content: 'Je bent een expert in online marketing en onderwijsspecialist die praktische, op toepassing gerichte quizvragen ontwerpt.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!openAIResponse.ok) {
        const errorBody = await openAIResponse.text();
        console.error(`OpenAI API error (${openAIResponse.status}): ${errorBody}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Error from OpenAI API: ${openAIResponse.status} ${openAIResponse.statusText}`,
            details: errorBody
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      const responseData = await openAIResponse.json();
      console.log('OpenAI API response received');

      if (!responseData.choices || !responseData.choices[0]) {
        console.error('Invalid response from OpenAI:', responseData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid response from AI',
            details: responseData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      const aiResponse = responseData.choices[0].message.content;
      
      // Enhanced JSON parsing logic to handle various response formats
      let questions;
      try {
        // First try direct parsing
        try {
          questions = JSON.parse(aiResponse);
          console.log("Successfully parsed JSON directly");
        } catch (initialError) {
          console.log("Failed to parse JSON directly:", initialError.message);
          console.log("Attempting alternative parsing methods...");
          
          // Try to extract JSON from markdown code blocks
          const jsonMatch = aiResponse.match(/```(?:json)?\s*(\[\s*\{.*\}\s*\])\s*```/s);
          if (jsonMatch && jsonMatch[1]) {
            try {
              questions = JSON.parse(jsonMatch[1]);
              console.log("Successfully parsed JSON from code block");
            } catch (codeBlockError) {
              console.log("Failed to parse JSON from code block:", codeBlockError.message);
              throw codeBlockError;
            }
          } else {
            // Try to find array pattern without code blocks
            const arrayMatch = aiResponse.match(/\[\s*\{.*\}\s*\]/s);
            if (arrayMatch) {
              try {
                questions = JSON.parse(arrayMatch[0]);
                console.log("Successfully parsed JSON from array pattern");
              } catch (arrayMatchError) {
                console.log("Failed to parse array pattern:", arrayMatchError.message);
                throw arrayMatchError;
              }
            } else {
              // Last attempt: try to fix common JSON syntax issues
              try {
                // Replace single quotes with double quotes
                const fixedJson = aiResponse
                  .replace(/'/g, '"')
                  .replace(/\n/g, '')
                  .match(/\[\s*\{.*\}\s*\]/s);
                  
                if (fixedJson) {
                  questions = JSON.parse(fixedJson[0]);
                  console.log("Successfully parsed JSON after fixing syntax");
                } else {
                  throw new Error("Could not extract valid JSON from response after fixing syntax");
                }
              } catch (fixedError) {
                console.log("All parsing attempts failed");
                throw new Error("Could not extract valid JSON from response");
              }
            }
          }
        }
        
        if (!Array.isArray(questions)) {
          throw new Error('Parsed response is not an array');
        }
      } catch (error) {
        console.error('Error parsing AI response:', error);
        console.log('Raw AI response:', aiResponse);
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to parse questions from AI response',
            rawResponse: aiResponse.substring(0, 1000) // Only include a preview for debugging
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

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
      
      console.log(`Successfully extracted ${questions.length} questions`);

      if (questions.length > totalQuestionsExpected) {
        console.log(`Trimming questions from ${questions.length} to ${totalQuestionsExpected}`);
        questions = questions.slice(0, totalQuestionsExpected);
      }

      // Validate each question for required fields
      const validQuestions = questions.filter(q => {
        const isValid = q && 
          typeof q.question === 'string' && 
          Array.isArray(q.options) && 
          q.options.length === 4 && 
          (typeof q.correctAnswer === 'number' || typeof q.correct === 'string' || typeof q.correct === 'number');
        
        if (!isValid) {
          console.log('Filtering out invalid question:', JSON.stringify(q));
        }
        return isValid;
      });
      
      if (validQuestions.length === 0 && questions.length > 0) {
        console.error('All questions were invalid after validation');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'All questions were invalid after validation',
            sample: questions[0] 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      const answerDistribution = validQuestions.reduce((dist, q) => {
        let letter;
        if (typeof q.correctAnswer === 'number') {
          letter = ['A', 'B', 'C', 'D'][q.correctAnswer];
        } else if (typeof q.correct === 'string' && q.correct.length === 1) {
          letter = q.correct;
        } else if (typeof q.correct === 'number') {
          letter = ['A', 'B', 'C', 'D'][q.correct];
        } else {
          letter = 'Unknown';
        }
        dist[letter] = (dist[letter] || 0) + 1;
        return dist;
      }, { A: 0, B: 0, C: 0, D: 0 });

      const questionTypeDistribution = validQuestions.reduce((dist, q) => {
        const type = q.questionType || 'Onbekend';
        dist[type] = (dist[type] || 0) + 1;
        return dist;
      }, {});

      // Match questions to objectives more accurately
      const questionsWithObjectives = validQuestions.map((q, index) => {
        if (!q.objective) {
          const bestMatchIndex = batchObjectives.findIndex(obj => 
            q.question.toLowerCase().includes(obj.toLowerCase().substring(0, 20)));
          
          q.objective = bestMatchIndex >= 0 ? 
            batchObjectives[bestMatchIndex] : 
            batchObjectives[Math.floor(index / questionsPerObjective) % batchObjectives.length];
        }
        
        if (!q.questionType) {
          if (q.question.match(/scenario|situatie|case|geval/i)) {
            q.questionType = 'Scenario';
          } else if (q.question.match(/data|metriek|analyse|statistiek/i)) {
            q.questionType = 'Data-interpretatie';
          } else if (q.question.match(/vergelijk|verschil|overeenkomst/i)) {
            q.questionType = 'Vergelijkende analyse';
          } else if (q.question.match(/eerst|prioriteit|belangrijk/i)) {
            q.questionType = 'Prioritering';
          } else {
            q.questionType = 'Case';
          }
        }
        
        return q;
      });

      // Create a summary of questions by objective
      const questionsByObjective = batchObjectives.map(objective => {
        const objQuestions = questionsWithObjectives.filter(q => q.objective === objective);
        return {
          objective,
          questionCount: objQuestions.length,
          types: objQuestions.reduce((types, q) => {
            types[q.questionType || 'Onbekend'] = (types[q.questionType || 'Onbekend'] || 0) + 1;
            return types;
          }, {})
        };
      });

      // Updated to track total processed objectives correctly
      const responsePayload = {
        success: true,
        questions: questionsWithObjectives,
        metadata: {
          bookId,
          chapterId,
          paragraphId,
          totalObjectives,
          totalBatches: maxBatches,
          currentBatch: batchIndex,
          isLastBatch: batchIndex >= maxBatches - 1,
          processedObjectives: endIndex,
          totalQuestions: questionsWithObjectives.length,
          questionsByObjective
        },
        context: {
          bookTitle,
          chapterTitle
        }
      };

      if (debug) {
        responsePayload.debug = {
          prompt,
          response: aiResponse.substring(0, 1000),
          answerDistribution,
          questionTypeDistribution,
          objectives,
          allObjectives: objectivesArray,
          tokenEstimates: {
            promptTokens: Math.ceil(prompt.length / 4),
            requestedMaxTokens: 4000
          }
        };
      }

      return new Response(
        JSON.stringify(responsePayload),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Error in OpenAI request:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Error in OpenAI request: ${error.message || 'Unknown error'}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in generate-online-marketing-quiz function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
