
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get Supabase credentials from environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin privileges
    // This bypasses RLS policies
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const requestData = await req.json();
    let documentId;
    
    // Controleren of we een directe upload verwerken of een bestaand document
    if (requestData.filePath && !requestData.documentId) {
      console.log('Processing direct upload');
      
      // Direct upload verwerking - maak eerst een document record aan
      const { data: document, error: insertError } = await supabase
        .from('user_documents')
        .insert({
          file_name: requestData.fileName,
          file_path: requestData.filePath,
          file_type: requestData.fileType,
          file_size: requestData.fileSize,
          user_id: null
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('Error creating document record:', insertError);
        throw new Error(`Fout bij het aanmaken van document record: ${insertError.message}`);
      }
      
      documentId = document.id;
    } else {
      documentId = requestData.documentId;
    }
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Document ID or file path is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing document with ID: ${documentId}`);

    // Fetch the document from the database using service role which bypasses RLS
    const { data: document, error: docError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('id', documentId)
      .single();
    
    if (docError || !document) {
      console.error('Error fetching document:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Download the file from storage using service role which bypasses RLS
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('summaries')
      .download(document.file_path);
    
    if (fileError || !fileData) {
      console.error('Error downloading file:', fileError);
      
      // Update document with error
      await supabase
        .from('user_documents')
        .update({ 
          processing_error: `Error downloading file: ${fileError?.message || 'Unknown error'}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);
      
      return new Response(
        JSON.stringify({ error: 'Error downloading file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Extract text content based on file type
    let textContent = '';
    
    if (document.file_type === 'application/pdf') {
      // For a production app, you would use a PDF parsing library
      // This is a simplified version that assumes the PDF content is directly accessible
      textContent = await fileData.text();
    } else {
      // For text files or other supported formats
      textContent = await fileData.text();
    }
    
    // Update document with extracted content
    await supabase
      .from('user_documents')
      .update({ 
        content: textContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);
    
    // Process document to identify sections/chapters (simplified approach)
    const sections = identifySections(textContent);
    
    // Store sections in the database
    for (const section of sections) {
      await supabase
        .from('document_sections')
        .insert({
          document_id: documentId,
          title: section.title,
          content: section.content,
          section_number: section.section_number
        });
    }
    
    // Mark document as processed
    await supabase
      .from('user_documents')
      .update({ 
        processed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Document processed successfully',
        sections_count: sections.length,
        documentId: documentId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error processing document:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Function to identify sections in the document content
function identifySections(text: string) {
  const sections = [];
  
  // Simple approach: Split by common chapter/section patterns
  // This is a basic implementation and would need to be enhanced for production use
  
  // Split by potential chapter headings (Chapter X, X., Section X, etc.)
  const lines = text.split('\n');
  let currentSection = { title: 'Introduction', content: '', section_number: '0' };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for chapter/section patterns (e.g., "Chapter 1", "1.", "1.1", etc.)
    const chapterMatch = line.match(/^(Chapter|Hoofdstuk)\s+(\d+)[\s\.:]/i);
    const sectionMatch = line.match(/^(\d+)(\.\d+)*[\s\.:]/);
    
    if (chapterMatch || sectionMatch) {
      // Save the previous section if it has content
      if (currentSection.content.trim()) {
        sections.push({ ...currentSection });
      }
      
      // Start a new section
      const sectionNumber = chapterMatch ? chapterMatch[2] : sectionMatch ? sectionMatch[0].replace(/[\s\.:]/g, '') : '';
      const title = line;
      
      currentSection = {
        title,
        content: '',
        section_number: sectionNumber
      };
    } else {
      // Add the line to the current section's content
      currentSection.content += line + '\n';
    }
  }
  
  // Add the final section if it has content
  if (currentSection.content.trim()) {
    sections.push({ ...currentSection });
  }
  
  return sections;
}
