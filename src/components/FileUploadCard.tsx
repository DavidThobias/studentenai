
import { useState } from 'react';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FileUploadCardProps {
  onFileUploaded: (documentId: string, fileName: string) => void;
  className?: string;
}

const FileUploadCard = ({ onFileUploaded, className }: FileUploadCardProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileSelect(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    // Check if it's a PDF or text document
    if (selectedFile.type === 'application/pdf' || 
        selectedFile.type === 'text/plain' ||
        selectedFile.type.includes('document')) {
      setFile(selectedFile);
      setUploadError(null);
      toast.success(`Bestand "${selectedFile.name}" is geselecteerd.`);
    } else {
      setUploadError("Alleen PDF of tekstdocumenten zijn toegestaan.");
      toast.error("Alleen PDF of tekstdocumenten zijn toegestaan.");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecteer eerst een bestand om te uploaden.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);
      setUploadError(null);

      // 1. Upload file to storage
      const timestamp = new Date().toISOString();
      const fileExt = file.name.split('.').pop();
      const filePath = `uploads/${timestamp}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      
      setUploadProgress(30);
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('summaries')
        .upload(filePath, file, {
          // Allow unauthenticated uploads
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Fout bij het uploaden: ${uploadError.message}`);
      }
      
      setUploadProgress(60);
      
      // 2. Create document record with a null user_id for unauthenticated users
      const { data: document, error: documentError } = await supabase
        .from('user_documents')
        .insert({
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          // Don't rely on auth.getUser() which will be null for unauthenticated users
          user_id: null
        })
        .select()
        .single();

      if (documentError) {
        throw new Error(`Fout bij het opslaan van documentgegevens: ${documentError.message}`);
      }
      
      setUploadProgress(80);
      
      // 3. Trigger document processing
      const { error: processingError } = await supabase.functions
        .invoke('process-document', {
          body: { documentId: document.id }
        });

      if (processingError) {
        throw new Error(`Fout bij het verwerken van document: ${processingError.message}`);
      }
      
      setUploadProgress(100);
      
      toast.success("Samenvatting is succesvol geüpload en wordt verwerkt.");
      
      // Call the callback with the document ID
      onFileUploaded(document.id, file.name);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Onbekende fout bij het uploaden');
      toast.error(error instanceof Error ? error.message : 'Onbekende fout bij het uploaden');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-study-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-study-600" />
        </div>
        <CardTitle className="text-2xl">Upload je samenvatting</CardTitle>
        <CardDescription>
          Upload je eigen studiemateriaal of samenvatting om een gepersonaliseerde leerervaring te krijgen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? "border-study-600 bg-study-50" : "border-gray-300 hover:border-study-400"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-study-100 flex items-center justify-center">
              <Upload className="h-6 w-6 text-study-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              Sleep een PDF of tekstdocument hierheen, of
            </p>
            <label className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer">
              Kies een bestand
              <input
                type="file"
                className="hidden"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
            {file && (
              <p className="text-sm text-study-600 font-medium mt-2">
                Geselecteerd: {file.name}
              </p>
            )}
          </div>
        </div>
        
        {isUploading && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm">Bestand wordt geüpload en verwerkt...</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
        
        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm">{uploadError}</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleUpload} 
          disabled={!file || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Bezig met uploaden...
            </>
          ) : (
            <>
              Upload en verwerk
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileUploadCard;
