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
      accounts_payable: {
        Row: {
          amount: number | null
          cost_center_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          installment_number: number | null
          notes: string | null
          origin_type: string | null
          payment_date: string | null
          sale_id: string | null
          status: string
          supplier_id: string | null
          total_installments: number | null
        }
        Insert: {
          amount?: number | null
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          installment_number?: number | null
          notes?: string | null
          origin_type?: string | null
          payment_date?: string | null
          sale_id?: string | null
          status?: string
          supplier_id?: string | null
          total_installments?: number | null
        }
        Update: {
          amount?: number | null
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          installment_number?: number | null
          notes?: string | null
          origin_type?: string | null
          payment_date?: string | null
          sale_id?: string | null
          status?: string
          supplier_id?: string | null
          total_installments?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_settings: {
        Row: {
          card_rate_antecipado_ec: number | null
          card_rate_antecipado_link: number | null
          card_rate_simple_ec: number | null
          card_rate_simple_link: number | null
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
          card_rate_antecipado_ec?: number | null
          card_rate_antecipado_link?: number | null
          card_rate_simple_ec?: number | null
          card_rate_simple_link?: number | null
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
          card_rate_antecipado_ec?: number | null
          card_rate_antecipado_link?: number | null
          card_rate_simple_ec?: number | null
          card_rate_simple_link?: number | null
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
      calendar_events: {
        Row: {
          created_at: string
          event_date: string
          event_time: string | null
          id: string
          passengers: number
          title: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_time?: string | null
          id?: string
          passengers?: number
          title?: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_time?: string | null
          id?: string
          passengers?: number
          title?: string
        }
        Relationships: []
      }
      card_rates: {
        Row: {
          created_at: string
          id: string
          installments: number
          payment_type: string
          rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          installments?: number
          payment_type?: string
          rate?: number
        }
        Update: {
          created_at?: string
          id?: string
          installments?: number
          payment_type?: string
          rate?: number
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          address_number: string | null
          birth_date: string | null
          cep: string | null
          city: string | null
          complement: string | null
          country: string | null
          cpf: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          neighborhood: string | null
          passport_expiry_date: string | null
          passport_issue_date: string | null
          passport_number: string | null
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          country?: string | null
          cpf?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          neighborhood?: string | null
          passport_expiry_date?: string | null
          passport_issue_date?: string | null
          passport_number?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_number?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          country?: string | null
          cpf?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          neighborhood?: string | null
          passport_expiry_date?: string | null
          passport_issue_date?: string | null
          passport_number?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
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
      quote_internal_files: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          quote_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string
          file_url: string
          id?: string
          quote_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_internal_files_quote_id_fkey"
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
          payment_rav: number | null
          short_id: string
          show_individual_values: boolean
          show_per_passenger: boolean
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
          payment_rav?: number | null
          short_id?: string
          show_individual_values?: boolean
          show_per_passenger?: boolean
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
          payment_rav?: number | null
          short_id?: string
          show_individual_values?: boolean
          show_per_passenger?: boolean
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
      receivables: {
        Row: {
          amount: number | null
          client_name: string | null
          cost_center_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          installment_number: number
          notes: string | null
          origin_type: string | null
          payment_date: string | null
          payment_method: string | null
          sale_id: string
          status: string | null
        }
        Insert: {
          amount?: number | null
          client_name?: string | null
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          installment_number?: number
          notes?: string | null
          origin_type?: string | null
          payment_date?: string | null
          payment_method?: string | null
          sale_id: string
          status?: string | null
        }
        Update: {
          amount?: number | null
          client_name?: string | null
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          installment_number?: number
          notes?: string | null
          origin_type?: string | null
          payment_date?: string | null
          payment_method?: string | null
          sale_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receivables_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          check_in: string | null
          check_out: string | null
          confirmation_code: string | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          sale_id: string
          status: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          confirmation_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          sale_id: string
          status?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          confirmation_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          sale_id?: string
          status?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          cost_price: number | null
          created_at: string
          description: string
          id: string
          rav: number | null
          sale_id: string
          sort_order: number | null
          total_value: number | null
        }
        Insert: {
          cost_price?: number | null
          created_at?: string
          description?: string
          id?: string
          rav?: number | null
          sale_id: string
          sort_order?: number | null
          total_value?: number | null
        }
        Update: {
          cost_price?: number | null
          created_at?: string
          description?: string
          id?: string
          rav?: number | null
          sale_id?: string
          sort_order?: number | null
          total_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_suppliers: {
        Row: {
          created_at: string
          id: string
          sale_id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sale_id: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sale_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_suppliers_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          card_charge_type: string | null
          card_fee_rate: number | null
          card_fee_value: number | null
          card_payment_type: string | null
          client_name: string
          commission_rate: number | null
          commission_value: number | null
          created_at: string
          created_by: string | null
          gross_profit: number | null
          id: string
          installments: number | null
          net_profit: number | null
          notes: string | null
          payment_method: string | null
          quote_id: string | null
          sale_date: string
          status: string
          total_sale: number | null
          total_supplier_cost: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          card_charge_type?: string | null
          card_fee_rate?: number | null
          card_fee_value?: number | null
          card_payment_type?: string | null
          client_name?: string
          commission_rate?: number | null
          commission_value?: number | null
          created_at?: string
          created_by?: string | null
          gross_profit?: number | null
          id?: string
          installments?: number | null
          net_profit?: number | null
          notes?: string | null
          payment_method?: string | null
          quote_id?: string | null
          sale_date?: string
          status?: string
          total_sale?: number | null
          total_supplier_cost?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          card_charge_type?: string | null
          card_fee_rate?: number | null
          card_fee_value?: number | null
          card_payment_type?: string | null
          client_name?: string
          commission_rate?: number | null
          commission_value?: number | null
          created_at?: string
          created_by?: string | null
          gross_profit?: number | null
          id?: string
          installments?: number | null
          net_profit?: number | null
          notes?: string | null
          payment_method?: string | null
          quote_id?: string | null
          sale_date?: string
          status?: string
          total_sale?: number | null
          total_supplier_cost?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
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
      suppliers: {
        Row: {
          address: string | null
          address_number: string | null
          cep: string | null
          city: string | null
          cnpj: string | null
          complement: string | null
          country: string | null
          created_at: string
          email: string | null
          executive_name: string | null
          executive_phone: string | null
          id: string
          name: string
          neighborhood: string | null
          phone: string | null
          razao_social: string | null
          sales_rep_name: string | null
          sales_rep_phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          executive_name?: string | null
          executive_phone?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          phone?: string | null
          razao_social?: string | null
          sales_rep_name?: string | null
          sales_rep_phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_number?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          executive_name?: string | null
          executive_phone?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          phone?: string | null
          razao_social?: string | null
          sales_rep_name?: string | null
          sales_rep_phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          id: string
          permissions: Json
          updated_at: string
          user_id: string
          user_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissions?: Json
          updated_at?: string
          user_id: string
          user_role?: string
        }
        Update: {
          created_at?: string
          id?: string
          permissions?: Json
          updated_at?: string
          user_id?: string
          user_role?: string
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
