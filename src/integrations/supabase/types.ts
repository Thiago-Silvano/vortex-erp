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
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
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
            foreignKeyName: "accounts_payable_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_settings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          empresa_id: string | null
          event_date: string
          event_time: string | null
          event_type: string | null
          id: string
          passengers: number
          title: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          event_date: string
          event_time?: string | null
          event_type?: string | null
          id?: string
          passengers?: number
          title?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string | null
          id?: string
          passengers?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      card_rates: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          installments: number
          payment_type: string
          rate: number
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          installments?: number
          payment_type?: string
          rate?: number
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          installments?: number
          payment_type?: string
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "card_rates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "clients_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_closings: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          empresa_id: string | null
          id: string
          period_month: number
          period_year: number
          status: string
          total_commission: number | null
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          period_month: number
          period_year: number
          status?: string
          total_commission?: number | null
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          period_month?: number
          period_year?: number
          status?: string
          total_commission?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_closings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          created_at: string
          description: string | null
          empresa_id: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          empresa_id?: string | null
          id?: string
          name?: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          empresa_id?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_attachments: {
        Row: {
          created_at: string
          email_id: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string
        }
        Insert: {
          created_at?: string
          email_id: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string
        }
        Update: {
          created_at?: string
          email_id?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          created_at: string
          empresa_id: string | null
          from_email: string
          from_name: string
          id: string
          imap_host: string
          imap_password: string
          imap_port: number
          imap_ssl: boolean
          imap_user: string
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_ssl: boolean
          smtp_user: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          from_email?: string
          from_name?: string
          id?: string
          imap_host?: string
          imap_password?: string
          imap_port?: number
          imap_ssl?: boolean
          imap_user?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_ssl?: boolean
          smtp_user?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          from_email?: string
          from_name?: string
          id?: string
          imap_host?: string
          imap_password?: string
          imap_port?: number
          imap_ssl?: boolean
          imap_user?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_ssl?: boolean
          smtp_user?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_settings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          category: string
          created_at: string
          empresa_id: string | null
          id: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html?: string
          category?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          category?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          bcc_emails: string[] | null
          body_html: string
          body_text: string
          cc_emails: string[] | null
          client_id: string | null
          created_at: string
          empresa_id: string | null
          folder: string
          from_email: string
          from_name: string
          id: string
          is_read: boolean
          is_starred: boolean
          message_id: string | null
          reply_to_email_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string
          to_emails: string[]
          tracking_id: string | null
          tracking_opened_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bcc_emails?: string[] | null
          body_html?: string
          body_text?: string
          cc_emails?: string[] | null
          client_id?: string | null
          created_at?: string
          empresa_id?: string | null
          folder?: string
          from_email?: string
          from_name?: string
          id?: string
          is_read?: boolean
          is_starred?: boolean
          message_id?: string | null
          reply_to_email_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string
          to_emails?: string[]
          tracking_id?: string | null
          tracking_opened_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bcc_emails?: string[] | null
          body_html?: string
          body_text?: string
          cc_emails?: string[] | null
          client_id?: string | null
          created_at?: string
          empresa_id?: string | null
          folder?: string
          from_email?: string
          from_name?: string
          id?: string
          is_read?: boolean
          is_starred?: boolean
          message_id?: string | null
          reply_to_email_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string
          to_emails?: string[]
          tracking_id?: string | null
          tracking_opened_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emails_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_reply_to_email_id_fkey"
            columns: ["reply_to_email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
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
          empresa_id: string | null
          id: string
          payment_installment_value_no_interest: number | null
          payment_installment_value_with_interest: number | null
          payment_installments_no_interest: number | null
          payment_installments_with_interest: number | null
          payment_pix_value: number | null
          payment_rav: number | null
          seller_id: string | null
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
          empresa_id?: string | null
          id?: string
          payment_installment_value_no_interest?: number | null
          payment_installment_value_with_interest?: number | null
          payment_installments_no_interest?: number | null
          payment_installments_with_interest?: number | null
          payment_pix_value?: number | null
          payment_rav?: number | null
          seller_id?: string | null
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
          empresa_id?: string | null
          id?: string
          payment_installment_value_no_interest?: number | null
          payment_installment_value_with_interest?: number | null
          payment_installments_no_interest?: number | null
          payment_installments_with_interest?: number | null
          payment_pix_value?: number | null
          payment_rav?: number | null
          seller_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "quotes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number | null
          client_name: string | null
          cost_center_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
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
            foreignKeyName: "receivables_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
          id?: string
          notes?: string | null
          sale_id?: string
          status?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
      sale_internal_files: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          sale_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string
          file_url: string
          id?: string
          sale_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_internal_files_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_item_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          sale_item_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          sale_item_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          sale_item_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_item_images_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          cost_center_id: string | null
          cost_price: number | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          rav: number | null
          sale_id: string
          service_catalog_id: string | null
          sort_order: number | null
          total_value: number | null
        }
        Insert: {
          cost_center_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          rav?: number | null
          sale_id: string
          service_catalog_id?: string | null
          sort_order?: number | null
          total_value?: number | null
        }
        Update: {
          cost_center_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          rav?: number | null
          sale_id?: string
          service_catalog_id?: string | null
          sort_order?: number | null
          total_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_service_catalog_id_fkey"
            columns: ["service_catalog_id"]
            isOneToOne: false
            referencedRelation: "services_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_passengers: {
        Row: {
          birth_date: string | null
          created_at: string
          document_expiry: string | null
          document_number: string
          document_type: string
          email: string | null
          first_name: string
          id: string
          is_main: boolean
          last_name: string
          phone: string | null
          sale_id: string
          sort_order: number
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          document_expiry?: string | null
          document_number?: string
          document_type?: string
          email?: string | null
          first_name?: string
          id?: string
          is_main?: boolean
          last_name?: string
          phone?: string | null
          sale_id: string
          sort_order?: number
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          document_expiry?: string | null
          document_number?: string
          document_type?: string
          email?: string | null
          first_name?: string
          id?: string
          is_main?: boolean
          last_name?: string
          phone?: string | null
          sale_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_passengers_sale_id_fkey"
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
          destination_image_url: string | null
          empresa_id: string | null
          gross_profit: number | null
          id: string
          installments: number | null
          invoice_url: string | null
          net_profit: number | null
          notes: string | null
          passengers_count: number | null
          payment_method: string | null
          proposal_payment_options: Json | null
          quote_id: string | null
          sale_date: string
          sale_interest: number | null
          seller_id: string | null
          short_id: string
          status: string
          total_sale: number | null
          total_supplier_cost: number | null
          trip_end_date: string | null
          trip_nights: number | null
          trip_start_date: string | null
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
          destination_image_url?: string | null
          empresa_id?: string | null
          gross_profit?: number | null
          id?: string
          installments?: number | null
          invoice_url?: string | null
          net_profit?: number | null
          notes?: string | null
          passengers_count?: number | null
          payment_method?: string | null
          proposal_payment_options?: Json | null
          quote_id?: string | null
          sale_date?: string
          sale_interest?: number | null
          seller_id?: string | null
          short_id?: string
          status?: string
          total_sale?: number | null
          total_supplier_cost?: number | null
          trip_end_date?: string | null
          trip_nights?: number | null
          trip_start_date?: string | null
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
          destination_image_url?: string | null
          empresa_id?: string | null
          gross_profit?: number | null
          id?: string
          installments?: number | null
          invoice_url?: string | null
          net_profit?: number | null
          notes?: string | null
          passengers_count?: number | null
          payment_method?: string | null
          proposal_payment_options?: Json | null
          quote_id?: string | null
          sale_date?: string
          sale_interest?: number | null
          seller_id?: string | null
          short_id?: string
          status?: string
          total_sale?: number | null
          total_supplier_cost?: number | null
          trip_end_date?: string | null
          trip_nights?: number | null
          trip_start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_commissions: {
        Row: {
          client_name: string | null
          closing_id: string | null
          commission_percentage: number | null
          commission_type: string | null
          commission_value: number | null
          cost_value: number | null
          created_at: string
          empresa_id: string | null
          id: string
          notes: string | null
          payment_date: string | null
          profit_value: number | null
          received_value: number | null
          sale_date: string | null
          sale_id: string | null
          sale_value: number | null
          seller_id: string
          status: string
          updated_at: string
          visa_sale_id: string | null
        }
        Insert: {
          client_name?: string | null
          closing_id?: string | null
          commission_percentage?: number | null
          commission_type?: string | null
          commission_value?: number | null
          cost_value?: number | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          profit_value?: number | null
          received_value?: number | null
          sale_date?: string | null
          sale_id?: string | null
          sale_value?: number | null
          seller_id: string
          status?: string
          updated_at?: string
          visa_sale_id?: string | null
        }
        Update: {
          client_name?: string | null
          closing_id?: string | null
          commission_percentage?: number | null
          commission_type?: string | null
          commission_value?: number | null
          cost_value?: number | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          profit_value?: number | null
          received_value?: number | null
          sale_date?: string | null
          sale_id?: string | null
          sale_value?: number | null
          seller_id?: string
          status?: string
          updated_at?: string
          visa_sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_commissions_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "commission_closings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_commissions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_commissions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_commissions_visa_sale_id_fkey"
            columns: ["visa_sale_id"]
            isOneToOne: false
            referencedRelation: "visa_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          account_type: string | null
          address: string | null
          address_number: string | null
          admission_date: string | null
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          beneficiary_document: string | null
          beneficiary_name: string | null
          birth_date: string | null
          cep: string | null
          city: string | null
          commission_base: string | null
          commission_include_card_fee: boolean | null
          commission_include_discounts: boolean | null
          commission_include_operational: boolean | null
          commission_include_taxes: boolean | null
          commission_mixed_config: Json | null
          commission_percentage: number | null
          commission_revenue_scope: string | null
          commission_trigger: string | null
          commission_type: string
          complement: string | null
          cpf: string | null
          created_at: string
          email: string | null
          empresa_id: string | null
          full_name: string
          id: string
          marital_status: string | null
          monthly_salary: number | null
          neighborhood: string | null
          notes: string | null
          phone: string | null
          pix_key: string | null
          rg: string | null
          role_title: string | null
          state: string | null
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          account_type?: string | null
          address?: string | null
          address_number?: string | null
          admission_date?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          beneficiary_document?: string | null
          beneficiary_name?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          commission_base?: string | null
          commission_include_card_fee?: boolean | null
          commission_include_discounts?: boolean | null
          commission_include_operational?: boolean | null
          commission_include_taxes?: boolean | null
          commission_mixed_config?: Json | null
          commission_percentage?: number | null
          commission_revenue_scope?: string | null
          commission_trigger?: string | null
          commission_type?: string
          complement?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          full_name?: string
          id?: string
          marital_status?: string | null
          monthly_salary?: number | null
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          rg?: string | null
          role_title?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          account_type?: string | null
          address?: string | null
          address_number?: string | null
          admission_date?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          beneficiary_document?: string | null
          beneficiary_name?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          commission_base?: string | null
          commission_include_card_fee?: boolean | null
          commission_include_discounts?: boolean | null
          commission_include_operational?: boolean | null
          commission_include_taxes?: boolean | null
          commission_mixed_config?: Json | null
          commission_percentage?: number | null
          commission_revenue_scope?: string | null
          commission_trigger?: string | null
          commission_type?: string
          complement?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          full_name?: string
          id?: string
          marital_status?: string | null
          monthly_salary?: number | null
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          rg?: string | null
          role_title?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sellers_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      services_catalog: {
        Row: {
          category: string | null
          cost_center_id: string | null
          created_at: string
          description: string | null
          empresa_id: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          category?: string | null
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          empresa_id?: string | null
          id?: string
          name?: string
          status?: string
        }
        Update: {
          category?: string | null
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          empresa_id?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_catalog_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_catalog_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "suppliers_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          empresa_ids: string[] | null
          id: string
          permissions: Json
          updated_at: string
          user_id: string
          user_role: string
        }
        Insert: {
          created_at?: string
          empresa_ids?: string[] | null
          id?: string
          permissions?: Json
          updated_at?: string
          user_id: string
          user_role?: string
        }
        Update: {
          created_at?: string
          empresa_ids?: string[] | null
          id?: string
          permissions?: Json
          updated_at?: string
          user_id?: string
          user_role?: string
        }
        Relationships: []
      }
      visa_applicants: {
        Row: {
          birth_date: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_main: boolean
          passport_number: string | null
          phone: string | null
          sort_order: number
          visa_sale_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_main?: boolean
          passport_number?: string | null
          phone?: string | null
          sort_order?: number
          visa_sale_id: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_main?: boolean
          passport_number?: string | null
          phone?: string | null
          sort_order?: number
          visa_sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_applicants_visa_sale_id_fkey"
            columns: ["visa_sale_id"]
            isOneToOne: false
            referencedRelation: "visa_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_processes: {
        Row: {
          applicant_id: string
          applicant_name: string
          client_name: string
          consulate: string | null
          created_at: string
          describe_duties: string | null
          documents: Json | null
          empresa_id: string | null
          id: string
          interview_date: string | null
          interview_notes: string | null
          interview_time: string | null
          photo_url: string | null
          product_id: string | null
          status: Database["public"]["Enums"]["visa_process_status"]
          updated_at: string
          visa_sale_id: string
        }
        Insert: {
          applicant_id: string
          applicant_name?: string
          client_name?: string
          consulate?: string | null
          created_at?: string
          describe_duties?: string | null
          documents?: Json | null
          empresa_id?: string | null
          id?: string
          interview_date?: string | null
          interview_notes?: string | null
          interview_time?: string | null
          photo_url?: string | null
          product_id?: string | null
          status?: Database["public"]["Enums"]["visa_process_status"]
          updated_at?: string
          visa_sale_id: string
        }
        Update: {
          applicant_id?: string
          applicant_name?: string
          client_name?: string
          consulate?: string | null
          created_at?: string
          describe_duties?: string | null
          documents?: Json | null
          empresa_id?: string | null
          id?: string
          interview_date?: string | null
          interview_notes?: string | null
          interview_time?: string | null
          photo_url?: string | null
          product_id?: string | null
          status?: Database["public"]["Enums"]["visa_process_status"]
          updated_at?: string
          visa_sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_processes_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "visa_applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visa_processes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visa_processes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "visa_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visa_processes_visa_sale_id_fkey"
            columns: ["visa_sale_id"]
            isOneToOne: false
            referencedRelation: "visa_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_products: {
        Row: {
          average_days: number | null
          created_at: string
          description: string | null
          empresa_id: string | null
          id: string
          name: string
          price: number
          status: string
          updated_at: string
        }
        Insert: {
          average_days?: number | null
          created_at?: string
          description?: string | null
          empresa_id?: string | null
          id?: string
          name?: string
          price?: number
          status?: string
          updated_at?: string
        }
        Update: {
          average_days?: number | null
          created_at?: string
          description?: string | null
          empresa_id?: string | null
          id?: string
          name?: string
          price?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_products_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_sales: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: string
          installments: number | null
          notes: string | null
          payment_method: string | null
          product_id: string | null
          sale_date: string
          status: string
          total_value: number | null
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          installments?: number | null
          notes?: string | null
          payment_method?: string | null
          product_id?: string | null
          sale_date?: string
          status?: string
          total_value?: number | null
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          installments?: number | null
          notes?: string | null
          payment_method?: string | null
          product_id?: string | null
          sale_date?: string
          status?: string
          total_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_sales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visa_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "visa_products"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_automations: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          is_active: boolean
          response_message: string
          trigger_keyword: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          is_active?: boolean
          response_message?: string
          trigger_keyword?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          is_active?: boolean
          response_message?: string
          trigger_keyword?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automations_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_user_id: string | null
          assigned_user_name: string | null
          client_id: string | null
          client_name: string
          created_at: string
          empresa_id: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          phone: string
          priority: string
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          assigned_user_name?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          phone: string
          priority?: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          assigned_user_name?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          phone?: string
          priority?: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          created_at: string
          details: Json | null
          empresa_id: string | null
          event_type: string
          id: string
          message: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          empresa_id?: string | null
          event_type?: string
          id?: string
          message?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          empresa_id?: string | null
          event_type?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          delivery_status: string | null
          id: string
          media_filename: string | null
          media_mimetype: string | null
          media_url: string | null
          message_type: string
          read_at: string | null
          reply_to_message_id: string | null
          sender_name: string | null
          sender_type: string
          sender_user_id: string | null
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          delivery_status?: string | null
          id?: string
          media_filename?: string | null
          media_mimetype?: string | null
          media_url?: string | null
          message_type?: string
          read_at?: string | null
          reply_to_message_id?: string | null
          sender_name?: string | null
          sender_type?: string
          sender_user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          delivery_status?: string | null
          id?: string
          media_filename?: string | null
          media_mimetype?: string | null
          media_url?: string | null
          message_type?: string
          read_at?: string | null
          reply_to_message_id?: string | null
          sender_name?: string | null
          sender_type?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_quick_replies: {
        Row: {
          content: string
          created_at: string
          empresa_id: string | null
          id: string
          shortcut: string
          title: string
        }
        Insert: {
          content?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          shortcut?: string
          title?: string
        }
        Update: {
          content?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          shortcut?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_quick_replies_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          connected_at: string | null
          created_at: string
          empresa_id: string | null
          id: string
          last_message_received_at: string | null
          last_message_sent_at: string | null
          phone_number: string | null
          qr_code: string | null
          server_url: string | null
          session_data: Json | null
          status: string
          updated_at: string
          webhook_status: string | null
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          last_message_received_at?: string | null
          last_message_sent_at?: string | null
          phone_number?: string | null
          qr_code?: string | null
          server_url?: string | null
          session_data?: Json | null
          status?: string
          updated_at?: string
          webhook_status?: string | null
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          last_message_received_at?: string | null
          last_message_sent_at?: string | null
          phone_number?: string | null
          qr_code?: string | null
          server_url?: string | null
          session_data?: Json | null
          status?: string
          updated_at?: string
          webhook_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "companies"
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
      visa_process_status:
        | "falta_passaporte"
        | "produzindo"
        | "agendado"
        | "aguardando_renovacao"
        | "aprovado"
        | "negado"
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
      visa_process_status: [
        "falta_passaporte",
        "produzindo",
        "agendado",
        "aguardando_renovacao",
        "aprovado",
        "negado",
      ],
    },
  },
} as const
