// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ncipejuazrewiizxtkcj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jaXBlanVhenJld2lpenh0a2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMzE0MTYsImV4cCI6MjA1NzkwNzQxNn0.9GFHmHd_cM6ijb2GZPBfbSCKPJLluoTvfVR4Eo8C-xU";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);