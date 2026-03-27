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
          cart_total: number
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          ghl_synced: boolean
          id: string
          items: Json
          recovered_at: string | null
          shipping_cep: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cart_total?: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          ghl_synced?: boolean
          id?: string
          items?: Json
          recovered_at?: string | null
          shipping_cep?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cart_total?: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          ghl_synced?: boolean
          id?: string
          items?: Json
          recovered_at?: string | null
          shipping_cep?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: []
      }
      ai_agents: {
        Row: {
          active: boolean
          channels: Json
          color: string
          created_at: string
          description: string
          icon: string
          id: string
          model: string
          name: string
          slug: string
          system_prompt: string
          temperature: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          channels?: Json
          color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          model?: string
          name: string
          slug: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          channels?: Json
          color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          model?: string
          name?: string
          slug?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      bling_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "coupons_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
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
        }
        Insert: {
          created_at?: string
          customer_email: string
          id?: string
          tag: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          id?: string
          tag?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          active: boolean
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
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      integration_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          integration: string
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          integration: string
          status?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          integration?: string
          status?: string
        }
        Relationships: []
      }
      link_clicks: {
        Row: {
          clicked_at: string
          device_type: string | null
          id: string
          referrer: string | null
          short_link_id: string
        }
        Insert: {
          clicked_at?: string
          device_type?: string | null
          id?: string
          referrer?: string | null
          short_link_id: string
        }
        Update: {
          clicked_at?: string
          device_type?: string | null
          id?: string
          referrer?: string | null
          short_link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_short_link_id_fkey"
            columns: ["short_link_id"]
            isOneToOne: false
            referencedRelation: "short_links"
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
        }
        Insert: {
          converted_at?: string
          id?: string
          order_id?: string | null
          order_total?: number
          short_link_id: string
        }
        Update: {
          converted_at?: string
          id?: string
          order_id?: string | null
          order_total?: number
          short_link_id?: string
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
        ]
      }
      manufacturers: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
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
      popup_leads: {
        Row: {
          created_at: string | null
          email: string
          ghl_synced: boolean | null
          id: string
          name: string | null
          phone: string | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          ghl_synced?: boolean | null
          id?: string
          name?: string | null
          phone?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          ghl_synced?: boolean | null
          id?: string
          name?: string | null
          phone?: string | null
          source?: string | null
        }
        Relationships: []
      }
      product_faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          product_id: string
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          product_id: string
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          product_id?: string
          question?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_faqs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_groups: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_testimonials: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          product_id: string
          rating: number
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          id?: string
          product_id: string
          rating?: number
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_testimonials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          badge: string | null
          benefits: Json
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
          weight: number
          width: number
        }
        Insert: {
          active?: boolean
          badge?: string | null
          benefits?: Json
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
          weight?: number
          width?: number
        }
        Update: {
          active?: boolean
          badge?: string | null
          benefits?: Json
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
      short_links: {
        Row: {
          active: boolean
          clicks_count: number
          code: string
          conversions_count: number
          created_at: string
          id: string
          product_id: string | null
          target_url: string
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
          id?: string
          product_id?: string | null
          target_url: string
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
          id?: string
          product_id?: string | null
          target_url?: string
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "short_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          slug: string
          title?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          benefits_items: Json
          benefits_subtitle: string
          benefits_title: string
          checkout_boleto_enabled: boolean | null
          checkout_show_combo: boolean | null
          checkout_show_free_shipping_bar: boolean | null
          checkout_show_motivation: boolean | null
          checkout_show_recommendations: boolean | null
          checkout_show_testimonials: boolean | null
          checkout_show_urgency: boolean | null
          cnpj: string | null
          combo_offer_discount: number
          combo_offer_enabled: boolean
          combo_offer_free_shipping: boolean
          combo_offer_label: string
          combo_offer_products: Json
          created_at: string
          design_bg_color: string | null
          design_bg_gradient: string | null
          design_font: string | null
          design_footer_color: string | null
          design_footer_gradient: string | null
          design_icon_color: string | null
          design_icon_style: string | null
          design_nav_color: string | null
          design_text_color: string | null
          design_title_color: string | null
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
          id: string
          instagram: string | null
          logo_url: string | null
          max_installments: number
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
          popup_banner_title: string | null
          sales_popup_burst_count: number | null
          sales_popup_button_color: string | null
          sales_popup_custom_entries: Json | null
          sales_popup_enabled: boolean | null
          sales_popup_include_real_orders: boolean | null
          sales_popup_interval_max: number | null
          sales_popup_interval_min: number | null
          sales_popup_position: string | null
          store_name: string
          tenant_id: string | null
          tiktok: string | null
          updated_at: string
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
          benefits_items?: Json
          benefits_subtitle?: string
          benefits_title?: string
          checkout_boleto_enabled?: boolean | null
          checkout_show_combo?: boolean | null
          checkout_show_free_shipping_bar?: boolean | null
          checkout_show_motivation?: boolean | null
          checkout_show_recommendations?: boolean | null
          checkout_show_testimonials?: boolean | null
          checkout_show_urgency?: boolean | null
          cnpj?: string | null
          combo_offer_discount?: number
          combo_offer_enabled?: boolean
          combo_offer_free_shipping?: boolean
          combo_offer_label?: string
          combo_offer_products?: Json
          created_at?: string
          design_bg_color?: string | null
          design_bg_gradient?: string | null
          design_font?: string | null
          design_footer_color?: string | null
          design_footer_gradient?: string | null
          design_icon_color?: string | null
          design_icon_style?: string | null
          design_nav_color?: string | null
          design_text_color?: string | null
          design_title_color?: string | null
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
          id?: string
          instagram?: string | null
          logo_url?: string | null
          max_installments?: number
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
          popup_banner_title?: string | null
          sales_popup_burst_count?: number | null
          sales_popup_button_color?: string | null
          sales_popup_custom_entries?: Json | null
          sales_popup_enabled?: boolean | null
          sales_popup_include_real_orders?: boolean | null
          sales_popup_interval_max?: number | null
          sales_popup_interval_min?: number | null
          sales_popup_position?: string | null
          store_name?: string
          tenant_id?: string | null
          tiktok?: string | null
          updated_at?: string
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
          benefits_items?: Json
          benefits_subtitle?: string
          benefits_title?: string
          checkout_boleto_enabled?: boolean | null
          checkout_show_combo?: boolean | null
          checkout_show_free_shipping_bar?: boolean | null
          checkout_show_motivation?: boolean | null
          checkout_show_recommendations?: boolean | null
          checkout_show_testimonials?: boolean | null
          checkout_show_urgency?: boolean | null
          cnpj?: string | null
          combo_offer_discount?: number
          combo_offer_enabled?: boolean
          combo_offer_free_shipping?: boolean
          combo_offer_label?: string
          combo_offer_products?: Json
          created_at?: string
          design_bg_color?: string | null
          design_bg_gradient?: string | null
          design_font?: string | null
          design_footer_color?: string | null
          design_footer_gradient?: string | null
          design_icon_color?: string | null
          design_icon_style?: string | null
          design_nav_color?: string | null
          design_text_color?: string | null
          design_title_color?: string | null
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
          id?: string
          instagram?: string | null
          logo_url?: string | null
          max_installments?: number
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
          popup_banner_title?: string | null
          sales_popup_burst_count?: number | null
          sales_popup_button_color?: string | null
          sales_popup_custom_entries?: Json | null
          sales_popup_enabled?: boolean | null
          sales_popup_include_real_orders?: boolean | null
          sales_popup_interval_max?: number | null
          sales_popup_interval_min?: number | null
          sales_popup_position?: string | null
          store_name?: string
          tenant_id?: string | null
          tiktok?: string | null
          updated_at?: string
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
      tenant_users: {
        Row: {
          created_at: string | null
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
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
          created_at: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
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
    }
    Views: {
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
    }
    Functions: {
      get_doctor_id: { Args: never; Returns: string }
      get_representative_id: { Args: never; Returns: string }
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
