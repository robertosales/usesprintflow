export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          assignee_id: string | null
          closed_at: string | null
          created_at: string
          description: string | null
          end_date: string
          hours: number
          hu_id: string
          id: string
          is_closed: boolean
          start_date: string
          team_id: string
          title: string
        }
        Insert: {
          activity_type?: string
          assignee_id?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          hours?: number
          hu_id: string
          id?: string
          is_closed?: boolean
          start_date: string
          team_id: string
          title: string
        }
        Update: {
          activity_type?: string
          assignee_id?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          hours?: number
          hu_id?: string
          id?: string
          is_closed?: boolean
          start_date?: string
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "developers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_hu_id_fkey"
            columns: ["hu_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_comments: {
        Row: {
          activity_id: string
          content: string
          created_at: string
          id: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          content: string
          created_at?: string
          id?: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          content?: string
          created_at?: string
          id?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_comments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_comments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          team_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          mime_type?: string
          team_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          team_id?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          action_message: string | null
          action_target_status: string | null
          action_type: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          team_id: string
          trigger_from_status: string | null
          trigger_to_status: string
          trigger_type: string
        }
        Insert: {
          action_message?: string | null
          action_target_status?: string | null
          action_type?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          team_id: string
          trigger_from_status?: string | null
          trigger_to_status: string
          trigger_type?: string
        }
        Update: {
          action_message?: string | null
          action_target_status?: string | null
          action_type?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          team_id?: string
          trigger_from_status?: string | null
          trigger_to_status?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          event_time: string | null
          event_type: string
          id: string
          team_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date: string
          event_time?: string | null
          event_type?: string
          id?: string
          team_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string
          id?: string
          team_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          created_at: string
          field_type: string
          id: string
          name: string
          options: string[] | null
          required: boolean
          team_id: string
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          name: string
          options?: string[] | null
          required?: boolean
          team_id: string
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          name?: string
          options?: string[] | null
          required?: boolean
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      demanda_hours: {
        Row: {
          created_at: string
          demanda_id: string
          descricao: string | null
          fase: string
          horas: number
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          demanda_id: string
          descricao?: string | null
          fase?: string
          horas?: number
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          demanda_id?: string
          descricao?: string | null
          fase?: string
          horas?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demanda_hours_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      demanda_transitions: {
        Row: {
          created_at: string
          demanda_id: string
          from_status: string | null
          id: string
          justificativa: string | null
          to_status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          demanda_id: string
          from_status?: string | null
          id?: string
          justificativa?: string | null
          to_status: string
          user_id: string
        }
        Update: {
          created_at?: string
          demanda_id?: string
          from_status?: string | null
          id?: string
          justificativa?: string | null
          to_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demanda_transitions_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      demandas: {
        Row: {
          aceite_data: string | null
          aceite_responsavel: string | null
          created_at: string
          descricao: string | null
          id: string
          projeto: string
          responsavel_arquiteto: string | null
          responsavel_dev: string | null
          responsavel_requisitos: string | null
          responsavel_teste: string | null
          rhm: string
          situacao: string
          sla: string
          team_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          aceite_data?: string | null
          aceite_responsavel?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          projeto?: string
          responsavel_arquiteto?: string | null
          responsavel_dev?: string | null
          responsavel_requisitos?: string | null
          responsavel_teste?: string | null
          rhm: string
          situacao?: string
          sla?: string
          team_id: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          aceite_data?: string | null
          aceite_responsavel?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          projeto?: string
          responsavel_arquiteto?: string | null
          responsavel_dev?: string | null
          responsavel_requisitos?: string | null
          responsavel_teste?: string | null
          rhm?: string
          situacao?: string
          sla?: string
          team_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandas_aceite_responsavel_fkey"
            columns: ["aceite_responsavel"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_responsavel_arquiteto_fkey"
            columns: ["responsavel_arquiteto"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_responsavel_dev_fkey"
            columns: ["responsavel_dev"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_responsavel_requisitos_fkey"
            columns: ["responsavel_requisitos"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_responsavel_teste_fkey"
            columns: ["responsavel_teste"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      developers: {
        Row: {
          avatar: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: string
          team_id: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          role?: string
          team_id: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "developers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      epics: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          team_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          team_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "epics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      impediments: {
        Row: {
          criticality: string
          has_ticket: boolean
          hu_id: string
          id: string
          reason: string
          reported_at: string
          resolution: string | null
          resolved_at: string | null
          team_id: string
          ticket_id: string | null
          ticket_url: string | null
          type: string
        }
        Insert: {
          criticality?: string
          has_ticket?: boolean
          hu_id: string
          id?: string
          reason: string
          reported_at?: string
          resolution?: string | null
          resolved_at?: string | null
          team_id: string
          ticket_id?: string | null
          ticket_url?: string | null
          type?: string
        }
        Update: {
          criticality?: string
          has_ticket?: boolean
          hu_id?: string
          id?: string
          reason?: string
          reported_at?: string
          resolution?: string | null
          resolved_at?: string | null
          team_id?: string
          ticket_id?: string | null
          ticket_url?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "impediments_hu_id_fkey"
            columns: ["hu_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impediments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_id: string | null
          link_type: string | null
          message: string
          team_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_id?: string | null
          link_type?: string | null
          message?: string
          team_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_id?: string | null
          link_type?: string | null
          message?: string
          team_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          email: string
          id: string
          module_access: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          module_access?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          module_access?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projetos: {
        Row: {
          created_at: string
          descricao: string | null
          equipe: string | null
          id: string
          nome: string
          sla: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          equipe?: string | null
          id?: string
          nome: string
          sla?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          equipe?: string | null
          id?: string
          nome?: string
          sla?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projetos_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          bugs_fixed: number | null
          created_at: string
          hus_included: number | null
          id: string
          notes: string | null
          released_at: string
          sprint_id: string | null
          status: string
          team_id: string
          version: string
        }
        Insert: {
          bugs_fixed?: number | null
          created_at?: string
          hus_included?: number | null
          id?: string
          notes?: string | null
          released_at?: string
          sprint_id?: string | null
          status?: string
          team_id: string
          version: string
        }
        Update: {
          bugs_fixed?: number | null
          created_at?: string
          hus_included?: number | null
          id?: string
          notes?: string | null
          released_at?: string
          sprint_id?: string | null
          status?: string
          team_id?: string
          version?: string
        }
        Relationships: []
      }
      sprints: {
        Row: {
          created_at: string
          end_date: string
          goal: string | null
          id: string
          is_active: boolean
          name: string
          start_date: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          goal?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          goal?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprints_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stories: {
        Row: {
          code: string
          created_at: string
          custom_fields: Json | null
          description: string | null
          end_date: string | null
          epic_id: string | null
          id: string
          priority: string
          sprint_id: string
          start_date: string | null
          status: string
          story_points: number
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          end_date?: string | null
          epic_id?: string | null
          id?: string
          priority?: string
          sprint_id: string
          start_date?: string | null
          status?: string
          story_points?: number
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          end_date?: string | null
          epic_id?: string | null
          id?: string
          priority?: string
          sprint_id?: string
          start_date?: string | null
          status?: string
          story_points?: number
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stories_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stories_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stories_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_columns: {
        Row: {
          color_class: string
          dot_color: string
          id: string
          key: string
          label: string
          sort_order: number
          team_id: string
        }
        Insert: {
          color_class: string
          dot_color: string
          id?: string
          key: string
          label: string
          sort_order?: number
          team_id: string
        }
        Update: {
          color_class?: string
          dot_color?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_columns_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "member"
        | "scrum_master"
        | "product_owner"
        | "developer"
        | "analyst"
        | "architect"
        | "qa_analyst"
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
      app_role: [
        "admin",
        "member",
        "scrum_master",
        "product_owner",
        "developer",
        "analyst",
        "architect",
        "qa_analyst",
      ],
    },
  },
} as const
