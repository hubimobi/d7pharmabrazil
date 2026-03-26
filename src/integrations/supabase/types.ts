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
          representative_id: string
          status: string
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
          representative_id: string
          status?: string
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
          representative_id?: string
          status?: string
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
          expires_at: string | null
          free_shipping: boolean
          id: string
          max_uses: number | null
          min_order_value: number | null
          product_id: string | null
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
          expires_at?: string | null
          free_shipping?: boolean
          id?: string
          max_uses?: number | null
          min_order_value?: number | null
          product_id?: string | null
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
          expires_at?: string | null
          free_shipping?: boolean
          id?: string
          max_uses?: number | null
          min_order_value?: number | null
          product_id?: string | null
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          active: boolean
          city: string | null
          created_at: string
          crm: string | null
          id: string
          name: string
          representative_id: string
          specialty: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          created_at?: string
          crm?: string | null
          id?: string
          name: string
          representative_id: string
          specialty?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          city?: string | null
          created_at?: string
          crm?: string | null
          id?: string
          name?: string
          representative_id?: string
          specialty?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
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
          total: number
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          asaas_payment_id?: string | null
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
          total?: number
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          asaas_payment_id?: string | null
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
          short_description: string
          show_countdown: boolean
          sku: string | null
          slug: string
          stock: number
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
          short_description?: string
          show_countdown?: boolean
          sku?: string | null
          slug: string
          stock?: number
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
          short_description?: string
          show_countdown?: boolean
          sku?: string | null
          slug?: string
          stock?: number
          unit?: string
          updated_at?: string
          weight?: number
          width?: number
        }
        Relationships: []
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
          region: string | null
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
          region?: string | null
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
          region?: string | null
          updated_at?: string
          user_id?: string | null
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
          cnpj: string | null
          created_at: string
          email: string | null
          facebook: string | null
          favicon_url: string | null
          hero_button_link: string | null
          hero_button_text: string | null
          hero_button2_link: string | null
          hero_button2_text: string | null
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          store_name: string
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
          cnpj?: string | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          favicon_url?: string | null
          hero_button_link?: string | null
          hero_button_text?: string | null
          hero_button2_link?: string | null
          hero_button2_text?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          store_name?: string
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
          cnpj?: string | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          favicon_url?: string | null
          hero_button_link?: string | null
          hero_button_text?: string | null
          hero_button2_link?: string | null
          hero_button2_text?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          store_name?: string
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
      [_ in never]: never
    }
    Functions: {
      get_representative_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "representative"
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
      app_role: ["admin", "representative"],
    },
  },
} as const
