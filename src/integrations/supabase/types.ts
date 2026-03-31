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
          google_maps_api_key: string | null
          id: string
          logo_url: string | null
          name: string
          pexels_api_key: string | null
          unsplash_api_key: string | null
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
          google_maps_api_key?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          pexels_api_key?: string | null
          unsplash_api_key?: string | null
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
          google_maps_api_key?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          pexels_api_key?: string | null
          unsplash_api_key?: string | null
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
      airlines: {
        Row: {
          created_at: string | null
          empresa_id: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "airlines_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_digit: string | null
          account_number: string | null
          account_type: string
          agency: string | null
          bank_code: string | null
          bank_name: string
          color: string | null
          created_at: string
          empresa_id: string
          holder_document: string | null
          holder_name: string | null
          id: string
          initial_balance: number
          initial_balance_date: string | null
          is_default: boolean
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_digit?: string | null
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank_code?: string | null
          bank_name?: string
          color?: string | null
          created_at?: string
          empresa_id: string
          holder_document?: string | null
          holder_name?: string | null
          id?: string
          initial_balance?: number
          initial_balance_date?: string | null
          is_default?: boolean
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_digit?: string | null
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank_code?: string | null
          bank_name?: string
          color?: string | null
          created_at?: string
          empresa_id?: string
          holder_document?: string | null
          holder_name?: string | null
          id?: string
          initial_balance?: number
          initial_balance_date?: string | null
          is_default?: boolean
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          bank_account_id: string
          category: string | null
          client_name: string | null
          cost_center_id: string | null
          created_at: string
          description: string
          empresa_id: string
          id: string
          import_batch: string | null
          origin: string
          payment_method: string | null
          posting_date: string | null
          reconciled_with_id: string | null
          reconciled_with_type: string | null
          reconciliation_note: string | null
          reconciliation_status: string
          reference_number: string | null
          supplier_id: string | null
          transaction_date: string
          transaction_type: string
          unique_hash: string
          updated_at: string
        }
        Insert: {
          amount?: number
          balance_after?: number | null
          bank_account_id: string
          category?: string | null
          client_name?: string | null
          cost_center_id?: string | null
          created_at?: string
          description?: string
          empresa_id: string
          id?: string
          import_batch?: string | null
          origin?: string
          payment_method?: string | null
          posting_date?: string | null
          reconciled_with_id?: string | null
          reconciled_with_type?: string | null
          reconciliation_note?: string | null
          reconciliation_status?: string
          reference_number?: string | null
          supplier_id?: string | null
          transaction_date: string
          transaction_type?: string
          unique_hash?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          bank_account_id?: string
          category?: string | null
          client_name?: string | null
          cost_center_id?: string | null
          created_at?: string
          description?: string
          empresa_id?: string
          id?: string
          import_batch?: string | null
          origin?: string
          payment_method?: string | null
          posting_date?: string | null
          reconciled_with_id?: string | null
          reconciled_with_type?: string | null
          reconciliation_note?: string | null
          reconciliation_status?: string
          reference_number?: string | null
          supplier_id?: string | null
          transaction_date?: string
          transaction_type?: string
          unique_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
      client_files: {
        Row: {
          client_id: string
          created_at: string
          empresa_id: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          empresa_id?: string | null
          file_name?: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          empresa_id?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_files_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_photos: {
        Row: {
          client_id: string
          created_at: string
          empresa_id: string | null
          file_name: string
          file_url: string
          id: string
          uploaded_by: string
        }
        Insert: {
          client_id: string
          created_at?: string
          empresa_id?: string | null
          file_name?: string
          file_url: string
          id?: string
          uploaded_by?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          empresa_id?: string | null
          file_name?: string
          file_url?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_photos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_proposal_choices: {
        Row: {
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          id: string
          notes: string | null
          sale_id: string
          selected_item_ids: Json
          submitted_at: string
          total_value: number
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          sale_id: string
          selected_item_ids?: Json
          submitted_at?: string
          total_value?: number
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          sale_id?: string
          selected_item_ids?: Json
          submitted_at?: string
          total_value?: number
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
      contract_audit_log: {
        Row: {
          action: string
          actor: string | null
          actor_type: string | null
          contract_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
        }
        Insert: {
          action?: string
          actor?: string | null
          actor_type?: string | null
          contract_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          actor_type?: string | null
          contract_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_audit_log_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_bundles: {
        Row: {
          client_cpf: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: string
          sale_id: string | null
          sent_at: string | null
          short_id: string
          signed_at: string | null
          status: string
          token: string
          viewed_at: string | null
        }
        Insert: {
          client_cpf?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          sale_id?: string | null
          sent_at?: string | null
          short_id?: string
          signed_at?: string | null
          status?: string
          token?: string
          viewed_at?: string | null
        }
        Update: {
          client_cpf?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          sale_id?: string | null
          sent_at?: string | null
          short_id?: string
          signed_at?: string | null
          status?: string
          token?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_bundles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_email_settings: {
        Row: {
          created_at: string
          empresa_id: string
          from_email: string
          from_name: string
          id: string
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_ssl: boolean
          smtp_user: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          from_email?: string
          from_name?: string
          id?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_ssl?: boolean
          smtp_user?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          from_email?: string
          from_name?: string
          id?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_ssl?: boolean
          smtp_user?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_email_settings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          contract_id: string
          created_at: string
          device_info: string | null
          document_hash: string | null
          geo_city: string | null
          geo_country: string | null
          geo_state: string | null
          geolocation: Json | null
          id: string
          ip_address: string | null
          selfie_url: string | null
          signature_data: string | null
          signature_type: string
          signed_at: string | null
          signer_cpf: string | null
          signer_email: string | null
          signer_name: string
          signer_phone: string | null
          status: string
          user_agent: string | null
          verification_code: string | null
          verification_confirmed_at: string | null
          verification_method: string | null
          verification_sent_at: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          device_info?: string | null
          document_hash?: string | null
          geo_city?: string | null
          geo_country?: string | null
          geo_state?: string | null
          geolocation?: Json | null
          id?: string
          ip_address?: string | null
          selfie_url?: string | null
          signature_data?: string | null
          signature_type?: string
          signed_at?: string | null
          signer_cpf?: string | null
          signer_email?: string | null
          signer_name?: string
          signer_phone?: string | null
          status?: string
          user_agent?: string | null
          verification_code?: string | null
          verification_confirmed_at?: string | null
          verification_method?: string | null
          verification_sent_at?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          device_info?: string | null
          document_hash?: string | null
          geo_city?: string | null
          geo_country?: string | null
          geo_state?: string | null
          geolocation?: Json | null
          id?: string
          ip_address?: string | null
          selfie_url?: string | null
          signature_data?: string | null
          signature_type?: string
          signed_at?: string | null
          signer_cpf?: string | null
          signer_email?: string | null
          signer_name?: string
          signer_phone?: string | null
          status?: string
          user_agent?: string | null
          verification_code?: string | null
          verification_confirmed_at?: string | null
          verification_method?: string | null
          verification_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          body_html: string
          category: string
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body_html?: string
          category?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body_html?: string
          category?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          body_html: string
          bundle_id: string | null
          client_cpf: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          created_by: string | null
          empresa_id: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          pdf_url: string | null
          sale_id: string | null
          sent_at: string | null
          sent_via: string | null
          short_id: string
          signed_at: string | null
          status: string
          template_id: string | null
          title: string
          token: string
          updated_at: string
          version: number
          viewed_at: string | null
        }
        Insert: {
          body_html?: string
          bundle_id?: string | null
          client_cpf?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          pdf_url?: string | null
          sale_id?: string | null
          sent_at?: string | null
          sent_via?: string | null
          short_id?: string
          signed_at?: string | null
          status?: string
          template_id?: string | null
          title?: string
          token?: string
          updated_at?: string
          version?: number
          viewed_at?: string | null
        }
        Update: {
          body_html?: string
          bundle_id?: string | null
          client_cpf?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          pdf_url?: string | null
          sale_id?: string | null
          sent_at?: string | null
          sent_via?: string | null
          short_id?: string
          signed_at?: string | null
          status?: string
          template_id?: string | null
          title?: string
          token?: string
          updated_at?: string
          version?: number
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "contract_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
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
      destination_images: {
        Row: {
          altura: number | null
          autor: string | null
          created_at: string | null
          data_importacao: string | null
          empresa_id: string | null
          fonte: string | null
          id: string
          largura: number | null
          titulo: string
          url_local: string
          url_original: string | null
        }
        Insert: {
          altura?: number | null
          autor?: string | null
          created_at?: string | null
          data_importacao?: string | null
          empresa_id?: string | null
          fonte?: string | null
          id?: string
          largura?: number | null
          titulo?: string
          url_local?: string
          url_original?: string | null
        }
        Update: {
          altura?: number | null
          autor?: string | null
          created_at?: string | null
          data_importacao?: string | null
          empresa_id?: string | null
          fonte?: string | null
          id?: string
          largura?: number | null
          titulo?: string
          url_local?: string
          url_original?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destination_images_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ds160_forms: {
        Row: {
          client_id: string
          created_at: string
          current_step: number
          empresa_id: string | null
          expires_at: string | null
          form_data: Json
          group_id: string | null
          id: string
          ip_address: string | null
          last_saved_at: string | null
          pdf_url: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          submitted_at: string | null
          token: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          current_step?: number
          empresa_id?: string | null
          expires_at?: string | null
          form_data?: Json
          group_id?: string | null
          id?: string
          ip_address?: string | null
          last_saved_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          submitted_at?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          current_step?: number
          empresa_id?: string | null
          expires_at?: string | null
          form_data?: Json
          group_id?: string | null
          id?: string
          ip_address?: string | null
          last_saved_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          submitted_at?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ds160_forms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ds160_forms_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ds160_forms_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "ds160_group_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      ds160_group_forms: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          sent_at: string | null
          sent_by: string | null
          sent_to_email: string | null
          sent_to_name: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          sent_at?: string | null
          sent_by?: string | null
          sent_to_email?: string | null
          sent_to_name?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          sent_at?: string | null
          sent_by?: string | null
          sent_to_email?: string | null
          sent_to_name?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ds160_group_forms_empresa_id_fkey"
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
      fiscal_certificates: {
        Row: {
          arquivo_encrypted: string | null
          arquivo_hash: string | null
          cnpj_certificado: string | null
          created_at: string | null
          emissor: string | null
          empresa_id: string
          id: string
          senha_encrypted: string | null
          status: string | null
          titular: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          validade_fim: string | null
          validade_inicio: string | null
          validated_at: string | null
        }
        Insert: {
          arquivo_encrypted?: string | null
          arquivo_hash?: string | null
          cnpj_certificado?: string | null
          created_at?: string | null
          emissor?: string | null
          empresa_id: string
          id?: string
          senha_encrypted?: string | null
          status?: string | null
          titular?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          validade_fim?: string | null
          validade_inicio?: string | null
          validated_at?: string | null
        }
        Update: {
          arquivo_encrypted?: string | null
          arquivo_hash?: string | null
          cnpj_certificado?: string | null
          created_at?: string | null
          emissor?: string | null
          empresa_id?: string
          id?: string
          senha_encrypted?: string | null
          status?: string | null
          titular?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          validade_fim?: string | null
          validade_inicio?: string | null
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_certificates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_companies: {
        Row: {
          aliquota_padrao: number | null
          ambiente: string | null
          bairro: string | null
          cep: string | null
          cnae: string | null
          cnpj: string
          codigo_servico: string | null
          codigo_tributacao: string | null
          complemento: string | null
          created_at: string | null
          email_fiscal: string | null
          empresa_id: string
          exigibilidade_iss: string | null
          id: string
          incidencia_tributaria: string | null
          inscricao_municipal: string | null
          item_lista_servico: string | null
          logradouro: string | null
          municipio: string | null
          natureza_operacao: string | null
          nome_fantasia: string
          numero: string | null
          observacoes_padrao: string | null
          optante_simples: boolean | null
          razao_social: string
          regime_tributario: string | null
          retencao_iss_padrao: boolean | null
          serie_nfse: string | null
          telefone: string | null
          uf: string | null
          updated_at: string | null
        }
        Insert: {
          aliquota_padrao?: number | null
          ambiente?: string | null
          bairro?: string | null
          cep?: string | null
          cnae?: string | null
          cnpj?: string
          codigo_servico?: string | null
          codigo_tributacao?: string | null
          complemento?: string | null
          created_at?: string | null
          email_fiscal?: string | null
          empresa_id: string
          exigibilidade_iss?: string | null
          id?: string
          incidencia_tributaria?: string | null
          inscricao_municipal?: string | null
          item_lista_servico?: string | null
          logradouro?: string | null
          municipio?: string | null
          natureza_operacao?: string | null
          nome_fantasia?: string
          numero?: string | null
          observacoes_padrao?: string | null
          optante_simples?: boolean | null
          razao_social?: string
          regime_tributario?: string | null
          retencao_iss_padrao?: boolean | null
          serie_nfse?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string | null
        }
        Update: {
          aliquota_padrao?: number | null
          ambiente?: string | null
          bairro?: string | null
          cep?: string | null
          cnae?: string | null
          cnpj?: string
          codigo_servico?: string | null
          codigo_tributacao?: string | null
          complemento?: string | null
          created_at?: string | null
          email_fiscal?: string | null
          empresa_id?: string
          exigibilidade_iss?: string | null
          id?: string
          incidencia_tributaria?: string | null
          inscricao_municipal?: string | null
          item_lista_servico?: string | null
          logradouro?: string | null
          municipio?: string | null
          natureza_operacao?: string | null
          nome_fantasia?: string
          numero?: string | null
          observacoes_padrao?: string | null
          optante_simples?: boolean | null
          razao_social?: string
          regime_tributario?: string | null
          retencao_iss_padrao?: boolean | null
          serie_nfse?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_companies_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_service_mappings: {
        Row: {
          aliquota: number | null
          categoria: string | null
          codigo_servico: string | null
          created_at: string | null
          descricao_fiscal: string | null
          empresa_id: string
          id: string
          is_active: boolean | null
          item_lista_lc116: string | null
          municipio_incidencia: string | null
          nome_interno: string
          observacoes: string | null
          retencao_iss: boolean | null
          service_catalog_id: string | null
          tributacao: string | null
          updated_at: string | null
        }
        Insert: {
          aliquota?: number | null
          categoria?: string | null
          codigo_servico?: string | null
          created_at?: string | null
          descricao_fiscal?: string | null
          empresa_id: string
          id?: string
          is_active?: boolean | null
          item_lista_lc116?: string | null
          municipio_incidencia?: string | null
          nome_interno?: string
          observacoes?: string | null
          retencao_iss?: boolean | null
          service_catalog_id?: string | null
          tributacao?: string | null
          updated_at?: string | null
        }
        Update: {
          aliquota?: number | null
          categoria?: string | null
          codigo_servico?: string | null
          created_at?: string | null
          descricao_fiscal?: string | null
          empresa_id?: string
          id?: string
          is_active?: boolean | null
          item_lista_lc116?: string | null
          municipio_incidencia?: string | null
          nome_interno?: string
          observacoes?: string | null
          retencao_iss?: boolean | null
          service_catalog_id?: string | null
          tributacao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_service_mappings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      hotels_cache: {
        Row: {
          cidade: string | null
          created_at: string | null
          data_atualizacao: string | null
          empresa_id: string | null
          endereco: string | null
          fotos: Json | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          pais: string | null
          place_id: string
          rating: number | null
          reviews_total: number | null
          telefone: string | null
          website: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string | null
          data_atualizacao?: string | null
          empresa_id?: string | null
          endereco?: string | null
          fotos?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          pais?: string | null
          place_id: string
          rating?: number | null
          reviews_total?: number | null
          telefone?: string | null
          website?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string | null
          data_atualizacao?: string | null
          empresa_id?: string | null
          endereco?: string | null
          fotos?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          pais?: string | null
          place_id?: string
          rating?: number | null
          reviews_total?: number | null
          telefone?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_cache_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      itineraries: {
        Row: {
          client_name: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: string
          short_id: string
          status: string
          subtitle: string | null
          thank_you_font_color: string | null
          thank_you_font_effect: string | null
          thank_you_font_size: number | null
          thank_you_font_style: string | null
          thank_you_image_position: Json | null
          thank_you_image_size: number | null
          thank_you_image_url: string | null
          thank_you_text: string | null
          thank_you_text_align: string | null
          thank_you_title: string | null
          thank_you_title_font_color: string | null
          thank_you_title_font_effect: string | null
          thank_you_title_font_size: number | null
          thank_you_title_font_style: string | null
          title: string
          token: string
          travel_date: string | null
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          short_id?: string
          status?: string
          subtitle?: string | null
          thank_you_font_color?: string | null
          thank_you_font_effect?: string | null
          thank_you_font_size?: number | null
          thank_you_font_style?: string | null
          thank_you_image_position?: Json | null
          thank_you_image_size?: number | null
          thank_you_image_url?: string | null
          thank_you_text?: string | null
          thank_you_text_align?: string | null
          thank_you_title?: string | null
          thank_you_title_font_color?: string | null
          thank_you_title_font_effect?: string | null
          thank_you_title_font_size?: number | null
          thank_you_title_font_style?: string | null
          title?: string
          token?: string
          travel_date?: string | null
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          short_id?: string
          status?: string
          subtitle?: string | null
          thank_you_font_color?: string | null
          thank_you_font_effect?: string | null
          thank_you_font_size?: number | null
          thank_you_font_style?: string | null
          thank_you_image_position?: Json | null
          thank_you_image_size?: number | null
          thank_you_image_url?: string | null
          thank_you_text?: string | null
          thank_you_text_align?: string | null
          thank_you_title?: string | null
          thank_you_title_font_color?: string | null
          thank_you_title_font_effect?: string | null
          thank_you_title_font_size?: number | null
          thank_you_title_font_style?: string | null
          title?: string
          token?: string
          travel_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itineraries_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_attractions: {
        Row: {
          address: string | null
          category: string
          city: string | null
          created_at: string
          day_id: string
          description: string | null
          duration: string | null
          id: string
          image_position: Json | null
          image_url: string | null
          location: string | null
          name: string
          observation: string | null
          sort_order: number
          time: string | null
        }
        Insert: {
          address?: string | null
          category?: string
          city?: string | null
          created_at?: string
          day_id: string
          description?: string | null
          duration?: string | null
          id?: string
          image_position?: Json | null
          image_url?: string | null
          location?: string | null
          name?: string
          observation?: string | null
          sort_order?: number
          time?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          city?: string | null
          created_at?: string
          day_id?: string
          description?: string | null
          duration?: string | null
          id?: string
          image_position?: Json | null
          image_url?: string | null
          location?: string | null
          name?: string
          observation?: string | null
          sort_order?: number
          time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_attractions_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "itinerary_days"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_checklist: {
        Row: {
          category: string
          created_at: string
          id: string
          item: string
          itinerary_id: string
          sort_order: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          item?: string
          itinerary_id: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          item?: string
          itinerary_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_checklist_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_days: {
        Row: {
          created_at: string
          day_number: number
          description: string | null
          destination_id: string | null
          id: string
          itinerary_id: string
          notes: string | null
          sort_order: number
          subtitle: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          day_number?: number
          description?: string | null
          destination_id?: string | null
          id?: string
          itinerary_id: string
          notes?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          day_number?: number
          description?: string | null
          destination_id?: string | null
          id?: string
          itinerary_id?: string
          notes?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_days_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "itinerary_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_days_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_destinations: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          itinerary_id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          itinerary_id: string
          name?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          itinerary_id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_destinations_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columns: {
        Row: {
          color: string
          created_at: string
          empresa_id: string | null
          id: string
          is_default: boolean
          name: string
          sort_order: number
          status_key: string
        }
        Insert: {
          color?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          status_key?: string
        }
        Update: {
          color?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          status_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columns_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      nfse_api_logs: {
        Row: {
          ambiente: string | null
          created_at: string | null
          empresa_id: string | null
          endpoint: string | null
          error_message: string | null
          id: string
          method: string | null
          nfse_id: string | null
          request_payload: string | null
          response_payload: string | null
          response_status: number | null
          response_time_ms: number | null
          xml_hash: string | null
        }
        Insert: {
          ambiente?: string | null
          created_at?: string | null
          empresa_id?: string | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          method?: string | null
          nfse_id?: string | null
          request_payload?: string | null
          response_payload?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          xml_hash?: string | null
        }
        Update: {
          ambiente?: string | null
          created_at?: string | null
          empresa_id?: string | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          method?: string | null
          nfse_id?: string | null
          request_payload?: string | null
          response_payload?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          xml_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfse_api_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfse_api_logs_nfse_id_fkey"
            columns: ["nfse_id"]
            isOneToOne: false
            referencedRelation: "nfse_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      nfse_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          details: Json | null
          empresa_id: string | null
          id: string
          ip_address: string | null
          nfse_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action?: string
          created_at?: string | null
          description?: string | null
          details?: Json | null
          empresa_id?: string | null
          id?: string
          ip_address?: string | null
          nfse_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          details?: Json | null
          empresa_id?: string | null
          id?: string
          ip_address?: string | null
          nfse_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfse_audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfse_audit_logs_nfse_id_fkey"
            columns: ["nfse_id"]
            isOneToOne: false
            referencedRelation: "nfse_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      nfse_documents: {
        Row: {
          aliquota: number | null
          ambiente: string | null
          base_calculo: number | null
          cancelado_em: string | null
          cancelado_por: string | null
          chave_nfse: string | null
          client_id: string | null
          codigo_servico: string | null
          created_at: string | null
          data_competencia: string | null
          data_emissao: string | null
          descricao_servico: string | null
          emitido_por: string | null
          empresa_id: string
          exigibilidade_iss: string | null
          fiscal_service_id: string | null
          id: string
          iss_retido: boolean | null
          item_lista_servico: string | null
          motivo_cancelamento: string | null
          motivo_rejeicao: string | null
          motivo_rejeicao_tecnico: string | null
          municipio_incidencia: string | null
          natureza_operacao: string | null
          numero_nfse: string | null
          observacoes: string | null
          pdf_url: string | null
          protocolo: string | null
          protocolo_cancelamento: string | null
          sale_id: string | null
          serie: string | null
          status: string | null
          tomador_bairro: string | null
          tomador_cep: string | null
          tomador_cnpj_cpf: string | null
          tomador_complemento: string | null
          tomador_email: string | null
          tomador_logradouro: string | null
          tomador_municipio: string | null
          tomador_numero: string | null
          tomador_razao_social: string | null
          tomador_telefone: string | null
          tomador_uf: string | null
          updated_at: string | null
          valor_deducoes: number | null
          valor_descontos: number | null
          valor_iss: number | null
          valor_liquido: number | null
          valor_servicos: number | null
          xml_dps: string | null
          xml_nfse_autorizada: string | null
        }
        Insert: {
          aliquota?: number | null
          ambiente?: string | null
          base_calculo?: number | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          chave_nfse?: string | null
          client_id?: string | null
          codigo_servico?: string | null
          created_at?: string | null
          data_competencia?: string | null
          data_emissao?: string | null
          descricao_servico?: string | null
          emitido_por?: string | null
          empresa_id: string
          exigibilidade_iss?: string | null
          fiscal_service_id?: string | null
          id?: string
          iss_retido?: boolean | null
          item_lista_servico?: string | null
          motivo_cancelamento?: string | null
          motivo_rejeicao?: string | null
          motivo_rejeicao_tecnico?: string | null
          municipio_incidencia?: string | null
          natureza_operacao?: string | null
          numero_nfse?: string | null
          observacoes?: string | null
          pdf_url?: string | null
          protocolo?: string | null
          protocolo_cancelamento?: string | null
          sale_id?: string | null
          serie?: string | null
          status?: string | null
          tomador_bairro?: string | null
          tomador_cep?: string | null
          tomador_cnpj_cpf?: string | null
          tomador_complemento?: string | null
          tomador_email?: string | null
          tomador_logradouro?: string | null
          tomador_municipio?: string | null
          tomador_numero?: string | null
          tomador_razao_social?: string | null
          tomador_telefone?: string | null
          tomador_uf?: string | null
          updated_at?: string | null
          valor_deducoes?: number | null
          valor_descontos?: number | null
          valor_iss?: number | null
          valor_liquido?: number | null
          valor_servicos?: number | null
          xml_dps?: string | null
          xml_nfse_autorizada?: string | null
        }
        Update: {
          aliquota?: number | null
          ambiente?: string | null
          base_calculo?: number | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          chave_nfse?: string | null
          client_id?: string | null
          codigo_servico?: string | null
          created_at?: string | null
          data_competencia?: string | null
          data_emissao?: string | null
          descricao_servico?: string | null
          emitido_por?: string | null
          empresa_id?: string
          exigibilidade_iss?: string | null
          fiscal_service_id?: string | null
          id?: string
          iss_retido?: boolean | null
          item_lista_servico?: string | null
          motivo_cancelamento?: string | null
          motivo_rejeicao?: string | null
          motivo_rejeicao_tecnico?: string | null
          municipio_incidencia?: string | null
          natureza_operacao?: string | null
          numero_nfse?: string | null
          observacoes?: string | null
          pdf_url?: string | null
          protocolo?: string | null
          protocolo_cancelamento?: string | null
          sale_id?: string | null
          serie?: string | null
          status?: string | null
          tomador_bairro?: string | null
          tomador_cep?: string | null
          tomador_cnpj_cpf?: string | null
          tomador_complemento?: string | null
          tomador_email?: string | null
          tomador_logradouro?: string | null
          tomador_municipio?: string | null
          tomador_numero?: string | null
          tomador_razao_social?: string | null
          tomador_telefone?: string | null
          tomador_uf?: string | null
          updated_at?: string | null
          valor_deducoes?: number | null
          valor_descontos?: number | null
          valor_iss?: number | null
          valor_liquido?: number | null
          valor_servicos?: number | null
          xml_dps?: string | null
          xml_nfse_autorizada?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfse_documents_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfse_documents_fiscal_service_id_fkey"
            columns: ["fiscal_service_id"]
            isOneToOne: false
            referencedRelation: "fiscal_service_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      nfse_events: {
        Row: {
          created_at: string | null
          description: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          nfse_id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          nfse_id: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          nfse_id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfse_events_nfse_id_fkey"
            columns: ["nfse_id"]
            isOneToOne: false
            referencedRelation: "nfse_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      nfse_items: {
        Row: {
          aliquota: number | null
          codigo_servico: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nfse_id: string
          quantidade: number | null
          sale_item_id: string | null
          valor: number | null
          valor_iss: number | null
          valor_unitario: number | null
        }
        Insert: {
          aliquota?: number | null
          codigo_servico?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nfse_id: string
          quantidade?: number | null
          sale_item_id?: string | null
          valor?: number | null
          valor_iss?: number | null
          valor_unitario?: number | null
        }
        Update: {
          aliquota?: number | null
          codigo_servico?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nfse_id?: string
          quantidade?: number | null
          sale_item_id?: string | null
          valor?: number | null
          valor_iss?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nfse_items_nfse_id_fkey"
            columns: ["nfse_id"]
            isOneToOne: false
            referencedRelation: "nfse_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      nfse_notification_logs: {
        Row: {
          channel: string | null
          created_at: string | null
          error_message: string | null
          id: string
          nfse_id: string
          recipient: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          nfse_id: string
          recipient?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          nfse_id?: string
          recipient?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfse_notification_logs_nfse_id_fkey"
            columns: ["nfse_id"]
            isOneToOne: false
            referencedRelation: "nfse_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      nfse_status_queue: {
        Row: {
          action: string | null
          attempts: number | null
          created_at: string | null
          empresa_id: string
          id: string
          last_error: string | null
          max_attempts: number | null
          next_attempt_at: string | null
          nfse_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          action?: string | null
          attempts?: number | null
          created_at?: string | null
          empresa_id: string
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          next_attempt_at?: string | null
          nfse_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          action?: string | null
          attempts?: number | null
          created_at?: string | null
          empresa_id?: string
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          next_attempt_at?: string | null
          nfse_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfse_status_queue_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfse_status_queue_nfse_id_fkey"
            columns: ["nfse_id"]
            isOneToOne: false
            referencedRelation: "nfse_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          dismissed: boolean
          empresa_id: string | null
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed?: boolean
          empresa_id?: string | null
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed?: boolean
          empresa_id?: string | null
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ofx_imports: {
        Row: {
          balance_end: number | null
          balance_start: number | null
          bank_account_id: string
          created_at: string
          empresa_id: string
          file_name: string | null
          id: string
          import_date: string
          imported_by: string | null
          period_end: string | null
          period_start: string | null
          status: string
          total_credits: number | null
          total_debits: number | null
          total_transactions: number | null
        }
        Insert: {
          balance_end?: number | null
          balance_start?: number | null
          bank_account_id: string
          created_at?: string
          empresa_id: string
          file_name?: string | null
          id?: string
          import_date?: string
          imported_by?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          total_credits?: number | null
          total_debits?: number | null
          total_transactions?: number | null
        }
        Update: {
          balance_end?: number | null
          balance_start?: number | null
          bank_account_id?: string
          created_at?: string
          empresa_id?: string
          file_name?: string | null
          id?: string
          import_date?: string
          imported_by?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          total_credits?: number | null
          total_debits?: number | null
          total_transactions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ofx_imports_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofx_imports_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_templates: {
        Row: {
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: string
          name: string
          template_data: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          name?: string
          template_data?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          name?: string
          template_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "promo_templates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      quote_status_log: {
        Row: {
          changed_by: string
          created_at: string
          empresa_id: string | null
          from_status: string
          id: string
          sale_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string
          created_at?: string
          empresa_id?: string | null
          from_status?: string
          id?: string
          sale_id: string
          to_status?: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          empresa_id?: string | null
          from_status?: string
          id?: string
          sale_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_status_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          sale_id: string | null
          status: string | null
          visa_sale_id: string | null
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
          sale_id?: string | null
          status?: string | null
          visa_sale_id?: string | null
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
          sale_id?: string | null
          status?: string | null
          visa_sale_id?: string | null
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
          {
            foreignKeyName: "receivables_visa_sale_id_fkey"
            columns: ["visa_sale_id"]
            isOneToOne: false
            referencedRelation: "visa_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_log: {
        Row: {
          action: string
          bank_transaction_id: string
          created_at: string
          details: string | null
          empresa_id: string
          id: string
          reconciled_with_id: string | null
          reconciled_with_type: string | null
          user_email: string | null
        }
        Insert: {
          action?: string
          bank_transaction_id: string
          created_at?: string
          details?: string | null
          empresa_id: string
          id?: string
          reconciled_with_id?: string | null
          reconciled_with_type?: string | null
          user_email?: string | null
        }
        Update: {
          action?: string
          bank_transaction_id?: string
          created_at?: string
          details?: string | null
          empresa_id?: string
          id?: string
          reconciled_with_id?: string | null
          reconciled_with_type?: string | null
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_log_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_reminders: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          reminder_type: string
          reservation_id: string
          sent_at: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          reminder_type: string
          reservation_id: string
          sent_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          reminder_type?: string
          reservation_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_reminders_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_reminders_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
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
          service_type: string | null
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
          service_type?: string | null
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
          service_type?: string | null
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
          markup_percent: number | null
          metadata: Json | null
          purchase_number: string | null
          quote_option_id: string | null
          rav: number | null
          reservation_number: string | null
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
          markup_percent?: number | null
          metadata?: Json | null
          purchase_number?: string | null
          quote_option_id?: string | null
          rav?: number | null
          reservation_number?: string | null
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
          markup_percent?: number | null
          metadata?: Json | null
          purchase_number?: string | null
          quote_option_id?: string | null
          rav?: number | null
          reservation_number?: string | null
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
            foreignKeyName: "sale_items_quote_option_id_fkey"
            columns: ["quote_option_id"]
            isOneToOne: false
            referencedRelation: "sale_quote_options"
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
          eticket_number: string | null
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
          eticket_number?: string | null
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
          eticket_number?: string | null
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
      sale_quote_options: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number
          sale_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          sale_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_quote_options_sale_id_fkey"
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
          destination_image_config: Json | null
          destination_image_url: string | null
          destination_name: string | null
          empresa_id: string | null
          fiscal_status: string | null
          gross_profit: number | null
          id: string
          installments: number | null
          invoice_url: string | null
          machine_fee: number | null
          machine_fee_supplier_id: string | null
          net_profit: number | null
          nfse_id: string | null
          nfse_number: string | null
          notes: string | null
          operator_taxes: number | null
          passengers_count: number | null
          payment_method: string | null
          proposal_payment_options: Json | null
          proposal_type: string
          quote_id: string | null
          quote_title: string | null
          sale_date: string
          sale_interest: number | null
          sale_workflow_status: string
          seller_id: string | null
          short_id: string
          show_individual_values: boolean
          show_only_total: boolean | null
          show_per_passenger: boolean | null
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
          destination_image_config?: Json | null
          destination_image_url?: string | null
          destination_name?: string | null
          empresa_id?: string | null
          fiscal_status?: string | null
          gross_profit?: number | null
          id?: string
          installments?: number | null
          invoice_url?: string | null
          machine_fee?: number | null
          machine_fee_supplier_id?: string | null
          net_profit?: number | null
          nfse_id?: string | null
          nfse_number?: string | null
          notes?: string | null
          operator_taxes?: number | null
          passengers_count?: number | null
          payment_method?: string | null
          proposal_payment_options?: Json | null
          proposal_type?: string
          quote_id?: string | null
          quote_title?: string | null
          sale_date?: string
          sale_interest?: number | null
          sale_workflow_status?: string
          seller_id?: string | null
          short_id?: string
          show_individual_values?: boolean
          show_only_total?: boolean | null
          show_per_passenger?: boolean | null
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
          destination_image_config?: Json | null
          destination_image_url?: string | null
          destination_name?: string | null
          empresa_id?: string | null
          fiscal_status?: string | null
          gross_profit?: number | null
          id?: string
          installments?: number | null
          invoice_url?: string | null
          machine_fee?: number | null
          machine_fee_supplier_id?: string | null
          net_profit?: number | null
          nfse_id?: string | null
          nfse_number?: string | null
          notes?: string | null
          operator_taxes?: number | null
          passengers_count?: number | null
          payment_method?: string | null
          proposal_payment_options?: Json | null
          proposal_type?: string
          quote_id?: string | null
          quote_title?: string | null
          sale_date?: string
          sale_interest?: number | null
          sale_workflow_status?: string
          seller_id?: string | null
          short_id?: string
          show_individual_values?: boolean
          show_only_total?: boolean | null
          show_per_passenger?: boolean | null
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
            foreignKeyName: "sales_machine_fee_supplier_id_fkey"
            columns: ["machine_fee_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
      system_theme_settings: {
        Row: {
          background_color: string
          border_color: string
          button_order: string
          button_position: string
          button_primary_color: string
          button_secondary_color: string
          button_size: string
          button_style: string
          created_at: string
          element_spacing: string
          empresa_id: string | null
          field_color: string
          field_columns: number
          field_height: string
          field_layout: string
          font_family: string
          font_family_tables: string
          font_family_titles: string
          font_size_body: string
          font_size_button: string
          font_size_tab: string
          font_size_table: string
          font_size_title: string
          header_color: string
          hover_color: string
          id: string
          inner_padding: string
          layout_density: string
          line_height: string
          primary_color: string
          row_height: string
          secondary_color: string
          tab_active_color: string
          tab_border: string
          tab_inactive_color: string
          tab_style: string
          table_alt_color: string
          table_borders: string
          table_color: string
          table_row_height: string
          table_style: string
          theme_name: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          border_color?: string
          button_order?: string
          button_position?: string
          button_primary_color?: string
          button_secondary_color?: string
          button_size?: string
          button_style?: string
          created_at?: string
          element_spacing?: string
          empresa_id?: string | null
          field_color?: string
          field_columns?: number
          field_height?: string
          field_layout?: string
          font_family?: string
          font_family_tables?: string
          font_family_titles?: string
          font_size_body?: string
          font_size_button?: string
          font_size_tab?: string
          font_size_table?: string
          font_size_title?: string
          header_color?: string
          hover_color?: string
          id?: string
          inner_padding?: string
          layout_density?: string
          line_height?: string
          primary_color?: string
          row_height?: string
          secondary_color?: string
          tab_active_color?: string
          tab_border?: string
          tab_inactive_color?: string
          tab_style?: string
          table_alt_color?: string
          table_borders?: string
          table_color?: string
          table_row_height?: string
          table_style?: string
          theme_name?: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          border_color?: string
          button_order?: string
          button_position?: string
          button_primary_color?: string
          button_secondary_color?: string
          button_size?: string
          button_style?: string
          created_at?: string
          element_spacing?: string
          empresa_id?: string | null
          field_color?: string
          field_columns?: number
          field_height?: string
          field_layout?: string
          font_family?: string
          font_family_tables?: string
          font_family_titles?: string
          font_size_body?: string
          font_size_button?: string
          font_size_tab?: string
          font_size_table?: string
          font_size_title?: string
          header_color?: string
          hover_color?: string
          id?: string
          inner_padding?: string
          layout_density?: string
          line_height?: string
          primary_color?: string
          row_height?: string
          secondary_color?: string
          tab_active_color?: string
          tab_border?: string
          tab_inactive_color?: string
          tab_style?: string
          table_alt_color?: string
          table_borders?: string
          table_color?: string
          table_row_height?: string
          table_style?: string
          theme_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_theme_settings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          default_empresa_id: string | null
          empresa_ids: string[] | null
          id: string
          permissions: Json
          updated_at: string
          user_id: string
          user_role: string
        }
        Insert: {
          created_at?: string
          default_empresa_id?: string | null
          empresa_ids?: string[] | null
          id?: string
          permissions?: Json
          updated_at?: string
          user_id: string
          user_role?: string
        }
        Update: {
          created_at?: string
          default_empresa_id?: string | null
          empresa_ids?: string[] | null
          id?: string
          permissions?: Json
          updated_at?: string
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_default_empresa_id_fkey"
            columns: ["default_empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          cost_center_id: string | null
          created_at: string
          description: string | null
          empresa_id: string | null
          id: string
          is_supplier_fee: boolean
          name: string
          price: number
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          average_days?: number | null
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          empresa_id?: string | null
          id?: string
          is_supplier_fee?: boolean
          name?: string
          price?: number
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          average_days?: number | null
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          empresa_id?: string | null
          id?: string
          is_supplier_fee?: boolean
          name?: string
          price?: number
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_products_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visa_products_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visa_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_sale_items: {
        Row: {
          cost_center_id: string | null
          created_at: string
          id: string
          is_supplier_fee: boolean
          payment_due_date: string | null
          product_id: string | null
          product_name: string
          quantity: number
          sort_order: number
          supplier_id: string | null
          total_value: number
          unit_price: number
          visa_sale_id: string
        }
        Insert: {
          cost_center_id?: string | null
          created_at?: string
          id?: string
          is_supplier_fee?: boolean
          payment_due_date?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          sort_order?: number
          supplier_id?: string | null
          total_value?: number
          unit_price?: number
          visa_sale_id: string
        }
        Update: {
          cost_center_id?: string | null
          created_at?: string
          id?: string
          is_supplier_fee?: boolean
          payment_due_date?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          sort_order?: number
          supplier_id?: string | null
          total_value?: number
          unit_price?: number
          visa_sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_sale_items_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visa_sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "visa_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visa_sale_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visa_sale_items_visa_sale_id_fkey"
            columns: ["visa_sale_id"]
            isOneToOne: false
            referencedRelation: "visa_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_sale_payments: {
        Row: {
          created_at: string
          id: string
          is_received: boolean
          payment_date: string | null
          payment_type: string
          value: number
          visa_sale_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_received?: boolean
          payment_date?: string | null
          payment_type?: string
          value?: number
          visa_sale_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_received?: boolean
          payment_date?: string | null
          payment_type?: string
          value?: number
          visa_sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_sale_payments_visa_sale_id_fkey"
            columns: ["visa_sale_id"]
            isOneToOne: false
            referencedRelation: "visa_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_sales: {
        Row: {
          card_fee_value: number
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
          card_fee_value?: number
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
          card_fee_value?: number
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
      whatsapp_contacts: {
        Row: {
          avatar_url: string | null
          client_id: string | null
          created_at: string
          email: string | null
          empresa_id: string | null
          id: string
          label_ids: string[] | null
          name: string
          notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id?: string
          label_ids?: string[] | null
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id?: string
          label_ids?: string[] | null
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          contact_name: string
          created_at: string
          empresa_id: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          phone: string
          status: string
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          contact_name?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          phone?: string
          status?: string
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          contact_name?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          phone?: string
          status?: string
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
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
      whatsapp_labels: {
        Row: {
          color: string
          created_at: string
          empresa_id: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          name?: string
        }
        Update: {
          color?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_labels_empresa_id_fkey"
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
          empresa_id: string | null
          id: string
          is_read: boolean | null
          media_type: string | null
          media_url: string | null
          message_type: string
          reply_to_content: string | null
          reply_to_id: string | null
          sender: string
          whatsapp_msg_id: string | null
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          reply_to_content?: string | null
          reply_to_id?: string | null
          sender?: string
          whatsapp_msg_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          reply_to_content?: string | null
          reply_to_id?: string | null
          sender?: string
          whatsapp_msg_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_quick_replies: {
        Row: {
          category: string | null
          created_at: string
          empresa_id: string | null
          id: string
          message: string
          shortcut: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          message?: string
          shortcut?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          message?: string
          shortcut?: string
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
      whatsapp_settings: {
        Row: {
          auto_reply_enabled: boolean | null
          auto_reply_message: string | null
          connected_name: string | null
          connected_phone: string | null
          created_at: string
          empresa_id: string | null
          id: string
          is_connected: boolean | null
          qr_code: string | null
          server_url: string
          session_name: string | null
          updated_at: string
        }
        Insert: {
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          connected_name?: string | null
          connected_phone?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          is_connected?: boolean | null
          qr_code?: string | null
          server_url?: string
          session_name?: string | null
          updated_at?: string
        }
        Update: {
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          connected_name?: string | null
          connected_phone?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          is_connected?: boolean | null
          qr_code?: string | null
          server_url?: string
          session_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_settings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
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
      find_or_create_conversation: {
        Args: {
          p_client_id?: string
          p_client_name?: string
          p_empresa_id: string
          p_last_message?: string
          p_last_message_at?: string
          p_phone: string
          p_whatsapp_id?: string
        }
        Returns: string
      }
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
