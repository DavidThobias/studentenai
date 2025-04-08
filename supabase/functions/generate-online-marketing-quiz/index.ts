
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
    let objectivesArray: string[] = [];

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
          .maybeSingle();

        if (!chapterError && chapterData && chapterData.objectives) {
          objectives = chapterData.objectives;
        }
      }
    } else if (chapterId) {
      // For an entire chapter
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

      // Combine all paragraphs content
      chapterContent = chapterData.map(p => p.content).join('\n\n');
      chapterTitle = chapterData[0]?.chapter_title || '';
      
      // Get objectives from first paragraph that has them
      for (const paragraph of chapterData) {
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

    // Parse objectives into an array by splitting on newlines and/or bullet points
    if (objectives) {
      objectivesArray = objectives
        .split(/\n|-|\*/)
        .map(obj => obj.trim())
        .filter(obj => obj.length > 10); // Filter out empty or very short lines
    }

    if (objectivesArray.length === 0) {
      // If no objectives found, extract them from content using a simple heuristic
      const objectivesSection = chapterContent.match(/doelstelling(en)?:?\s*([\s\S]*?)(?=\n\n|$)/i);
      if (objectivesSection && objectivesSection[2]) {
        objectivesArray = objectivesSection[2]
          .split(/\n|-|\*/)
          .map(obj => obj.trim())
          .filter(obj => obj.length > 10);
      }
      
      // If still no objectives, create some based on section headers or bold terms
      if (objectivesArray.length === 0) {
        const boldTerms = chapterContent.match(/\*\*(.*?)\*\*/g)?.map(term => term.replace(/\*\*/g, '')) || [];
        const sectionHeaders = chapterContent.match(/^#+\s+(.*?)$/gm)?.map(header => header.replace(/^#+\s+/, '')) || [];
        
        // Use section headers if available, otherwise bold terms
        const terms = sectionHeaders.length > 0 ? sectionHeaders : boldTerms;
        
        if (terms.length > 0) {
          // Convert the top 5 terms into pseudo-objectives
          objectivesArray = terms.slice(0, 5).map(term => 
            `Na het bestuderen van dit hoofdstuk begrijp je het concept "${term}" en kun je dit toepassen in de praktijk.`
          );
        } else {
          // Last resort: create a generic objective
          objectivesArray = ["Na het bestuderen van dit hoofdstuk begrijp je de belangrijkste concepten en kun je deze toepassen in de praktijk."];
        }
      }
    }

    console.log(`Found ${objectivesArray.length} learning objectives`);
    
    // Implement batch processing for objectives
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
    
    // Select objectives for this batch
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
            processedObjectives: 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Build the prompt for OpenAI focusing on application-based questions
    const objectivesForPrompt = batchObjectives.join('\n- ');
    const totalQuestionsExpected = batchObjectives.length * questionsPerObjective;
    
    // Limit chapter content to avoid token limit issues
    const maxContentLength = 6000; // Reduced from 8000 to ensure we don't hit token limits
    let contentForPrompt = chapterContent;
    if (contentForPrompt.length > maxContentLength) {
      contentForPrompt = contentForPrompt.substring(0, maxContentLength);
      console.log(`Content truncated to ${maxContentLength} characters`);
    }
    
    const prompt = `
Genereer meervoudige-keuzevragen voor een quiz over online marketing. Focus in elke vraag op PRAKTISCHE TOEPASSING van de kennis, vermijd vragen die alleen om definities of pure kennis vragen.

Alle vragen moeten aan de volgende criteria voldoen:
1. Praktisch: Stel scenario's en situaties voor waarin de kennis moet worden toegepast
2. Bedrijfscontext: Gebruik echte bedrijfsnamen of realistische bedrijfsscenario's
3. Beslissingsgericht: De student moet een beslissing nemen over wat de beste aanpak is
4. Concreet: Vermijd abstracte concepten, focus op concrete acties en strategieën
5. Uitdagend: De antwoordopties moeten plausibel zijn en echt onderscheidingsvermogen vereisen

Maak GEEN vragen die alleen om definities, theorieën of feiten vragen. De leerling moet kunnen laten zien dat ze de stof kunnen TOEPASSEN, niet alleen onthouden.

Gebruik hoofdzakelijk deze vraagtypes:
1. Scenario-vragen: "Een webshop heeft het volgende probleem... Welke aanpak is het meest effectief?"
2. Case-vragen: "Bedrijf X wil... Welke strategie past het beste bij hun doelstelling?"
3. Data-interpretatie: "Uit de analytics blijkt dat... Wat zou je aanbevelen?"
4. Vergelijkende analyse: "Welke van deze vier strategieën is het meest geschikt voor...?"
5. Prioriteringsvragen: "Welke actie zou je EERST ondernemen om...?"

Voorbeeld van een GOEDE vraag:
Een kleine webshop met handgemaakte sieraden merkt dat bezoekers producten bekijken maar niet aankopen. Uit analyse blijkt dat 70% afhaakt bij het afrekenen. Welke maatregel zou waarschijnlijk het meest direct bijdragen aan een hogere conversie?
A) Het toevoegen van meer productfoto's
B) Het implementeren van een chatfunctie
C) Het vereenvoudigen van het checkout-proces 
D) Het starten met sociale media advertenties
Correct antwoord: C - Aangezien bezoekers afhaken tijdens het afrekenen, zal het vereenvoudigen van dit proces direct impact hebben op de conversie.

Voorbeeld van een SLECHTE vraag (vermijd dit type):
Wat betekent het begrip "conversie" in online marketing?
A) Het aantal bezoekers dat een aankoop doet
B) Het aantal klikken op een advertentie
C) Het aantal bezoekers op de website
D) Het aantal volgers op sociale media
Correct antwoord: A - Conversie verwijst naar het aantal bezoekers dat een gewenste actie onderneemt.

Genereer ${questionsPerObjective} uitdagende vragen per leerdoelstelling in de volgende lijst:
- ${objectivesForPrompt}

Boektitel: ${bookTitle}
Hoofdstuktitel: ${chapterTitle}

Inhoud:
${contentForPrompt}

Genereer in totaal ongeveer ${totalQuestionsExpected} quizvragen. Elke vraag moet de volgende structuur hebben:
{
  "question": "De vraag hier",
  "options": ["Optie A", "Optie B", "Optie C", "Optie D"],
  "correctAnswer": 0, // index van het correcte antwoord (0-3)
  "explanation": "Uitleg waarom dit het juiste antwoord is",
  "objective": "De leerdoelstelling waar deze vraag bij hoort",
  "questionType": "Scenario/Case/Data-interpretatie/Vergelijkende analyse/Prioritering" // Type vraag dat bij deze leerdoelstelling past
}

Geef alleen de JSON-array terug, geen omliggende tekst.
`;

    // Call OpenAI API
    console.log(`Calling OpenAI API to generate questions for batch ${batchIndex + 1}/${maxBatches}`);
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Je bent een expert in online marketing en onderwijsspecialist die praktische, op toepassing gerichte quizvragen ontwerpt.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    const responseData = await openAIResponse.json();
    console.log('OpenAI API response received');

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

    // Count question types for analytics
    const questionTypeDistribution = questions.reduce((dist, q) => {
      const type = q.questionType || 'Onbekend';
      dist[type] = (dist[type] || 0) + 1;
      return dist;
    }, {});

    // Ensure each question has an objective
    const questionsWithObjectives = questions.map((q, index) => {
      if (!q.objective) {
        // If no objective is specified, assign to most likely objective based on question content
        const bestMatchIndex = batchObjectives.findIndex(obj => 
          q.question.toLowerCase().includes(obj.toLowerCase().substring(0, 20)));
        
        q.objective = bestMatchIndex >= 0 ? 
          batchObjectives[bestMatchIndex] : 
          batchObjectives[Math.floor(index / questionsPerObjective) % batchObjectives.length];
      }
      
      // Ensure questionType field exists
      if (!q.questionType) {
        // Basic classification based on question content
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

    // Group questions by objective for analysis
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

    // Prepare the response
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

    // Add debug info if requested
    if (debug) {
      responsePayload.debug = {
        prompt,
        response: aiResponse,
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
    console.error('Error in generate-online-marketing-quiz function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
