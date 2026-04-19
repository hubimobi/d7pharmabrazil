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
      abandoned_carts: {
        Row: {
          ai_agent_active: boolean
          ai_contact_count: number
          assigned_agent_id: string | null
          cart_total: number
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          ghl_synced: boolean
          id: string
          items: Json
          last_contact_at: string | null
          recovered_at: string | null
          recovery_notes: string | null
          recovery_stage: string
          shipping_cep: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          ai_agent_active?: boolean
          ai_contact_count?: number
          assigned_agent_id?: string | null
          cart_total?: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          ghl_synced?: boolean
          id?: string
          items?: Json
          last_contact_at?: string | null
          recovered_at?: string | null
          recovery_notes?: string | null
          recovery_stage?: string
          shipping_cep?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_agent_active?: boolean
          ai_contact_count?: number
          assigned_agent_id?: string | null
          cart_total?: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          ghl_synced?: boolean
          id?: string
          items?: Json
          last_contact_at?: string | null
          recovered_at?: string | null
          recovery_notes?: string | null
          recovery_stage?: string
          shipping_cep?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          tenant_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          tenant_id?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          tenant_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_knowledge_bases: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          knowledge_base_id: string
          tenant_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          knowledge_base_id: string
          tenant_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          knowledge_base_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_knowledge_bases_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_knowledge_bases_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_knowledge_bases_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "ai_knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_knowledge_bases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          active: boolean
          allowed_panels: Json
          channels: Json
          color: string
          created_at: string
          description: string
          icon: string
          id: string
          llm_override: string | null
          model: string
          name: string
          slug: string
          system_prompt: string
          temperature: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          allowed_panels?: Json
          channels?: Json
          color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          llm_override?: string | null
          model?: string
          name: string
          slug: string
          system_prompt?: string
          temperature?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          allowed_panels?: Json
          channels?: Json
          color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          llm_override?: string | null
          model?: string
          name?: string
          slug?: string
          system_prompt?: string
          temperature?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          agent_id: string
          content: string
          created_at: string
          feedback: string | null
          id: string
          role: string
          session_id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          content?: string
          created_at?: string
          feedback?: string | null
          id?: string
          role?: string
          session_id?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string
          feedback?: string | null
          id?: string
          role?: string
          session_id?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_kb_items: {
        Row: {
          content: Json
          created_at: string
          id: string
          knowledge_base_id: string
          status: string
          tenant_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          knowledge_base_id: string
          status?: string
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          knowledge_base_id?: string
          status?: string
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_kb_items_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "ai_knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_kb_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_bases: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_bases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_llm_config: {
        Row: {
          active: boolean
          api_key_name: string
          created_at: string
          default_model: string
          id: string
          provider: string
          tenant_id: string | null
        }
        Insert: {
          active?: boolean
          api_key_name?: string
          created_at?: string
          default_model?: string
          id?: string
          provider?: string
          tenant_id?: string | null
        }
        Update: {
          active?: boolean
          api_key_name?: string
          created_at?: string
          default_model?: string
          id?: string
          provider?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_llm_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_meetings: {
        Row: {
          agent_ids: Json
          created_at: string
          id: string
          messages: Json
          summary: string | null
          tenant_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          agent_ids?: Json
          created_at?: string
          id?: string
          messages?: Json
          summary?: string | null
          tenant_id?: string | null
          title?: string
          user_id: string
        }
        Update: {
          agent_ids?: Json
          created_at?: string
          id?: string
          messages?: Json
          summary?: string | null
          tenant_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_meetings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_system_prompts: {
        Row: {
          created_at: string
          id: string
          system_prompt: string
          temperature: number
          tenant_id: string | null
          tool_key: string
          tool_label: string
          updated_at: string
          user_prompt_template: string
        }
        Insert: {
          created_at?: string
          id?: string
          system_prompt?: string
          temperature?: number
          tenant_id?: string | null
          tool_key: string
          tool_label?: string
          updated_at?: string
          user_prompt_template?: string
        }
        Update: {
          created_at?: string
          id?: string
          system_prompt?: string
          temperature?: number
          tenant_id?: string | null
          tool_key?: string
          tool_label?: string
          updated_at?: string
          user_prompt_template?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_system_prompts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_token_usage: {
        Row: {
          agent_id: string | null
          agent_name: string
          created_at: string
          function_name: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          provider: string
          tenant_id: string | null
          total_tokens: number
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string
          created_at?: string
          function_name?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          provider?: string
          tenant_id?: string | null
          total_tokens?: number
        }
        Update: {
          agent_id?: string | null
          agent_name?: string
          created_at?: string
          function_name?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          provider?: string
          tenant_id?: string | null
          total_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_token_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_token_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_token_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bling_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bling_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_config: {
        Row: {
          ad_template: string
          adset_template: string
          audience_template: string
          campaign_template: string
          created_at: string
          default_objective: string
          id: string
          notes: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          ad_template?: string
          adset_template?: string
          audience_template?: string
          campaign_template?: string
          created_at?: string
          default_objective?: string
          id?: string
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          ad_template?: string
          adset_template?: string
          audience_template?: string
          campaign_template?: string
          created_at?: string
          default_objective?: string
          id?: string
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          commission_rate: number
          commission_value: number
          created_at: string
          doctor_id: string | null
          id: string
          order_id: string
          order_total: number
          paid_at: string | null
          payment_id: string | null
          representative_id: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          commission_value?: number
          created_at?: string
          doctor_id?: string | null
          id?: string
          order_id: string
          order_total?: number
          paid_at?: string | null
          payment_id?: string | null
          representative_id: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          commission_value?: number
          created_at?: string
          doctor_id?: string | null
          id?: string
          order_id?: string
          order_total?: number
          paid_at?: string | null
          payment_id?: string | null
          representative_id?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string
          discount_type: string
          discount_value: number
          doctor_id: string | null
          expires_at: string | null
          free_shipping: boolean
          id: string
          max_uses: number | null
          min_order_value: number | null
          product_id: string | null
          representative_id: string | null
          starts_at: string | null
          tenant_id: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          doctor_id?: string | null
          expires_at?: string | null
          free_shipping?: boolean
          id?: string
          max_uses?: number | null
          min_order_value?: number | null
          product_id?: string | null
          representative_id?: string | null
          starts_at?: string | null
          tenant_id?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          doctor_id?: string | null
          expires_at?: string | null
          free_shipping?: boolean
          id?: string
          max_uses?: number | null
          min_order_value?: number | null
          product_id?: string | null
          representative_id?: string | null
          starts_at?: string | null
          tenant_id?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          created_at: string
          customer_email: string
          id: string
          tag: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          id?: string
          tag: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          id?: string
          tag?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          active: boolean
          approval_status: string
          city: string | null
          cpf: string | null
          created_at: string
          crm: string | null
          email: string | null
          id: string
          name: string
          pix: string | null
          representative_id: string
          specialty: string | null
          state: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          approval_status?: string
          city?: string | null
          cpf?: string | null
          created_at?: string
          crm?: string | null
          email?: string | null
          id?: string
          name: string
          pix?: string | null
          representative_id: string
          specialty?: string | null
          state?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          approval_status?: string
          city?: string | null
          cpf?: string | null
          created_at?: string
          crm?: string | null
          email?: string | null
          id?: string
          name?: string
          pix?: string | null
          representative_id?: string
          specialty?: string | null
          state?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_banners: {
        Row: {
          active: boolean
          badges: Json
          bg_color: string | null
          bg_gradient: string | null
          btn1_bg_color: string | null
          btn1_hover_color: string | null
          btn2_bg_color: string | null
          btn2_hover_color: string | null
          button_link: string
          button_text: string
          button2_link: string
          button2_text: string
          created_at: string
          id: string
          image_url: string | null
          media_type: string
          side_image_url: string | null
          sort_order: number
          subtitle: string
          tenant_id: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          active?: boolean
          badges?: Json
          bg_color?: string | null
          bg_gradient?: string | null
          btn1_bg_color?: string | null
          btn1_hover_color?: string | null
          btn2_bg_color?: string | null
          btn2_hover_color?: string | null
          button_link?: string
          button_text?: string
          button2_link?: string
          button2_text?: string
          created_at?: string
          id?: string
          image_url?: string | null
          media_type?: string
          side_image_url?: string | null
          sort_order?: number
          subtitle?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          active?: boolean
          badges?: Json
          bg_color?: string | null
          bg_gradient?: string | null
          btn1_bg_color?: string | null
          btn1_hover_color?: string | null
          btn2_bg_color?: string | null
          btn2_hover_color?: string | null
          button_link?: string
          button_text?: string
          button2_link?: string
          button2_text?: string
          created_at?: string
          id?: string
          image_url?: string | null
          media_type?: string
          side_image_url?: string | null
          sort_order?: number
          subtitle?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hero_banners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          integration: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          integration: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          integration?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          clicked_at: string
          device_type: string | null
          id: string
          referrer: string | null
          short_link_id: string
          tenant_id: string | null
        }
        Insert: {
          clicked_at?: string
          device_type?: string | null
          id?: string
          referrer?: string | null
          short_link_id: string
          tenant_id?: string | null
        }
        Update: {
          clicked_at?: string
          device_type?: string | null
          id?: string
          referrer?: string | null
          short_link_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_short_link_id_fkey"
            columns: ["short_link_id"]
            isOneToOne: false
            referencedRelation: "short_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_clicks_short_link_id_fkey"
            columns: ["short_link_id"]
            isOneToOne: false
            referencedRelation: "short_links_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_clicks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      link_conversions: {
        Row: {
          converted_at: string
          id: string
          order_id: string | null
          order_total: number
          short_link_id: string
          tenant_id: string | null
        }
        Insert: {
          converted_at?: string
          id?: string
          order_id?: string | null
          order_total?: number
          short_link_id: string
          tenant_id?: string | null
        }
        Update: {
          converted_at?: string
          id?: string
          order_id?: string | null
          order_total?: number
          short_link_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_conversions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_conversions_short_link_id_fkey"
            columns: ["short_link_id"]
            isOneToOne: false
            referencedRelation: "short_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_conversions_short_link_id_fkey"
            columns: ["short_link_id"]
            isOneToOne: false
            referencedRelation: "short_links_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_conversions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manufacturers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          asaas_payment_id: string | null
          bling_order_id: string | null
          coupon_code: string | null
          created_at: string
          customer_cpf: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          doctor_id: string | null
          id: string
          items: Json
          shipping_address: Json | null
          status: string
          tenant_id: string | null
          total: number
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          asaas_payment_id?: string | null
          bling_order_id?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          doctor_id?: string | null
          id?: string
          items?: Json
          shipping_address?: Json | null
          status?: string
          tenant_id?: string | null
          total?: number
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          asaas_payment_id?: string | null
          bling_order_id?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          doctor_id?: string | null
          id?: string
          items?: Json
          shipping_address?: Json | null
          status?: string
          tenant_id?: string | null
          total?: number
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_definitions: {
        Row: {
          active: boolean
          allowed_modules: Json
          created_at: string
          display_name: string
          id: string
          max_ai_messages_per_month: number | null
          max_custom_domains: number | null
          max_orders_per_month: number | null
          max_products: number | null
          max_users: number | null
          max_whatsapp_contacts: number | null
          plan_key: string
          price_brl: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          allowed_modules?: Json
          created_at?: string
          display_name: string
          id?: string
          max_ai_messages_per_month?: number | null
          max_custom_domains?: number | null
          max_orders_per_month?: number | null
          max_products?: number | null
          max_users?: number | null
          max_whatsapp_contacts?: number | null
          plan_key: string
          price_brl?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          allowed_modules?: Json
          created_at?: string
          display_name?: string
          id?: string
          max_ai_messages_per_month?: number | null
          max_custom_domains?: number | null
          max_orders_per_month?: number | null
          max_products?: number | null
          max_users?: number | null
          max_whatsapp_contacts?: number | null
          plan_key?: string
          price_brl?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      popup_leads: {
        Row: {
          city: string | null
          created_at: string | null
          email: string
          ghl_synced: boolean | null
          id: string
          name: string | null
          phone: string | null
          product_id: string | null
          product_name: string | null
          source: string | null
          state: string | null
          tags: Json
          tenant_id: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          email: string
          ghl_synced?: boolean | null
          id?: string
          name?: string | null
          phone?: string | null
          product_id?: string | null
          product_name?: string | null
          source?: string | null
          state?: string | null
          tags?: Json
          tenant_id?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          email?: string
          ghl_synced?: boolean | null
          id?: string
          name?: string | null
          phone?: string | null
          product_id?: string | null
          product_name?: string | null
          source?: string | null
          state?: string | null
          tags?: Json
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "popup_leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popup_leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popup_leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_combos: {
        Row: {
          active: boolean
          badge: string | null
          created_at: string
          description: string
          featured: boolean
          id: string
          image_url: string | null
          name: string
          original_price: number
          price: number
          product_ids: Json
          seo_description: string | null
          seo_title: string | null
          slug: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          name: string
          original_price?: number
          price?: number
          product_ids?: Json
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          name?: string
          original_price?: number
          price?: number
          product_ids?: Json
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_combos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          product_id: string
          question: string
          sort_order: number
          tenant_id: string | null
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          product_id: string
          question: string
          sort_order?: number
          tenant_id?: string | null
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          product_id?: string
          question?: string
          sort_order?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_faqs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_faqs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_faqs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_testimonials: {
        Row: {
          approved: boolean
          author_image_url: string | null
          author_name: string
          content: string
          created_at: string
          id: string
          order_id: string | null
          product_id: string
          product_image_url: string | null
          product_image_urls: Json | null
          rating: number
          source: string
          tenant_id: string | null
        }
        Insert: {
          approved?: boolean
          author_image_url?: string | null
          author_name: string
          content: string
          created_at?: string
          id?: string
          order_id?: string | null
          product_id: string
          product_image_url?: string | null
          product_image_urls?: Json | null
          rating?: number
          source?: string
          tenant_id?: string | null
        }
        Update: {
          approved?: boolean
          author_image_url?: string | null
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string
          product_image_url?: string | null
          product_image_urls?: Json | null
          rating?: number
          source?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_testimonials_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_testimonials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_testimonials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_testimonials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          badge: string | null
          benefits: Json
          cost_price: number
          countdown_duration_minutes: number | null
          countdown_end_date: string | null
          countdown_end_time: string | null
          countdown_mode: string
          created_at: string
          description: string
          extra_images: Json
          featured: boolean
          group_name: string | null
          gtin: string | null
          height: number
          id: string
          image_url: string | null
          length: number
          manufacturer: string | null
          name: string
          ncm: string | null
          original_price: number
          price: number
          rating: number
          reviews_count: number
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          short_description: string
          show_countdown: boolean
          sku: string | null
          slug: string
          stock: number
          tenant_id: string | null
          unit: string
          updated_at: string
          upsell_product_ids: Json
          weight: number
          width: number
        }
        Insert: {
          active?: boolean
          badge?: string | null
          benefits?: Json
          cost_price?: number
          countdown_duration_minutes?: number | null
          countdown_end_date?: string | null
          countdown_end_time?: string | null
          countdown_mode?: string
          created_at?: string
          description?: string
          extra_images?: Json
          featured?: boolean
          group_name?: string | null
          gtin?: string | null
          height?: number
          id?: string
          image_url?: string | null
          length?: number
          manufacturer?: string | null
          name: string
          ncm?: string | null
          original_price?: number
          price?: number
          rating?: number
          reviews_count?: number
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          short_description?: string
          show_countdown?: boolean
          sku?: string | null
          slug: string
          stock?: number
          tenant_id?: string | null
          unit?: string
          updated_at?: string
          upsell_product_ids?: Json
          weight?: number
          width?: number
        }
        Update: {
          active?: boolean
          badge?: string | null
          benefits?: Json
          cost_price?: number
          countdown_duration_minutes?: number | null
          countdown_end_date?: string | null
          countdown_end_time?: string | null
          countdown_mode?: string
          created_at?: string
          description?: string
          extra_images?: Json
          featured?: boolean
          group_name?: string | null
          gtin?: string | null
          height?: number
          id?: string
          image_url?: string | null
          length?: number
          manufacturer?: string | null
          name?: string
          ncm?: string | null
          original_price?: number
          price?: number
          rating?: number
          reviews_count?: number
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          short_description?: string
          show_countdown?: boolean
          sku?: string | null
          slug?: string
          stock?: number
          tenant_id?: string | null
          unit?: string
          updated_at?: string
          upsell_product_ids?: Json
          weight?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          active: boolean
          bg_color: string | null
          button_link: string
          button_text: string
          created_at: string
          id: string
          image_bg_color: string | null
          image_url: string | null
          link_type: string
          product_slug: string | null
          slot: number
          subtitle: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          bg_color?: string | null
          button_link?: string
          button_text?: string
          created_at?: string
          id?: string
          image_bg_color?: string | null
          image_url?: string | null
          link_type?: string
          product_slug?: string | null
          slot?: number
          subtitle?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          bg_color?: string | null
          button_link?: string
          button_text?: string
          created_at?: string
          id?: string
          image_bg_color?: string | null
          image_url?: string | null
          link_type?: string
          product_slug?: string | null
          slot?: number
          subtitle?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_banners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      representatives: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          pix: string | null
          region: string | null
          short_code: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          pix?: string | null
          region?: string | null
          short_code: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          pix?: string | null
          region?: string | null
          short_code?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "representatives_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      repurchase_funnel: {
        Row: {
          aviso_15_sent_at: string | null
          aviso_30_sent_at: string | null
          aviso_5_sent_at: string | null
          coupon_code: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          delivery_confirmed_at: string | null
          discount_percent: number | null
          feedback_response: string | null
          feedback_sent_at: string | null
          id: string
          order_id: string
          product_duration_days: number | null
          product_id: string | null
          product_name: string
          recompra_order_id: string | null
          stage: string
          stage_changed_at: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          aviso_15_sent_at?: string | null
          aviso_30_sent_at?: string | null
          aviso_5_sent_at?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_confirmed_at?: string | null
          discount_percent?: number | null
          feedback_response?: string | null
          feedback_sent_at?: string | null
          id?: string
          order_id: string
          product_duration_days?: number | null
          product_id?: string | null
          product_name?: string
          recompra_order_id?: string | null
          stage?: string
          stage_changed_at?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          aviso_15_sent_at?: string | null
          aviso_30_sent_at?: string | null
          aviso_5_sent_at?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_confirmed_at?: string | null
          discount_percent?: number | null
          feedback_response?: string | null
          feedback_sent_at?: string | null
          id?: string
          order_id?: string
          product_duration_days?: number | null
          product_id?: string | null
          product_name?: string
          recompra_order_id?: string | null
          stage?: string
          stage_changed_at?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repurchase_funnel_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repurchase_funnel_recompra_order_id_fkey"
            columns: ["recompra_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repurchase_funnel_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      repurchase_goals: {
        Row: {
          created_at: string
          goal_count: number
          id: string
          month: number
          tenant_id: string | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          goal_count?: number
          id?: string
          month: number
          tenant_id?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          goal_count?: number
          id?: string
          month?: number
          tenant_id?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "repurchase_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      short_links: {
        Row: {
          active: boolean
          clicks_count: number
          code: string
          conversions_count: number
          created_at: string
          doctor_id: string | null
          id: string
          product_id: string | null
          target_url: string
          tenant_id: string | null
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          active?: boolean
          clicks_count?: number
          code: string
          conversions_count?: number
          created_at?: string
          doctor_id?: string | null
          id?: string
          product_id?: string | null
          target_url: string
          tenant_id?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          active?: boolean
          clicks_count?: number
          code?: string
          conversions_count?: number
          created_at?: string
          doctor_id?: string | null
          id?: string
          product_id?: string | null
          target_url?: string
          tenant_id?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "short_links_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_links_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      static_pages: {
        Row: {
          content: string
          created_at: string
          id: string
          slug: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          slug: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          slug?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "static_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          attendant_name: string | null
          benefits_items: Json
          benefits_subtitle: string
          benefits_title: string
          checkout_boleto_enabled: boolean | null
          checkout_prescriber_required: boolean
          checkout_show_combo: boolean | null
          checkout_show_free_shipping_bar: boolean | null
          checkout_show_motivation: boolean | null
          checkout_show_recommendations: boolean | null
          checkout_show_testimonials: boolean | null
          checkout_show_urgency: boolean | null
          checkout_version: string
          cnpj: string | null
          combo_offer_discount: number
          combo_offer_enabled: boolean
          combo_offer_free_shipping: boolean
          combo_offer_label: string
          combo_offer_products: Json
          created_at: string
          cta_subtitle: string | null
          cta_title: string | null
          design_bg_color: string | null
          design_bg_gradient: string | null
          design_border_style: string
          design_font: string | null
          design_footer_color: string | null
          design_footer_gradient: string | null
          design_footer_text_color: string | null
          design_footer_title_color: string | null
          design_icon_color: string | null
          design_icon_style: string | null
          design_nav_color: string | null
          design_text_color: string | null
          design_title_color: string | null
          display_name: string | null
          email: string | null
          evolution_api_key: string | null
          evolution_api_url: string | null
          facebook: string | null
          favicon_url: string | null
          feedback_bonus_coupon_id: string | null
          free_shipping_enabled: boolean | null
          free_shipping_min_value: number | null
          free_shipping_regions: string | null
          goal_cart_recovery: number | null
          goal_conversion_rate: number | null
          goal_ltv: number | null
          goal_monthly_revenue: number | null
          goal_profit_margin: number | null
          goal_upsell: number | null
          google_business_place_id: string | null
          google_business_review_url: string | null
          gtm_id: string | null
          hero_badges: Json | null
          hero_btn1_bg_color: string | null
          hero_btn1_hover_color: string | null
          hero_btn2_bg_color: string | null
          hero_btn2_hover_color: string | null
          hero_button_link: string | null
          hero_button_text: string | null
          hero_button2_link: string | null
          hero_button2_text: string | null
          hero_carousel_effect: string
          hero_carousel_enabled: boolean
          hero_carousel_interval: number
          hero_image_url: string | null
          hero_media_type: string | null
          hero_subtitle: string | null
          hero_title: string | null
          hero_video_url: string | null
          hide_chat_on_checkout: boolean | null
          horizontal_logo_url: string | null
          hotjar_id: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          mailing_bg_color: string | null
          mailing_button_color: string | null
          mailing_text_color: string | null
          mailing_title_color: string | null
          max_installments: number
          max_total_installments: number
          meta_pixel_id: string | null
          notification_bar_bg_color: string | null
          notification_bar_enabled: boolean | null
          notification_bar_text: string | null
          notification_bar_text_color: string | null
          popup_banner_collect_email: boolean | null
          popup_banner_cta_text: string | null
          popup_banner_delay_seconds: number | null
          popup_banner_description: string | null
          popup_banner_enabled: boolean | null
          popup_banner_image_url: string | null
          popup_banner_reappear_hours: number
          popup_banner_title: string | null
          products_sidebar_enabled: boolean
          sales_popup_burst_count: number | null
          sales_popup_button_color: string | null
          sales_popup_custom_entries: Json | null
          sales_popup_enabled: boolean | null
          sales_popup_include_real_orders: boolean | null
          sales_popup_interval_max: number | null
          sales_popup_interval_min: number | null
          sales_popup_position: string | null
          section_benefits_visible: boolean
          section_featured_visible: boolean
          section_guarantee_visible: boolean
          section_hero_visible: boolean
          section_instagram_visible: boolean
          section_mailing_visible: boolean
          section_order: Json | null
          section_products_visible: boolean
          section_promo_banners_visible: boolean
          section_testimonials_visible: boolean
          section_trust_badges_visible: boolean
          seo_default_description: string | null
          seo_default_og_image: string | null
          seo_default_title: string | null
          seo_keywords: string | null
          store_name: string
          tenant_id: string | null
          tiktok: string | null
          updated_at: string
          visual_theme: string
          webchat_delay_seconds: number | null
          webchat_enabled: boolean
          webchat_position: string | null
          webchat_script: string | null
          webchat_show_on_scroll: boolean | null
          whatsapp: string | null
          whatsapp_button_enabled: boolean
          whatsapp_button_message: string | null
          whatsapp_button_name: string | null
          whatsapp_delay_seconds: number | null
          whatsapp_position: string | null
          whatsapp_show_on_scroll: boolean | null
          whatsapp_support: string | null
          youtube: string | null
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          attendant_name?: string | null
          benefits_items?: Json
          benefits_subtitle?: string
          benefits_title?: string
          checkout_boleto_enabled?: boolean | null
          checkout_prescriber_required?: boolean
          checkout_show_combo?: boolean | null
          checkout_show_free_shipping_bar?: boolean | null
          checkout_show_motivation?: boolean | null
          checkout_show_recommendations?: boolean | null
          checkout_show_testimonials?: boolean | null
          checkout_show_urgency?: boolean | null
          checkout_version?: string
          cnpj?: string | null
          combo_offer_discount?: number
          combo_offer_enabled?: boolean
          combo_offer_free_shipping?: boolean
          combo_offer_label?: string
          combo_offer_products?: Json
          created_at?: string
          cta_subtitle?: string | null
          cta_title?: string | null
          design_bg_color?: string | null
          design_bg_gradient?: string | null
          design_border_style?: string
          design_font?: string | null
          design_footer_color?: string | null
          design_footer_gradient?: string | null
          design_footer_text_color?: string | null
          design_footer_title_color?: string | null
          design_icon_color?: string | null
          design_icon_style?: string | null
          design_nav_color?: string | null
          design_text_color?: string | null
          design_title_color?: string | null
          display_name?: string | null
          email?: string | null
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          facebook?: string | null
          favicon_url?: string | null
          feedback_bonus_coupon_id?: string | null
          free_shipping_enabled?: boolean | null
          free_shipping_min_value?: number | null
          free_shipping_regions?: string | null
          goal_cart_recovery?: number | null
          goal_conversion_rate?: number | null
          goal_ltv?: number | null
          goal_monthly_revenue?: number | null
          goal_profit_margin?: number | null
          goal_upsell?: number | null
          google_business_place_id?: string | null
          google_business_review_url?: string | null
          gtm_id?: string | null
          hero_badges?: Json | null
          hero_btn1_bg_color?: string | null
          hero_btn1_hover_color?: string | null
          hero_btn2_bg_color?: string | null
          hero_btn2_hover_color?: string | null
          hero_button_link?: string | null
          hero_button_text?: string | null
          hero_button2_link?: string | null
          hero_button2_text?: string | null
          hero_carousel_effect?: string
          hero_carousel_enabled?: boolean
          hero_carousel_interval?: number
          hero_image_url?: string | null
          hero_media_type?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hero_video_url?: string | null
          hide_chat_on_checkout?: boolean | null
          horizontal_logo_url?: string | null
          hotjar_id?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          mailing_bg_color?: string | null
          mailing_button_color?: string | null
          mailing_text_color?: string | null
          mailing_title_color?: string | null
          max_installments?: number
          max_total_installments?: number
          meta_pixel_id?: string | null
          notification_bar_bg_color?: string | null
          notification_bar_enabled?: boolean | null
          notification_bar_text?: string | null
          notification_bar_text_color?: string | null
          popup_banner_collect_email?: boolean | null
          popup_banner_cta_text?: string | null
          popup_banner_delay_seconds?: number | null
          popup_banner_description?: string | null
          popup_banner_enabled?: boolean | null
          popup_banner_image_url?: string | null
          popup_banner_reappear_hours?: number
          popup_banner_title?: string | null
          products_sidebar_enabled?: boolean
          sales_popup_burst_count?: number | null
          sales_popup_button_color?: string | null
          sales_popup_custom_entries?: Json | null
          sales_popup_enabled?: boolean | null
          sales_popup_include_real_orders?: boolean | null
          sales_popup_interval_max?: number | null
          sales_popup_interval_min?: number | null
          sales_popup_position?: string | null
          section_benefits_visible?: boolean
          section_featured_visible?: boolean
          section_guarantee_visible?: boolean
          section_hero_visible?: boolean
          section_instagram_visible?: boolean
          section_mailing_visible?: boolean
          section_order?: Json | null
          section_products_visible?: boolean
          section_promo_banners_visible?: boolean
          section_testimonials_visible?: boolean
          section_trust_badges_visible?: boolean
          seo_default_description?: string | null
          seo_default_og_image?: string | null
          seo_default_title?: string | null
          seo_keywords?: string | null
          store_name?: string
          tenant_id?: string | null
          tiktok?: string | null
          updated_at?: string
          visual_theme?: string
          webchat_delay_seconds?: number | null
          webchat_enabled?: boolean
          webchat_position?: string | null
          webchat_script?: string | null
          webchat_show_on_scroll?: boolean | null
          whatsapp?: string | null
          whatsapp_button_enabled?: boolean
          whatsapp_button_message?: string | null
          whatsapp_button_name?: string | null
          whatsapp_delay_seconds?: number | null
          whatsapp_position?: string | null
          whatsapp_show_on_scroll?: boolean | null
          whatsapp_support?: string | null
          youtube?: string | null
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          attendant_name?: string | null
          benefits_items?: Json
          benefits_subtitle?: string
          benefits_title?: string
          checkout_boleto_enabled?: boolean | null
          checkout_prescriber_required?: boolean
          checkout_show_combo?: boolean | null
          checkout_show_free_shipping_bar?: boolean | null
          checkout_show_motivation?: boolean | null
          checkout_show_recommendations?: boolean | null
          checkout_show_testimonials?: boolean | null
          checkout_show_urgency?: boolean | null
          checkout_version?: string
          cnpj?: string | null
          combo_offer_discount?: number
          combo_offer_enabled?: boolean
          combo_offer_free_shipping?: boolean
          combo_offer_label?: string
          combo_offer_products?: Json
          created_at?: string
          cta_subtitle?: string | null
          cta_title?: string | null
          design_bg_color?: string | null
          design_bg_gradient?: string | null
          design_border_style?: string
          design_font?: string | null
          design_footer_color?: string | null
          design_footer_gradient?: string | null
          design_footer_text_color?: string | null
          design_footer_title_color?: string | null
          design_icon_color?: string | null
          design_icon_style?: string | null
          design_nav_color?: string | null
          design_text_color?: string | null
          design_title_color?: string | null
          display_name?: string | null
          email?: string | null
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          facebook?: string | null
          favicon_url?: string | null
          feedback_bonus_coupon_id?: string | null
          free_shipping_enabled?: boolean | null
          free_shipping_min_value?: number | null
          free_shipping_regions?: string | null
          goal_cart_recovery?: number | null
          goal_conversion_rate?: number | null
          goal_ltv?: number | null
          goal_monthly_revenue?: number | null
          goal_profit_margin?: number | null
          goal_upsell?: number | null
          google_business_place_id?: string | null
          google_business_review_url?: string | null
          gtm_id?: string | null
          hero_badges?: Json | null
          hero_btn1_bg_color?: string | null
          hero_btn1_hover_color?: string | null
          hero_btn2_bg_color?: string | null
          hero_btn2_hover_color?: string | null
          hero_button_link?: string | null
          hero_button_text?: string | null
          hero_button2_link?: string | null
          hero_button2_text?: string | null
          hero_carousel_effect?: string
          hero_carousel_enabled?: boolean
          hero_carousel_interval?: number
          hero_image_url?: string | null
          hero_media_type?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hero_video_url?: string | null
          hide_chat_on_checkout?: boolean | null
          horizontal_logo_url?: string | null
          hotjar_id?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          mailing_bg_color?: string | null
          mailing_button_color?: string | null
          mailing_text_color?: string | null
          mailing_title_color?: string | null
          max_installments?: number
          max_total_installments?: number
          meta_pixel_id?: string | null
          notification_bar_bg_color?: string | null
          notification_bar_enabled?: boolean | null
          notification_bar_text?: string | null
          notification_bar_text_color?: string | null
          popup_banner_collect_email?: boolean | null
          popup_banner_cta_text?: string | null
          popup_banner_delay_seconds?: number | null
          popup_banner_description?: string | null
          popup_banner_enabled?: boolean | null
          popup_banner_image_url?: string | null
          popup_banner_reappear_hours?: number
          popup_banner_title?: string | null
          products_sidebar_enabled?: boolean
          sales_popup_burst_count?: number | null
          sales_popup_button_color?: string | null
          sales_popup_custom_entries?: Json | null
          sales_popup_enabled?: boolean | null
          sales_popup_include_real_orders?: boolean | null
          sales_popup_interval_max?: number | null
          sales_popup_interval_min?: number | null
          sales_popup_position?: string | null
          section_benefits_visible?: boolean
          section_featured_visible?: boolean
          section_guarantee_visible?: boolean
          section_hero_visible?: boolean
          section_instagram_visible?: boolean
          section_mailing_visible?: boolean
          section_order?: Json | null
          section_products_visible?: boolean
          section_promo_banners_visible?: boolean
          section_testimonials_visible?: boolean
          section_trust_badges_visible?: boolean
          seo_default_description?: string | null
          seo_default_og_image?: string | null
          seo_default_title?: string | null
          seo_keywords?: string | null
          store_name?: string
          tenant_id?: string | null
          tiktok?: string | null
          updated_at?: string
          visual_theme?: string
          webchat_delay_seconds?: number | null
          webchat_enabled?: boolean
          webchat_position?: string | null
          webchat_script?: string | null
          webchat_show_on_scroll?: boolean | null
          whatsapp?: string | null
          whatsapp_button_enabled?: boolean
          whatsapp_button_message?: string | null
          whatsapp_button_name?: string | null
          whatsapp_delay_seconds?: number | null
          whatsapp_position?: string | null
          whatsapp_show_on_scroll?: boolean | null
          whatsapp_support?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_feedback_bonus_coupon_id_fkey"
            columns: ["feedback_bonus_coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_settings_feedback_bonus_coupon_id_fkey"
            columns: ["feedback_bonus_coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_clones_log: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          initiated_by: string | null
          source_tenant_id: string | null
          started_at: string | null
          status: string | null
          tables_cloned: string[] | null
          target_tenant_id: string | null
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          initiated_by?: string | null
          source_tenant_id?: string | null
          started_at?: string | null
          status?: string | null
          tables_cloned?: string[] | null
          target_tenant_id?: string | null
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          initiated_by?: string | null
          source_tenant_id?: string | null
          started_at?: string | null
          status?: string | null
          tables_cloned?: string[] | null
          target_tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_clones_log_source_tenant_id_fkey"
            columns: ["source_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_clones_log_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_config_backups: {
        Row: {
          backup_type: string | null
          created_at: string | null
          created_by: string | null
          data: Json
          id: string
          notes: string | null
          table_name: string
          tenant_id: string
        }
        Insert: {
          backup_type?: string | null
          created_at?: string | null
          created_by?: string | null
          data: Json
          id?: string
          notes?: string | null
          table_name: string
          tenant_id: string
        }
        Update: {
          backup_type?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json
          id?: string
          notes?: string | null
          table_name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_config_backups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          is_primary: boolean | null
          last_check_at: string | null
          last_error: string | null
          ssl_enabled: boolean | null
          tenant_id: string
          verification_status: string
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id?: string
          is_primary?: boolean | null
          last_check_at?: string | null
          last_error?: string | null
          ssl_enabled?: boolean | null
          tenant_id: string
          verification_status?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          is_primary?: boolean | null
          last_check_at?: string | null
          last_error?: string | null
          ssl_enabled?: boolean | null
          tenant_id?: string
          verification_status?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_integrations: {
        Row: {
          active: boolean
          created_at: string
          credentials: Json
          id: string
          last_used_at: string | null
          provider: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          credentials?: Json
          id?: string
          last_used_at?: string | null
          provider: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          credentials?: Json
          id?: string
          last_used_at?: string | null
          provider?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string | null
          id: string
          role: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          active: boolean | null
          allowed_modules: Json | null
          cloning_status: string | null
          created_at: string | null
          id: string
          is_template: boolean | null
          max_products: number | null
          max_users: number | null
          name: string
          owner_user_id: string | null
          plan: string | null
          settings: Json | null
          slug: string
          status: string | null
          subscription_id: string | null
          system_version: string | null
          template_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          allowed_modules?: Json | null
          cloning_status?: string | null
          created_at?: string | null
          id?: string
          is_template?: boolean | null
          max_products?: number | null
          max_users?: number | null
          name: string
          owner_user_id?: string | null
          plan?: string | null
          settings?: Json | null
          slug: string
          status?: string | null
          subscription_id?: string | null
          system_version?: string | null
          template_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          allowed_modules?: Json | null
          cloning_status?: string | null
          created_at?: string | null
          id?: string
          is_template?: boolean | null
          max_products?: number | null
          max_users?: number | null
          name?: string
          owner_user_id?: string | null
          plan?: string | null
          settings?: Json | null
          slug?: string
          status?: string | null
          subscription_id?: string | null
          system_version?: string | null
          template_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          shop_id: string | null
          shop_name: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          shop_id?: string | null
          shop_name?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          shop_id?: string | null
          shop_name?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitor_events: {
        Row: {
          created_at: string
          event_data: Json
          event_name: string
          id: string
          link_ref_code: string | null
          page_url: string | null
          referrer: string | null
          session_id: string
          tenant_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_name: string
          id?: string
          link_ref_code?: string | null
          page_url?: string | null
          referrer?: string | null
          session_id: string
          tenant_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_name?: string
          id?: string
          link_ref_code?: string | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string
          tenant_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          source: string
          tags: Json
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone: string
          source?: string
          tags?: Json
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          source?: string
          tags?: Json
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          instance_id: string | null
          last_message: string
          last_message_at: string
          status: string
          tags: Json
          tenant_id: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contact_name?: string
          contact_phone: string
          created_at?: string
          id?: string
          instance_id?: string | null
          last_message?: string
          last_message_at?: string
          status?: string
          tags?: Json
          tenant_id?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          instance_id?: string | null
          last_message?: string
          last_message_at?: string
          status?: string
          tags?: Json
          tenant_id?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_flow_sessions: {
        Row: {
          contact_name: string | null
          contact_phone: string
          created_at: string
          current_node_id: string | null
          expires_at: string | null
          flow_id: string | null
          funnel_id: string | null
          id: string
          instance_id: string | null
          last_event_at: string
          last_user_input: string | null
          status: string
          tenant_id: string
          updated_at: string
          variables: Json
          waiting_for: string | null
        }
        Insert: {
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          current_node_id?: string | null
          expires_at?: string | null
          flow_id?: string | null
          funnel_id?: string | null
          id?: string
          instance_id?: string | null
          last_event_at?: string
          last_user_input?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          variables?: Json
          waiting_for?: string | null
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          current_node_id?: string | null
          expires_at?: string | null
          flow_id?: string | null
          funnel_id?: string | null
          id?: string
          instance_id?: string | null
          last_event_at?: string
          last_user_input?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          variables?: Json
          waiting_for?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_flow_sessions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flow_sessions_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flow_sessions_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flow_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_flow_split_state: {
        Row: {
          flow_id: string
          last_index: number
          node_id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          flow_id: string
          last_index?: number
          node_id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          flow_id?: string
          last_index?: number
          node_id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_flows: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          edges: Json
          id: string
          name: string
          nodes: Json
          tenant_id: string | null
          trigger_event: string
          trigger_value: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          name: string
          nodes?: Json
          tenant_id?: string | null
          trigger_event?: string
          trigger_value?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          tenant_id?: string | null
          trigger_event?: string
          trigger_value?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_flows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_funnel_steps: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          delay_minutes: number
          funnel_id: string
          id: string
          instance_id: string | null
          label: string | null
          step_order: number
          step_type: string
          template_id: string | null
          tenant_id: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          delay_minutes?: number
          funnel_id: string
          id?: string
          instance_id?: string | null
          label?: string | null
          step_order?: number
          step_type?: string
          template_id?: string | null
          tenant_id?: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          delay_minutes?: number
          funnel_id?: string
          id?: string
          instance_id?: string | null
          label?: string | null
          step_order?: number
          step_type?: string
          template_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_funnel_steps_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_funnel_steps_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_funnel_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_funnel_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_funnels: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          tenant_id: string
          trigger_event: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          tenant_id?: string
          trigger_event?: string
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          trigger_event?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_funnels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instance_users: {
        Row: {
          can_send: boolean
          can_view: boolean
          created_at: string
          id: string
          instance_id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          can_send?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          instance_id: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          can_send?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          instance_id?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instance_users_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_instance_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          active: boolean
          api_key: string
          api_url: string
          created_at: string
          daily_limit: number
          funnel_roles: Json
          id: string
          instance_name: string
          last_message_at: string | null
          last_reset_at: string | null
          messages_sent_today: number
          name: string
          phone_number: string | null
          qr_code: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          api_key?: string
          api_url?: string
          created_at?: string
          daily_limit?: number
          funnel_roles?: Json
          id?: string
          instance_name: string
          last_message_at?: string | null
          last_reset_at?: string | null
          messages_sent_today?: number
          name?: string
          phone_number?: string | null
          qr_code?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          api_key?: string
          api_url?: string
          created_at?: string
          daily_limit?: number
          funnel_roles?: Json
          id?: string
          instance_name?: string
          last_message_at?: string | null
          last_reset_at?: string | null
          messages_sent_today?: number
          name?: string
          phone_number?: string | null
          qr_code?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_log: {
        Row: {
          contact_name: string
          contact_phone: string
          conversation_id: string | null
          created_at: string
          direction: string
          error_message: string | null
          funnel_id: string | null
          funnel_name: string | null
          id: string
          instance_id: string | null
          instance_name: string | null
          message_content: string
          status: string
          step_id: string | null
          tenant_id: string | null
        }
        Insert: {
          contact_name?: string
          contact_phone: string
          conversation_id?: string | null
          created_at?: string
          direction?: string
          error_message?: string | null
          funnel_id?: string | null
          funnel_name?: string | null
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          message_content?: string
          status?: string
          step_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          contact_name?: string
          contact_phone?: string
          conversation_id?: string | null
          created_at?: string
          direction?: string
          error_message?: string | null
          funnel_id?: string | null
          funnel_name?: string | null
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          message_content?: string
          status?: string
          step_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_log_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_log_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_log_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_funnel_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_queue: {
        Row: {
          broadcast_id: string | null
          broadcast_name: string | null
          claimed_at: string | null
          claimed_by: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          error_message: string | null
          flow_id: string | null
          funnel_id: string | null
          id: string
          idempotency_key: string | null
          instance_id: string | null
          max_retries: number
          message_content: string
          priority: number
          retry_count: number
          scheduled_at: string
          sent_at: string | null
          status: string
          step_id: string | null
          template_id: string | null
          tenant_id: string | null
          variables: Json
        }
        Insert: {
          broadcast_id?: string | null
          broadcast_name?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          contact_name?: string
          contact_phone: string
          created_at?: string
          error_message?: string | null
          flow_id?: string | null
          funnel_id?: string | null
          id?: string
          idempotency_key?: string | null
          instance_id?: string | null
          max_retries?: number
          message_content?: string
          priority?: number
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          step_id?: string | null
          template_id?: string | null
          tenant_id?: string | null
          variables?: Json
        }
        Update: {
          broadcast_id?: string | null
          broadcast_name?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          error_message?: string | null
          flow_id?: string | null
          funnel_id?: string | null
          id?: string
          idempotency_key?: string | null
          instance_id?: string | null
          max_retries?: number
          message_content?: string
          priority?: number
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          step_id?: string | null
          template_id?: string | null
          tenant_id?: string | null
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_queue_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_queue_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_queue_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_queue_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_funnel_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_number_validation: {
        Row: {
          exists_on_whatsapp: boolean
          id: string
          phone: string
          tenant_id: string | null
          validated_at: string
        }
        Insert: {
          exists_on_whatsapp?: boolean
          id?: string
          phone: string
          tenant_id?: string | null
          validated_at?: string
        }
        Update: {
          exists_on_whatsapp?: boolean
          id?: string
          phone?: string
          tenant_id?: string | null
          validated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_number_validation_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sending_config: {
        Row: {
          batch_interval_seconds: number
          batch_interval_variance: number
          created_at: string
          daily_global_limit: number
          id: string
          messages_per_batch: number
          tenant_id: string | null
          updated_at: string
          validate_numbers: boolean
          warmup_daily_increase: number
          warmup_mode: boolean
        }
        Insert: {
          batch_interval_seconds?: number
          batch_interval_variance?: number
          created_at?: string
          daily_global_limit?: number
          id?: string
          messages_per_batch?: number
          tenant_id?: string | null
          updated_at?: string
          validate_numbers?: boolean
          warmup_daily_increase?: number
          warmup_mode?: boolean
        }
        Update: {
          batch_interval_seconds?: number
          batch_interval_variance?: number
          created_at?: string
          daily_global_limit?: number
          id?: string
          messages_per_batch?: number
          tenant_id?: string | null
          updated_at?: string
          validate_numbers?: boolean
          warmup_daily_increase?: number
          warmup_mode?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sending_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_template_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_template_folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          active: boolean
          category: string
          content: string
          created_at: string
          folder_id: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
          variables: Json
        }
        Insert: {
          active?: boolean
          category?: string
          content?: string
          created_at?: string
          folder_id?: string | null
          id?: string
          name: string
          tenant_id?: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          active?: boolean
          category?: string
          content?: string
          created_at?: string
          folder_id?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_template_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_agents_public: {
        Row: {
          active: boolean | null
          color: string | null
          description: string | null
          icon: string | null
          id: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          active?: boolean | null
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      coupons_public: {
        Row: {
          active: boolean | null
          code: string | null
          created_at: string | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          expires_at: string | null
          free_shipping: boolean | null
          id: string | null
          max_uses: number | null
          min_order_value: number | null
          product_id: string | null
          starts_at: string | null
          used_count: number | null
        }
        Insert: {
          active?: boolean | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_at?: string | null
          free_shipping?: boolean | null
          id?: string | null
          max_uses?: number | null
          min_order_value?: number | null
          product_id?: string | null
          starts_at?: string | null
          used_count?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_at?: string | null
          free_shipping?: boolean | null
          id?: string | null
          max_uses?: number | null
          min_order_value?: number | null
          product_id?: string | null
          starts_at?: string | null
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors_public: {
        Row: {
          active: boolean | null
          city: string | null
          id: string | null
          name: string | null
          specialty: string | null
          state: string | null
        }
        Insert: {
          active?: boolean | null
          city?: string | null
          id?: string | null
          name?: string | null
          specialty?: string | null
          state?: string | null
        }
        Update: {
          active?: boolean | null
          city?: string | null
          id?: string | null
          name?: string | null
          specialty?: string | null
          state?: string | null
        }
        Relationships: []
      }
      products_public: {
        Row: {
          active: boolean | null
          badge: string | null
          benefits: Json | null
          countdown_duration_minutes: number | null
          countdown_end_date: string | null
          countdown_end_time: string | null
          countdown_mode: string | null
          created_at: string | null
          description: string | null
          extra_images: Json | null
          featured: boolean | null
          group_name: string | null
          gtin: string | null
          height: number | null
          id: string | null
          image_url: string | null
          length: number | null
          manufacturer: string | null
          name: string | null
          ncm: string | null
          original_price: number | null
          price: number | null
          rating: number | null
          reviews_count: number | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          short_description: string | null
          show_countdown: boolean | null
          sku: string | null
          slug: string | null
          stock: number | null
          tenant_id: string | null
          unit: string | null
          updated_at: string | null
          upsell_product_ids: Json | null
          weight: number | null
          width: number | null
        }
        Insert: {
          active?: boolean | null
          badge?: string | null
          benefits?: Json | null
          countdown_duration_minutes?: number | null
          countdown_end_date?: string | null
          countdown_end_time?: string | null
          countdown_mode?: string | null
          created_at?: string | null
          description?: string | null
          extra_images?: Json | null
          featured?: boolean | null
          group_name?: string | null
          gtin?: string | null
          height?: number | null
          id?: string | null
          image_url?: string | null
          length?: number | null
          manufacturer?: string | null
          name?: string | null
          ncm?: string | null
          original_price?: number | null
          price?: number | null
          rating?: number | null
          reviews_count?: number | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          short_description?: string | null
          show_countdown?: boolean | null
          sku?: string | null
          slug?: string | null
          stock?: number | null
          tenant_id?: string | null
          unit?: string | null
          updated_at?: string | null
          upsell_product_ids?: Json | null
          weight?: number | null
          width?: number | null
        }
        Update: {
          active?: boolean | null
          badge?: string | null
          benefits?: Json | null
          countdown_duration_minutes?: number | null
          countdown_end_date?: string | null
          countdown_end_time?: string | null
          countdown_mode?: string | null
          created_at?: string | null
          description?: string | null
          extra_images?: Json | null
          featured?: boolean | null
          group_name?: string | null
          gtin?: string | null
          height?: number | null
          id?: string | null
          image_url?: string | null
          length?: number | null
          manufacturer?: string | null
          name?: string | null
          ncm?: string | null
          original_price?: number | null
          price?: number | null
          rating?: number | null
          reviews_count?: number | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          short_description?: string | null
          show_countdown?: boolean | null
          sku?: string | null
          slug?: string | null
          stock?: number | null
          tenant_id?: string | null
          unit?: string | null
          updated_at?: string | null
          upsell_product_ids?: Json | null
          weight?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      short_links_public: {
        Row: {
          active: boolean | null
          code: string | null
          doctor_id: string | null
          id: string | null
          target_url: string | null
        }
        Insert: {
          active?: boolean | null
          code?: string | null
          doctor_id?: string | null
          id?: string | null
          target_url?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string | null
          doctor_id?: string | null
          id?: string | null
          target_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "short_links_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_links_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings_public: {
        Row: {
          address_city: string | null
          address_state: string | null
          attendant_name: string | null
          benefits_items: Json | null
          benefits_subtitle: string | null
          benefits_title: string | null
          checkout_boleto_enabled: boolean | null
          checkout_prescriber_required: boolean | null
          checkout_show_combo: boolean | null
          checkout_show_free_shipping_bar: boolean | null
          checkout_show_motivation: boolean | null
          checkout_show_recommendations: boolean | null
          checkout_show_testimonials: boolean | null
          checkout_show_urgency: boolean | null
          checkout_version: string | null
          combo_offer_discount: number | null
          combo_offer_enabled: boolean | null
          combo_offer_free_shipping: boolean | null
          combo_offer_label: string | null
          combo_offer_products: Json | null
          cta_subtitle: string | null
          cta_title: string | null
          design_bg_color: string | null
          design_bg_gradient: string | null
          design_border_style: string | null
          design_font: string | null
          design_footer_color: string | null
          design_footer_gradient: string | null
          design_footer_text_color: string | null
          design_footer_title_color: string | null
          design_icon_color: string | null
          design_icon_style: string | null
          design_nav_color: string | null
          design_text_color: string | null
          design_title_color: string | null
          display_name: string | null
          email: string | null
          facebook: string | null
          favicon_url: string | null
          free_shipping_enabled: boolean | null
          free_shipping_min_value: number | null
          free_shipping_regions: string | null
          gtm_id: string | null
          hero_badges: Json | null
          hero_btn1_bg_color: string | null
          hero_btn1_hover_color: string | null
          hero_btn2_bg_color: string | null
          hero_btn2_hover_color: string | null
          hero_button_link: string | null
          hero_button_text: string | null
          hero_button2_link: string | null
          hero_button2_text: string | null
          hero_carousel_effect: string | null
          hero_carousel_enabled: boolean | null
          hero_carousel_interval: number | null
          hero_image_url: string | null
          hero_media_type: string | null
          hero_subtitle: string | null
          hero_title: string | null
          hero_video_url: string | null
          hide_chat_on_checkout: boolean | null
          horizontal_logo_url: string | null
          hotjar_id: string | null
          id: string | null
          instagram: string | null
          logo_url: string | null
          mailing_bg_color: string | null
          mailing_button_color: string | null
          mailing_text_color: string | null
          mailing_title_color: string | null
          max_installments: number | null
          max_total_installments: number | null
          meta_pixel_id: string | null
          notification_bar_bg_color: string | null
          notification_bar_enabled: boolean | null
          notification_bar_text: string | null
          notification_bar_text_color: string | null
          popup_banner_collect_email: boolean | null
          popup_banner_cta_text: string | null
          popup_banner_delay_seconds: number | null
          popup_banner_description: string | null
          popup_banner_enabled: boolean | null
          popup_banner_image_url: string | null
          popup_banner_reappear_hours: number | null
          popup_banner_title: string | null
          products_sidebar_enabled: boolean | null
          sales_popup_burst_count: number | null
          sales_popup_button_color: string | null
          sales_popup_custom_entries: Json | null
          sales_popup_enabled: boolean | null
          sales_popup_include_real_orders: boolean | null
          sales_popup_interval_max: number | null
          sales_popup_interval_min: number | null
          sales_popup_position: string | null
          section_benefits_visible: boolean | null
          section_featured_visible: boolean | null
          section_guarantee_visible: boolean | null
          section_hero_visible: boolean | null
          section_instagram_visible: boolean | null
          section_mailing_visible: boolean | null
          section_order: Json | null
          section_products_visible: boolean | null
          section_promo_banners_visible: boolean | null
          section_testimonials_visible: boolean | null
          section_trust_badges_visible: boolean | null
          store_name: string | null
          tenant_id: string | null
          tiktok: string | null
          visual_theme: string | null
          webchat_delay_seconds: number | null
          webchat_enabled: boolean | null
          webchat_position: string | null
          webchat_script: string | null
          webchat_show_on_scroll: boolean | null
          whatsapp: string | null
          whatsapp_button_enabled: boolean | null
          whatsapp_button_message: string | null
          whatsapp_button_name: string | null
          whatsapp_delay_seconds: number | null
          whatsapp_position: string | null
          whatsapp_show_on_scroll: boolean | null
          whatsapp_support: string | null
          youtube: string | null
        }
        Insert: {
          address_city?: string | null
          address_state?: string | null
          attendant_name?: string | null
          benefits_items?: Json | null
          benefits_subtitle?: string | null
          benefits_title?: string | null
          checkout_boleto_enabled?: boolean | null
          checkout_prescriber_required?: boolean | null
          checkout_show_combo?: boolean | null
          checkout_show_free_shipping_bar?: boolean | null
          checkout_show_motivation?: boolean | null
          checkout_show_recommendations?: boolean | null
          checkout_show_testimonials?: boolean | null
          checkout_show_urgency?: boolean | null
          checkout_version?: string | null
          combo_offer_discount?: number | null
          combo_offer_enabled?: boolean | null
          combo_offer_free_shipping?: boolean | null
          combo_offer_label?: string | null
          combo_offer_products?: Json | null
          cta_subtitle?: string | null
          cta_title?: string | null
          design_bg_color?: string | null
          design_bg_gradient?: string | null
          design_border_style?: string | null
          design_font?: string | null
          design_footer_color?: string | null
          design_footer_gradient?: string | null
          design_footer_text_color?: string | null
          design_footer_title_color?: string | null
          design_icon_color?: string | null
          design_icon_style?: string | null
          design_nav_color?: string | null
          design_text_color?: string | null
          design_title_color?: string | null
          display_name?: string | null
          email?: string | null
          facebook?: string | null
          favicon_url?: string | null
          free_shipping_enabled?: boolean | null
          free_shipping_min_value?: number | null
          free_shipping_regions?: string | null
          gtm_id?: string | null
          hero_badges?: Json | null
          hero_btn1_bg_color?: string | null
          hero_btn1_hover_color?: string | null
          hero_btn2_bg_color?: string | null
          hero_btn2_hover_color?: string | null
          hero_button_link?: string | null
          hero_button_text?: string | null
          hero_button2_link?: string | null
          hero_button2_text?: string | null
          hero_carousel_effect?: string | null
          hero_carousel_enabled?: boolean | null
          hero_carousel_interval?: number | null
          hero_image_url?: string | null
          hero_media_type?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hero_video_url?: string | null
          hide_chat_on_checkout?: boolean | null
          horizontal_logo_url?: string | null
          hotjar_id?: string | null
          id?: string | null
          instagram?: string | null
          logo_url?: string | null
          mailing_bg_color?: string | null
          mailing_button_color?: string | null
          mailing_text_color?: string | null
          mailing_title_color?: string | null
          max_installments?: number | null
          max_total_installments?: number | null
          meta_pixel_id?: string | null
          notification_bar_bg_color?: string | null
          notification_bar_enabled?: boolean | null
          notification_bar_text?: string | null
          notification_bar_text_color?: string | null
          popup_banner_collect_email?: boolean | null
          popup_banner_cta_text?: string | null
          popup_banner_delay_seconds?: number | null
          popup_banner_description?: string | null
          popup_banner_enabled?: boolean | null
          popup_banner_image_url?: string | null
          popup_banner_reappear_hours?: number | null
          popup_banner_title?: string | null
          products_sidebar_enabled?: boolean | null
          sales_popup_burst_count?: number | null
          sales_popup_button_color?: string | null
          sales_popup_custom_entries?: Json | null
          sales_popup_enabled?: boolean | null
          sales_popup_include_real_orders?: boolean | null
          sales_popup_interval_max?: number | null
          sales_popup_interval_min?: number | null
          sales_popup_position?: string | null
          section_benefits_visible?: boolean | null
          section_featured_visible?: boolean | null
          section_guarantee_visible?: boolean | null
          section_hero_visible?: boolean | null
          section_instagram_visible?: boolean | null
          section_mailing_visible?: boolean | null
          section_order?: Json | null
          section_products_visible?: boolean | null
          section_promo_banners_visible?: boolean | null
          section_testimonials_visible?: boolean | null
          section_trust_badges_visible?: boolean | null
          store_name?: string | null
          tenant_id?: string | null
          tiktok?: string | null
          visual_theme?: string | null
          webchat_delay_seconds?: number | null
          webchat_enabled?: boolean | null
          webchat_position?: string | null
          webchat_script?: string | null
          webchat_show_on_scroll?: boolean | null
          whatsapp?: string | null
          whatsapp_button_enabled?: boolean | null
          whatsapp_button_message?: string | null
          whatsapp_button_name?: string | null
          whatsapp_delay_seconds?: number | null
          whatsapp_position?: string | null
          whatsapp_show_on_scroll?: boolean | null
          whatsapp_support?: string | null
          youtube?: string | null
        }
        Update: {
          address_city?: string | null
          address_state?: string | null
          attendant_name?: string | null
          benefits_items?: Json | null
          benefits_subtitle?: string | null
          benefits_title?: string | null
          checkout_boleto_enabled?: boolean | null
          checkout_prescriber_required?: boolean | null
          checkout_show_combo?: boolean | null
          checkout_show_free_shipping_bar?: boolean | null
          checkout_show_motivation?: boolean | null
          checkout_show_recommendations?: boolean | null
          checkout_show_testimonials?: boolean | null
          checkout_show_urgency?: boolean | null
          checkout_version?: string | null
          combo_offer_discount?: number | null
          combo_offer_enabled?: boolean | null
          combo_offer_free_shipping?: boolean | null
          combo_offer_label?: string | null
          combo_offer_products?: Json | null
          cta_subtitle?: string | null
          cta_title?: string | null
          design_bg_color?: string | null
          design_bg_gradient?: string | null
          design_border_style?: string | null
          design_font?: string | null
          design_footer_color?: string | null
          design_footer_gradient?: string | null
          design_footer_text_color?: string | null
          design_footer_title_color?: string | null
          design_icon_color?: string | null
          design_icon_style?: string | null
          design_nav_color?: string | null
          design_text_color?: string | null
          design_title_color?: string | null
          display_name?: string | null
          email?: string | null
          facebook?: string | null
          favicon_url?: string | null
          free_shipping_enabled?: boolean | null
          free_shipping_min_value?: number | null
          free_shipping_regions?: string | null
          gtm_id?: string | null
          hero_badges?: Json | null
          hero_btn1_bg_color?: string | null
          hero_btn1_hover_color?: string | null
          hero_btn2_bg_color?: string | null
          hero_btn2_hover_color?: string | null
          hero_button_link?: string | null
          hero_button_text?: string | null
          hero_button2_link?: string | null
          hero_button2_text?: string | null
          hero_carousel_effect?: string | null
          hero_carousel_enabled?: boolean | null
          hero_carousel_interval?: number | null
          hero_image_url?: string | null
          hero_media_type?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hero_video_url?: string | null
          hide_chat_on_checkout?: boolean | null
          horizontal_logo_url?: string | null
          hotjar_id?: string | null
          id?: string | null
          instagram?: string | null
          logo_url?: string | null
          mailing_bg_color?: string | null
          mailing_button_color?: string | null
          mailing_text_color?: string | null
          mailing_title_color?: string | null
          max_installments?: number | null
          max_total_installments?: number | null
          meta_pixel_id?: string | null
          notification_bar_bg_color?: string | null
          notification_bar_enabled?: boolean | null
          notification_bar_text?: string | null
          notification_bar_text_color?: string | null
          popup_banner_collect_email?: boolean | null
          popup_banner_cta_text?: string | null
          popup_banner_delay_seconds?: number | null
          popup_banner_description?: string | null
          popup_banner_enabled?: boolean | null
          popup_banner_image_url?: string | null
          popup_banner_reappear_hours?: number | null
          popup_banner_title?: string | null
          products_sidebar_enabled?: boolean | null
          sales_popup_burst_count?: number | null
          sales_popup_button_color?: string | null
          sales_popup_custom_entries?: Json | null
          sales_popup_enabled?: boolean | null
          sales_popup_include_real_orders?: boolean | null
          sales_popup_interval_max?: number | null
          sales_popup_interval_min?: number | null
          sales_popup_position?: string | null
          section_benefits_visible?: boolean | null
          section_featured_visible?: boolean | null
          section_guarantee_visible?: boolean | null
          section_hero_visible?: boolean | null
          section_instagram_visible?: boolean | null
          section_mailing_visible?: boolean | null
          section_order?: Json | null
          section_products_visible?: boolean | null
          section_promo_banners_visible?: boolean | null
          section_testimonials_visible?: boolean | null
          section_trust_badges_visible?: boolean | null
          store_name?: string | null
          tenant_id?: string | null
          tiktok?: string | null
          visual_theme?: string | null
          webchat_delay_seconds?: number | null
          webchat_enabled?: boolean | null
          webchat_position?: string | null
          webchat_script?: string | null
          webchat_show_on_scroll?: boolean | null
          whatsapp?: string | null
          whatsapp_button_enabled?: boolean | null
          whatsapp_button_message?: string | null
          whatsapp_button_name?: string | null
          whatsapp_delay_seconds?: number | null
          whatsapp_position?: string | null
          whatsapp_show_on_scroll?: boolean | null
          whatsapp_support?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings_safe: {
        Row: {
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          attendant_name: string | null
          benefits_items: Json | null
          benefits_subtitle: string | null
          benefits_title: string | null
          checkout_boleto_enabled: boolean | null
          checkout_show_combo: boolean | null
          checkout_show_free_shipping_bar: boolean | null
          checkout_show_motivation: boolean | null
          checkout_show_recommendations: boolean | null
          checkout_show_testimonials: boolean | null
          checkout_show_urgency: boolean | null
          checkout_version: string | null
          cnpj: string | null
          combo_offer_discount: number | null
          combo_offer_enabled: boolean | null
          combo_offer_free_shipping: boolean | null
          combo_offer_label: string | null
          combo_offer_products: Json | null
          created_at: string | null
          cta_subtitle: string | null
          cta_title: string | null
          design_bg_color: string | null
          design_bg_gradient: string | null
          design_border_style: string | null
          design_font: string | null
          design_footer_color: string | null
          design_footer_gradient: string | null
          design_footer_text_color: string | null
          design_footer_title_color: string | null
          design_icon_color: string | null
          design_icon_style: string | null
          design_nav_color: string | null
          design_text_color: string | null
          design_title_color: string | null
          display_name: string | null
          email: string | null
          facebook: string | null
          favicon_url: string | null
          feedback_bonus_coupon_id: string | null
          free_shipping_enabled: boolean | null
          free_shipping_min_value: number | null
          free_shipping_regions: string | null
          goal_cart_recovery: number | null
          goal_conversion_rate: number | null
          goal_ltv: number | null
          goal_monthly_revenue: number | null
          goal_profit_margin: number | null
          goal_upsell: number | null
          hero_badges: Json | null
          hero_btn1_bg_color: string | null
          hero_btn1_hover_color: string | null
          hero_btn2_bg_color: string | null
          hero_btn2_hover_color: string | null
          hero_button_link: string | null
          hero_button_text: string | null
          hero_button2_link: string | null
          hero_button2_text: string | null
          hero_carousel_effect: string | null
          hero_carousel_enabled: boolean | null
          hero_carousel_interval: number | null
          hero_image_url: string | null
          hero_media_type: string | null
          hero_subtitle: string | null
          hero_title: string | null
          hero_video_url: string | null
          hide_chat_on_checkout: boolean | null
          horizontal_logo_url: string | null
          id: string | null
          instagram: string | null
          logo_url: string | null
          mailing_bg_color: string | null
          mailing_button_color: string | null
          mailing_text_color: string | null
          mailing_title_color: string | null
          max_installments: number | null
          max_total_installments: number | null
          notification_bar_bg_color: string | null
          notification_bar_enabled: boolean | null
          notification_bar_text: string | null
          notification_bar_text_color: string | null
          popup_banner_collect_email: boolean | null
          popup_banner_cta_text: string | null
          popup_banner_delay_seconds: number | null
          popup_banner_description: string | null
          popup_banner_enabled: boolean | null
          popup_banner_image_url: string | null
          popup_banner_title: string | null
          sales_popup_burst_count: number | null
          sales_popup_button_color: string | null
          sales_popup_custom_entries: Json | null
          sales_popup_enabled: boolean | null
          sales_popup_include_real_orders: boolean | null
          sales_popup_interval_max: number | null
          sales_popup_interval_min: number | null
          sales_popup_position: string | null
          section_benefits_visible: boolean | null
          section_featured_visible: boolean | null
          section_guarantee_visible: boolean | null
          section_hero_visible: boolean | null
          section_instagram_visible: boolean | null
          section_mailing_visible: boolean | null
          section_order: Json | null
          section_products_visible: boolean | null
          section_promo_banners_visible: boolean | null
          section_testimonials_visible: boolean | null
          section_trust_badges_visible: boolean | null
          store_name: string | null
          tenant_id: string | null
          tiktok: string | null
          updated_at: string | null
          visual_theme: string | null
          webchat_delay_seconds: number | null
          webchat_enabled: boolean | null
          webchat_position: string | null
          webchat_show_on_scroll: boolean | null
          whatsapp: string | null
          whatsapp_button_enabled: boolean | null
          whatsapp_button_message: string | null
          whatsapp_button_name: string | null
          whatsapp_delay_seconds: number | null
          whatsapp_position: string | null
          whatsapp_show_on_scroll: boolean | null
          whatsapp_support: string | null
          youtube: string | null
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          attendant_name?: string | null
          benefits_items?: Json | null
          benefits_subtitle?: string | null
          benefits_title?: string | null
          checkout_boleto_enabled?: boolean | null
          checkout_show_combo?: boolean | null
          checkout_show_free_shipping_bar?: boolean | null
          checkout_show_motivation?: boolean | null
          checkout_show_recommendations?: boolean | null
          checkout_show_testimonials?: boolean | null
          checkout_show_urgency?: boolean | null
          checkout_version?: string | null
          cnpj?: string | null
          combo_offer_discount?: number | null
          combo_offer_enabled?: boolean | null
          combo_offer_free_shipping?: boolean | null
          combo_offer_label?: string | null
          combo_offer_products?: Json | null
          created_at?: string | null
          cta_subtitle?: string | null
          cta_title?: string | null
          design_bg_color?: string | null
          design_bg_gradient?: string | null
          design_border_style?: string | null
          design_font?: string | null
          design_footer_color?: string | null
          design_footer_gradient?: string | null
          design_footer_text_color?: string | null
          design_footer_title_color?: string | null
          design_icon_color?: string | null
          design_icon_style?: string | null
          design_nav_color?: string | null
          design_text_color?: string | null
          design_title_color?: string | null
          display_name?: string | null
          email?: string | null
          facebook?: string | null
          favicon_url?: string | null
          feedback_bonus_coupon_id?: string | null
          free_shipping_enabled?: boolean | null
          free_shipping_min_value?: number | null
          free_shipping_regions?: string | null
          goal_cart_recovery?: number | null
          goal_conversion_rate?: number | null
          goal_ltv?: number | null
          goal_monthly_revenue?: number | null
          goal_profit_margin?: number | null
          goal_upsell?: number | null
          hero_badges?: Json | null
          hero_btn1_bg_color?: string | null
          hero_btn1_hover_color?: string | null
          hero_btn2_bg_color?: string | null
          hero_btn2_hover_color?: string | null
          hero_button_link?: string | null
          hero_button_text?: string | null
          hero_button2_link?: string | null
          hero_button2_text?: string | null
          hero_carousel_effect?: string | null
          hero_carousel_enabled?: boolean | null
          hero_carousel_interval?: number | null
          hero_image_url?: string | null
          hero_media_type?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hero_video_url?: string | null
          hide_chat_on_checkout?: boolean | null
          horizontal_logo_url?: string | null
          id?: string | null
          instagram?: string | null
          logo_url?: string | null
          mailing_bg_color?: string | null
          mailing_button_color?: string | null
          mailing_text_color?: string | null
          mailing_title_color?: string | null
          max_installments?: number | null
          max_total_installments?: number | null
          notification_bar_bg_color?: string | null
          notification_bar_enabled?: boolean | null
          notification_bar_text?: string | null
          notification_bar_text_color?: string | null
          popup_banner_collect_email?: boolean | null
          popup_banner_cta_text?: string | null
          popup_banner_delay_seconds?: number | null
          popup_banner_description?: string | null
          popup_banner_enabled?: boolean | null
          popup_banner_image_url?: string | null
          popup_banner_title?: string | null
          sales_popup_burst_count?: number | null
          sales_popup_button_color?: string | null
          sales_popup_custom_entries?: Json | null
          sales_popup_enabled?: boolean | null
          sales_popup_include_real_orders?: boolean | null
          sales_popup_interval_max?: number | null
          sales_popup_interval_min?: number | null
          sales_popup_position?: string | null
          section_benefits_visible?: boolean | null
          section_featured_visible?: boolean | null
          section_guarantee_visible?: boolean | null
          section_hero_visible?: boolean | null
          section_instagram_visible?: boolean | null
          section_mailing_visible?: boolean | null
          section_order?: Json | null
          section_products_visible?: boolean | null
          section_promo_banners_visible?: boolean | null
          section_testimonials_visible?: boolean | null
          section_trust_badges_visible?: boolean | null
          store_name?: string | null
          tenant_id?: string | null
          tiktok?: string | null
          updated_at?: string | null
          visual_theme?: string | null
          webchat_delay_seconds?: number | null
          webchat_enabled?: boolean | null
          webchat_position?: string | null
          webchat_show_on_scroll?: boolean | null
          whatsapp?: string | null
          whatsapp_button_enabled?: boolean | null
          whatsapp_button_message?: string | null
          whatsapp_button_name?: string | null
          whatsapp_delay_seconds?: number | null
          whatsapp_position?: string | null
          whatsapp_show_on_scroll?: boolean | null
          whatsapp_support?: string | null
          youtube?: string | null
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          attendant_name?: string | null
          benefits_items?: Json | null
          benefits_subtitle?: string | null
          benefits_title?: string | null
          checkout_boleto_enabled?: boolean | null
          checkout_show_combo?: boolean | null
          checkout_show_free_shipping_bar?: boolean | null
          checkout_show_motivation?: boolean | null
          checkout_show_recommendations?: boolean | null
          checkout_show_testimonials?: boolean | null
          checkout_show_urgency?: boolean | null
          checkout_version?: string | null
          cnpj?: string | null
          combo_offer_discount?: number | null
          combo_offer_enabled?: boolean | null
          combo_offer_free_shipping?: boolean | null
          combo_offer_label?: string | null
          combo_offer_products?: Json | null
          created_at?: string | null
          cta_subtitle?: string | null
          cta_title?: string | null
          design_bg_color?: string | null
          design_bg_gradient?: string | null
          design_border_style?: string | null
          design_font?: string | null
          design_footer_color?: string | null
          design_footer_gradient?: string | null
          design_footer_text_color?: string | null
          design_footer_title_color?: string | null
          design_icon_color?: string | null
          design_icon_style?: string | null
          design_nav_color?: string | null
          design_text_color?: string | null
          design_title_color?: string | null
          display_name?: string | null
          email?: string | null
          facebook?: string | null
          favicon_url?: string | null
          feedback_bonus_coupon_id?: string | null
          free_shipping_enabled?: boolean | null
          free_shipping_min_value?: number | null
          free_shipping_regions?: string | null
          goal_cart_recovery?: number | null
          goal_conversion_rate?: number | null
          goal_ltv?: number | null
          goal_monthly_revenue?: number | null
          goal_profit_margin?: number | null
          goal_upsell?: number | null
          hero_badges?: Json | null
          hero_btn1_bg_color?: string | null
          hero_btn1_hover_color?: string | null
          hero_btn2_bg_color?: string | null
          hero_btn2_hover_color?: string | null
          hero_button_link?: string | null
          hero_button_text?: string | null
          hero_button2_link?: string | null
          hero_button2_text?: string | null
          hero_carousel_effect?: string | null
          hero_carousel_enabled?: boolean | null
          hero_carousel_interval?: number | null
          hero_image_url?: string | null
          hero_media_type?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hero_video_url?: string | null
          hide_chat_on_checkout?: boolean | null
          horizontal_logo_url?: string | null
          id?: string | null
          instagram?: string | null
          logo_url?: string | null
          mailing_bg_color?: string | null
          mailing_button_color?: string | null
          mailing_text_color?: string | null
          mailing_title_color?: string | null
          max_installments?: number | null
          max_total_installments?: number | null
          notification_bar_bg_color?: string | null
          notification_bar_enabled?: boolean | null
          notification_bar_text?: string | null
          notification_bar_text_color?: string | null
          popup_banner_collect_email?: boolean | null
          popup_banner_cta_text?: string | null
          popup_banner_delay_seconds?: number | null
          popup_banner_description?: string | null
          popup_banner_enabled?: boolean | null
          popup_banner_image_url?: string | null
          popup_banner_title?: string | null
          sales_popup_burst_count?: number | null
          sales_popup_button_color?: string | null
          sales_popup_custom_entries?: Json | null
          sales_popup_enabled?: boolean | null
          sales_popup_include_real_orders?: boolean | null
          sales_popup_interval_max?: number | null
          sales_popup_interval_min?: number | null
          sales_popup_position?: string | null
          section_benefits_visible?: boolean | null
          section_featured_visible?: boolean | null
          section_guarantee_visible?: boolean | null
          section_hero_visible?: boolean | null
          section_instagram_visible?: boolean | null
          section_mailing_visible?: boolean | null
          section_order?: Json | null
          section_products_visible?: boolean | null
          section_promo_banners_visible?: boolean | null
          section_testimonials_visible?: boolean | null
          section_trust_badges_visible?: boolean | null
          store_name?: string | null
          tenant_id?: string | null
          tiktok?: string | null
          updated_at?: string | null
          visual_theme?: string | null
          webchat_delay_seconds?: number | null
          webchat_enabled?: boolean | null
          webchat_position?: string | null
          webchat_show_on_scroll?: boolean | null
          whatsapp?: string | null
          whatsapp_button_enabled?: boolean | null
          whatsapp_button_message?: string | null
          whatsapp_button_name?: string | null
          whatsapp_delay_seconds?: number | null
          whatsapp_position?: string | null
          whatsapp_show_on_scroll?: boolean | null
          whatsapp_support?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_feedback_bonus_coupon_id_fkey"
            columns: ["feedback_bonus_coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_settings_feedback_bonus_coupon_id_fkey"
            columns: ["feedback_bonus_coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      advance_flow_session_with_input: {
        Args: {
          _contact_phone: string
          _instance_id: string
          _user_input: string
        }
        Returns: string
      }
      claim_flow_sessions: {
        Args: { _batch_size?: number; _worker_id: string }
        Returns: {
          contact_name: string | null
          contact_phone: string
          created_at: string
          current_node_id: string | null
          expires_at: string | null
          flow_id: string | null
          funnel_id: string | null
          id: string
          instance_id: string | null
          last_event_at: string
          last_user_input: string | null
          status: string
          tenant_id: string
          updated_at: string
          variables: Json
          waiting_for: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "whatsapp_flow_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_whatsapp_messages: {
        Args: { _batch_size?: number; _tenant_id?: string; _worker_id: string }
        Returns: {
          broadcast_id: string | null
          broadcast_name: string | null
          claimed_at: string | null
          claimed_by: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          error_message: string | null
          flow_id: string | null
          funnel_id: string | null
          id: string
          idempotency_key: string | null
          instance_id: string | null
          max_retries: number
          message_content: string
          priority: number
          retry_count: number
          scheduled_at: string
          sent_at: string | null
          status: string
          step_id: string | null
          template_id: string | null
          tenant_id: string | null
          variables: Json
        }[]
        SetofOptions: {
          from: "*"
          to: "whatsapp_message_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      current_tenant_id: { Args: never; Returns: string }
      expire_flow_sessions: { Args: never; Returns: number }
      get_active_representatives_public: {
        Args: never
        Returns: {
          id: string
          name: string
          short_code: string
        }[]
      }
      get_doctor_id: { Args: never; Returns: string }
      get_representative_id: { Args: never; Returns: string }
      get_user_tenant_ids: { Args: never; Returns: string[] }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_link_clicks: { Args: { link_id: string }; Returns: undefined }
      increment_link_conversions: {
        Args: { link_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: { uid?: string }; Returns: boolean }
      is_tenant_staff: { Args: { _tenant_id: string }; Returns: boolean }
      is_valid_active_tenant: { Args: { _tenant_id: string }; Returns: boolean }
      rescue_stuck_whatsapp_messages: {
        Args: { _stuck_minutes?: number }
        Returns: number
      }
      user_belongs_to_tenant: { Args: { tid: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "representative"
        | "prescriber"
        | "super_admin"
        | "suporte"
        | "administrador"
        | "gestor"
        | "financeiro"
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
        "representative",
        "prescriber",
        "super_admin",
        "suporte",
        "administrador",
        "gestor",
        "financeiro",
      ],
    },
  },
} as const
