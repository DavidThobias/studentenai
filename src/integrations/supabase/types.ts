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
          paragraph_number: number
        }
        Insert: {
          author_name?: string | null
          book_title: string
          chapter_number: number
          chapter_title: string
          content: string
          id?: number
          paragraph_number: number
        }
        Update: {
          author_name?: string | null
          book_title?: string
          chapter_number?: number
          chapter_title?: string
          content?: string
          id?: number
          paragraph_number?: number
        }
        Relationships: []
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
    }
    Views: {
      user_quiz_stats: {
        Row: {
          average_score: number | null
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
        Args: {
          table_name: string
        }
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
