// UPDATED SUPABASE TYPES - Replace your existing types.ts with this
// Generated to include all SEO fields

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      answer_keys: {
        Row: {
          ai_content_generated: boolean | null
          answer_key_link: string
          content_generated_at: string | null
          country_id: string
          created_at: string
          exam_date: string | null
          exam_name: string
          id: string
          is_active: boolean | null
          is_pinned: boolean | null
          keywords: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          objection_deadline: string | null
          objection_link: string | null
          page_content: string | null
          post_name: string | null
          release_date: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          ai_content_generated?: boolean | null
          answer_key_link: string
          content_generated_at?: string | null
          country_id: string
          created_at?: string
          exam_date?: string | null
          exam_name: string
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          keywords?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          objection_deadline?: string | null
          objection_link?: string | null
          page_content?: string | null
          post_name?: string | null
          release_date?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          ai_content_generated?: boolean | null
          answer_key_link?: string
          content_generated_at?: string | null
          country_id?: string
          created_at?: string
          exam_date?: string | null
          exam_name?: string
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          keywords?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          objection_deadline?: string | null
          objection_link?: string | null
          page_content?: string | null
          post_name?: string | null
          release_date?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_keys_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          flag_emoji: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          flag_emoji?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          flag_emoji?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      dynamic_sections: {
        Row: {
          ai_prompt: string | null
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          section_type: string
          show_in_tabs: boolean | null
          show_in_timeline: boolean | null
          slug: string
          tab_order: number | null
          updated_at: string | null
        }
        Insert: {
          ai_prompt?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          section_type: string
          show_in_tabs?: boolean | null
          show_in_timeline?: boolean | null
          slug: string
          tab_order?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_prompt?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          section_type?: string
          show_in_tabs?: boolean | null
          show_in_timeline?: boolean | null
          slug?: string
          tab_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dynamic_section_items: {
        Row: {
          ai_content_generated: boolean | null
          badge_color: string | null
          badge_text: string | null
          content_generated_at: string | null
          country_id: string | null
          created_at: string | null
          date_value: string | null
          description: string | null
          form_data: Json | null
          id: string
          is_active: boolean | null
          is_pinned: boolean | null
          link_text: string | null
          link_url: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          page_content: string | null
          section_id: string | null
          slug: string | null
          subtitle: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_content_generated?: boolean | null
          badge_color?: string | null
          badge_text?: string | null
          content_generated_at?: string | null
          country_id?: string | null
          created_at?: string | null
          date_value?: string | null
          description?: string | null
          form_data?: Json | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          link_text?: string | null
          link_url?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          page_content?: string | null
          section_id?: string | null
          slug?: string | null
          subtitle?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_content_generated?: boolean | null
          badge_color?: string | null
          badge_text?: string | null
          content_generated_at?: string | null
          country_id?: string | null
          created_at?: string | null
          date_value?: string | null
          description?: string | null
          form_data?: Json | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          link_text?: string | null
          link_url?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          page_content?: string | null
          section_id?: string | null
          slug?: string | null
          subtitle?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_section_items_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamic_section_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "dynamic_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_listings: {
        Row: {
          admit_card_link: string | null
          ai_content_generated: boolean | null
          conducting_body: string
          content_generated_at: string | null
          country_id: string
          created_at: string
          exam_date: string | null
          exam_name: string
          id: string
          is_active: boolean
          keywords: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          notification_date: string | null
          official_website: string | null
          page_content: string | null
          result_link: string | null
          slug: string | null
          syllabus_link: string | null
          updated_at: string
        }
        Insert: {
          admit_card_link?: string | null
          ai_content_generated?: boolean | null
          conducting_body: string
          content_generated_at?: string | null
          country_id: string
          created_at?: string
          exam_date?: string | null
          exam_name: string
          id?: string
          is_active?: boolean
          keywords?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          notification_date?: string | null
          official_website?: string | null
          page_content?: string | null
          result_link?: string | null
          slug?: string | null
          syllabus_link?: string | null
          updated_at?: string
        }
        Update: {
          admit_card_link?: string | null
          ai_content_generated?: boolean | null
          conducting_body?: string
          content_generated_at?: string | null
          country_id?: string
          created_at?: string
          exam_date?: string | null
          exam_name?: string
          id?: string
          is_active?: boolean
          keywords?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          notification_date?: string | null
          official_website?: string | null
          page_content?: string | null
          result_link?: string | null
          slug?: string | null
          syllabus_link?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_listings_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      footer_famous_exams: {
        Row: {
          ai_content_generated: boolean | null
          content_generated_at: string | null
          country_id: string
          created_at: string
          display_order: number | null
          exam_name: string
          exam_short_name: string | null
          id: string
          is_active: boolean
          keywords: string | null
          meta_description: string | null
          meta_title: string | null
          official_website: string
          page_content: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          ai_content_generated?: boolean | null
          content_generated_at?: string | null
          country_id: string
          created_at?: string
          display_order?: number | null
          exam_name: string
          exam_short_name?: string | null
          id?: string
          is_active?: boolean
          keywords?: string | null
          meta_description?: string | null
          meta_title?: string | null
          official_website: string
          page_content?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          ai_content_generated?: boolean | null
          content_generated_at?: string | null
          country_id?: string
          created_at?: string
          display_order?: number | null
          exam_name?: string
          exam_short_name?: string | null
          id?: string
          is_active?: boolean
          keywords?: string | null
          meta_description?: string | null
          meta_title?: string | null
          official_website?: string
          page_content?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "footer_famous_exams_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      job_listings: {
        Row: {
          age_limit: string | null
          ai_content_generated: boolean | null
          application_deadline: string | null
          apply_link: string | null
          category: string | null
          content_generated_at: string | null
          country_id: string
          created_at: string
          department_name: string
          description: string | null
          id: string
          is_active: boolean
          job_description: string | null
          job_title: string
          keywords: string | null
          location: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          official_link: string
          official_notification: string | null
          page_content: string | null
          posted_date: string
          qualification: string | null
          qualifications: string | null
          salary_range: string | null
          slug: string | null
          updated_at: string
          vacancies: number | null
        }
        Insert: {
          age_limit?: string | null
          ai_content_generated?: boolean | null
          application_deadline?: string | null
          apply_link?: string | null
          category?: string | null
          content_generated_at?: string | null
          country_id: string
          created_at?: string
          department_name: string
          description?: string | null
          id?: string
          is_active?: boolean
          job_description?: string | null
          job_title: string
          keywords?: string | null
          location?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          official_link: string
          official_notification?: string | null
          page_content?: string | null
          posted_date?: string
          qualification?: string | null
          qualifications?: string | null
          salary_range?: string | null
          slug?: string | null
          updated_at?: string
          vacancies?: number | null
        }
        Update: {
          age_limit?: string | null
          ai_content_generated?: boolean | null
          application_deadline?: string | null
          apply_link?: string | null
          category?: string | null
          content_generated_at?: string | null
          country_id?: string
          created_at?: string
          department_name?: string
          description?: string | null
          id?: string
          is_active?: boolean
          job_description?: string | null
          job_title?: string
          keywords?: string | null
          location?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          official_link?: string
          official_notification?: string | null
          page_content?: string | null
          posted_date?: string
          qualification?: string | null
          qualifications?: string | null
          salary_range?: string | null
          slug?: string | null
          updated_at?: string
          vacancies?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_listings_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          country_id: string | null
          created_at: string
          id: string
          is_active: boolean
          is_pinned: boolean | null
          notice_link: string | null
          notice_text: string
          updated_at: string
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_pinned?: boolean | null
          notice_link?: string | null
          notice_text: string
          updated_at?: string
        }
        Update: {
          country_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_pinned?: boolean | null
          notice_link?: string | null
          notice_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          ai_content_generated: boolean | null
          conducting_body: string | null
          content_generated_at: string | null
          country_id: string
          created_at: string
          exam_name: string
          id: string
          is_active: boolean
          is_pinned: boolean
          keywords: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          page_content: string | null
          release_date: string | null
          result_date: string | null
          result_link: string | null
          slug: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          ai_content_generated?: boolean | null
          conducting_body?: string | null
          content_generated_at?: string | null
          country_id: string
          created_at?: string
          exam_name: string
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          keywords?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          page_content?: string | null
          release_date?: string | null
          result_date?: string | null
          result_link?: string | null
          slug?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          ai_content_generated?: boolean | null
          conducting_body?: string | null
          content_generated_at?: string | null
          country_id?: string
          created_at?: string
          exam_name?: string
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          keywords?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          page_content?: string | null
          release_date?: string | null
          result_date?: string | null
          result_link?: string | null
          slug?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const