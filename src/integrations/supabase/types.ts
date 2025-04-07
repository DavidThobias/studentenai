export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      books: {
        Row: {
          author_name: string | null
          book_title: string
          chapter_number: number
          chapter_title: string
          content: string
          id: number
          objectives: string | null
          paragraph_number: number
        }
        Insert: {
          author_name?: string | null
          book_title: string
          chapter_number: number
          chapter_title: string
          content: string
          id?: number
          objectives?: string | null
          paragraph_number: number
        }
        Update: {
          author_name?: string | null
          book_title?: string
          chapter_number?: number
          chapter_title?: string
          content?: string
          id?: number
          objectives?: string | null
          paragraph_number?: number
        }
        Relationships: []
      }
      document_sections: {
        Row: {
          content: string
          created_at: string | null
          document_id: string
          id: string
          parent_section_id: string | null
          section_number: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          document_id: string
          id?: string
          parent_section_id?: string | null
          section_number?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          document_id?: string
          id?: string
          parent_section_id?: string | null
          section_number?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_sections_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "user_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_sections_parent_section_id_fkey"
            columns: ["parent_section_id"]
            isOneToOne: false
            referencedRelation: "document_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      paragraph_progress: {
        Row: {
          book_id: number
          chapter_id: number
          completed: boolean
          completed_date: string | null
          id: string
          last_attempted: string
          paragraph_id: number
          percentage: number | null
          score: number | null
          total_questions: number | null
          user_id: string | null
        }
        Insert: {
          book_id: number
          chapter_id: number
          completed?: boolean
          completed_date?: string | null
          id?: string
          last_attempted?: string
          paragraph_id: number
          percentage?: number | null
          score?: number | null
          total_questions?: number | null
          user_id?: string | null
        }
        Update: {
          book_id?: number
          chapter_id?: number
          completed?: boolean
          completed_date?: string | null
          id?: string
          last_attempted?: string
          paragraph_id?: number
          percentage?: number | null
          score?: number | null
          total_questions?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          book_id: number
          chapter_id: number | null
          completed: boolean
          created_at: string
          id: string
          paragraph_id: number | null
          percentage: number
          score: number
          total_questions: number
          user_id: string | null
        }
        Insert: {
          book_id: number
          chapter_id?: number | null
          completed?: boolean
          created_at?: string
          id?: string
          paragraph_id?: number | null
          percentage: number
          score: number
          total_questions: number
          user_id?: string | null
        }
        Update: {
          book_id?: number
          chapter_id?: number | null
          completed?: boolean
          created_at?: string
          id?: string
          paragraph_id?: number | null
          percentage?: number
          score?: number
          total_questions?: number
          user_id?: string | null
        }
        Relationships: []
      }
      user_documents: {
        Row: {
          content: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          processed: boolean | null
          processing_error: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          processed?: boolean | null
          processing_error?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          processed?: boolean | null
          processing_error?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      user_quiz_stats: {
        Row: {
          average_score: number | null
          book_ids: number[] | null
          books_studied: number | null
          chapters_studied: number | null
          last_quiz_date: string | null
          paragraphs_studied: number | null
          total_correct_answers: number | null
          total_questions: number | null
          total_quizzes: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_table_info: {
        Args: { table_name: string }
        Returns: {
          column_name: string
          data_type: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
