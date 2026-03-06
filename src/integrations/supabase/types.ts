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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agency_settings: {
        Row: {
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      flight_legs: {
        Row: {
          arrival_date: string | null
          arrival_time: string | null
          connection_duration: string | null
          created_at: string
          departure_date: string | null
          departure_time: string | null
          destination: string
          direction: string | null
          id: string
          origin: string
          service_id: string
          sort_order: number
        }
        Insert: {
          arrival_date?: string | null
          arrival_time?: string | null
          connection_duration?: string | null
          created_at?: string
          departure_date?: string | null
          departure_time?: string | null
          destination?: string
          direction?: string | null
          id?: string
          origin?: string
          service_id: string
          sort_order?: number
        }
        Update: {
          arrival_date?: string | null
          arrival_time?: string | null
          connection_duration?: string | null
          created_at?: string
          departure_date?: string | null
          departure_time?: string | null
          destination?: string
          direction?: string | null
          id?: string
          origin?: string
          service_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "flight_legs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          quote_id: string
          summary: string
          user_email: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          quote_id: string
          summary: string
          user_email: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          quote_id?: string
          summary?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_audit_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_email: string | null
          client_name: string
          client_notes: string | null
          client_passengers: number
          client_phone: string | null
          created_at: string
          destination_image_url: string | null
          id: string
          payment_installment_value_no_interest: number | null
          payment_installment_value_with_interest: number | null
          payment_installments_no_interest: number | null
          payment_installments_with_interest: number | null
          payment_pix_value: number | null
          short_id: string
          show_individual_values: boolean
          status: string
          trip_departure_date: string | null
          trip_destination: string | null
          trip_nights: number | null
          trip_origin: string | null
          trip_return_date: string | null
          trip_type: Database["public"]["Enums"]["trip_type"]
          updated_at: string
          view_count: number
        }
        Insert: {
          client_email?: string | null
          client_name?: string
          client_notes?: string | null
          client_passengers?: number
          client_phone?: string | null
          created_at?: string
          destination_image_url?: string | null
          id?: string
          payment_installment_value_no_interest?: number | null
          payment_installment_value_with_interest?: number | null
          payment_installments_no_interest?: number | null
          payment_installments_with_interest?: number | null
          payment_pix_value?: number | null
          short_id?: string
          show_individual_values?: boolean
          status?: string
          trip_departure_date?: string | null
          trip_destination?: string | null
          trip_nights?: number | null
          trip_origin?: string | null
          trip_return_date?: string | null
          trip_type?: Database["public"]["Enums"]["trip_type"]
          updated_at?: string
          view_count?: number
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_notes?: string | null
          client_passengers?: number
          client_phone?: string | null
          created_at?: string
          destination_image_url?: string | null
          id?: string
          payment_installment_value_no_interest?: number | null
          payment_installment_value_with_interest?: number | null
          payment_installments_no_interest?: number | null
          payment_installments_with_interest?: number | null
          payment_pix_value?: number | null
          short_id?: string
          show_individual_values?: boolean
          status?: string
          trip_departure_date?: string | null
          trip_destination?: string | null
          trip_nights?: number | null
          trip_origin?: string | null
          trip_return_date?: string | null
          trip_type?: Database["public"]["Enums"]["trip_type"]
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      service_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          service_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          service_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          service_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_images_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          baggage: Json | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          location: string | null
          quantity: number
          quote_id: string
          sort_order: number
          start_date: string | null
          supplier: string | null
          title: string
          type: Database["public"]["Enums"]["service_type"]
          value: number
        }
        Insert: {
          baggage?: Json | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          quantity?: number
          quote_id: string
          sort_order?: number
          start_date?: string | null
          supplier?: string | null
          title?: string
          type?: Database["public"]["Enums"]["service_type"]
          value?: number
        }
        Update: {
          baggage?: Json | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          quantity?: number
          quote_id?: string
          sort_order?: number
          start_date?: string | null
          supplier?: string | null
          title?: string
          type?: Database["public"]["Enums"]["service_type"]
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      service_type:
        | "aereo"
        | "hotel"
        | "carro"
        | "seguro"
        | "experiencia"
        | "adicional"
      trip_type:
        | "Lazer"
        | "Lua de mel"
        | "Família"
        | "Negócios"
        | "Experiência Premium"
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
      service_type: [
        "aereo",
        "hotel",
        "carro",
        "seguro",
        "experiencia",
        "adicional",
      ],
      trip_type: [
        "Lazer",
        "Lua de mel",
        "Família",
        "Negócios",
        "Experiência Premium",
      ],
    },
  },
} as const
