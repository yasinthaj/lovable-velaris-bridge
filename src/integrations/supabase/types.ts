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
      accounts: {
        Row: {
          account: string | null
          billed_arr: number | null
          contracted_arr: number | null
          csat: string | null
          health: number | null
          joined_date: string | null
          lifecycle_stage: string | null
          mrr: number | null
          nps: number | null
          owner: string | null
          pulse: number | null
          renewal_date: string | null
          velaris_id: number
        }
        Insert: {
          account?: string | null
          billed_arr?: number | null
          contracted_arr?: number | null
          csat?: string | null
          health?: number | null
          joined_date?: string | null
          lifecycle_stage?: string | null
          mrr?: number | null
          nps?: number | null
          owner?: string | null
          pulse?: number | null
          renewal_date?: string | null
          velaris_id: number
        }
        Update: {
          account?: string | null
          billed_arr?: number | null
          contracted_arr?: number | null
          csat?: string | null
          health?: number | null
          joined_date?: string | null
          lifecycle_stage?: string | null
          mrr?: number | null
          nps?: number | null
          owner?: string | null
          pulse?: number | null
          renewal_date?: string | null
          velaris_id?: number
        }
        Relationships: []
      }
      contacts: {
        Row: {
          account: string | null
          contact_id: number
          created_at: string
          email_address: string | null
          name: string | null
        }
        Insert: {
          account?: string | null
          contact_id?: number
          created_at?: string
          email_address?: string | null
          name?: string | null
        }
        Update: {
          account?: string | null
          contact_id?: number
          created_at?: string
          email_address?: string | null
          name?: string | null
        }
        Relationships: []
      }
      deduplication_rules: {
        Row: {
          created_at: string
          entity_type: string
          gong_field: string
          id: string
          user_id: string
          velaris_field: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          gong_field: string
          id?: string
          user_id: string
          velaris_field: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          gong_field?: string
          id?: string
          user_id?: string
          velaris_field?: string
        }
        Relationships: []
      }
      emails: {
        Row: {
          body: string | null
          complete: string | null
          email_id: string
          from_email: string | null
          from_user_name: string | null
          linked_account: string | null
          need_to_action: string | null
          opportunity: string | null
          opportunity_details: string | null
          pending_follow_up: string | null
          pending_reply: string | null
          receiver_type: string | null
          reply_to_message_id: string | null
          risk: string | null
          risk_details: string | null
          sender_type: string | null
          subject: string | null
          thread_id: string
          timestamp: string | null
          to: string | null
        }
        Insert: {
          body?: string | null
          complete?: string | null
          email_id: string
          from_email?: string | null
          from_user_name?: string | null
          linked_account?: string | null
          need_to_action?: string | null
          opportunity?: string | null
          opportunity_details?: string | null
          pending_follow_up?: string | null
          pending_reply?: string | null
          receiver_type?: string | null
          reply_to_message_id?: string | null
          risk?: string | null
          risk_details?: string | null
          sender_type?: string | null
          subject?: string | null
          thread_id: string
          timestamp?: string | null
          to?: string | null
        }
        Update: {
          body?: string | null
          complete?: string | null
          email_id?: string
          from_email?: string | null
          from_user_name?: string | null
          linked_account?: string | null
          need_to_action?: string | null
          opportunity?: string | null
          opportunity_details?: string | null
          pending_follow_up?: string | null
          pending_reply?: string | null
          receiver_type?: string | null
          reply_to_message_id?: string | null
          risk?: string | null
          risk_details?: string | null
          sender_type?: string | null
          subject?: string | null
          thread_id?: string
          timestamp?: string | null
          to?: string | null
        }
        Relationships: []
      }
      integration_configs: {
        Row: {
          created_at: string
          custom_sync_hours: number | null
          gong_api_key_encrypted: string | null
          id: string
          is_active: boolean | null
          selected_activity_type_id: string | null
          sync_frequency: string | null
          updated_at: string
          user_id: string
          velaris_token_encrypted: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          custom_sync_hours?: number | null
          gong_api_key_encrypted?: string | null
          id?: string
          is_active?: boolean | null
          selected_activity_type_id?: string | null
          sync_frequency?: string | null
          updated_at?: string
          user_id: string
          velaris_token_encrypted?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          custom_sync_hours?: number | null
          gong_api_key_encrypted?: string | null
          id?: string
          is_active?: boolean | null
          selected_activity_type_id?: string | null
          sync_frequency?: string | null
          updated_at?: string
          user_id?: string
          velaris_token_encrypted?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          created_at: string
          error_message: string | null
          gong_call_id: string | null
          gong_call_title: string | null
          id: string
          status: string
          sync_type: string | null
          user_id: string
          velaris_activity_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          gong_call_id?: string | null
          gong_call_title?: string | null
          id?: string
          status: string
          sync_type?: string | null
          user_id: string
          velaris_activity_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          gong_call_id?: string | null
          gong_call_title?: string | null
          id?: string
          status?: string
          sync_type?: string | null
          user_id?: string
          velaris_activity_id?: string | null
        }
        Relationships: []
      }
      thread_comments: {
        Row: {
          comment: string | null
          created_at: string
          created_by_user_id: string | null
          id: number
          is_deleted: string | null
          thread_id: string | null
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: number
          is_deleted?: string | null
          thread_id?: string | null
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: number
          is_deleted?: string | null
          thread_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          name: string | null
          role: string | null
          status: string | null
          user_id: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          name?: string | null
          role?: string | null
          status?: string | null
          user_id?: number
        }
        Update: {
          created_at?: string
          email?: string | null
          name?: string | null
          role?: string | null
          status?: string | null
          user_id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
