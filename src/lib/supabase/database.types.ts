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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      menu_experience_settings: {
        Row: { restaurant_id: string; section_order: string[]; enabled_sections: string[]; featured_product_ids: string[] }
        Insert: { restaurant_id: string; section_order?: string[]; enabled_sections?: string[]; featured_product_ids?: string[] }
        Update: { restaurant_id?: string; section_order?: string[]; enabled_sections?: string[]; featured_product_ids?: string[] }
        Relationships: [{ foreignKeyName: "menu_experience_settings_restaurant_id_fkey"; columns: ["restaurant_id"]; isOneToOne: true; referencedRelation: "restaurants"; referencedColumns: ["id"] }]
      }
      addon_groups: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          max_select: number
          min_select: number
          name: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_select?: number
          min_select?: number
          name: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_select?: number
          min_select?: number
          name?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "addon_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      addon_options: {
        Row: {
          addon_group_id: string
          created_at: string
          id: string
          is_available: boolean
          max_quantity: number
          name: string
          position: number
          price_cents: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          addon_group_id: string
          created_at?: string
          id?: string
          is_available?: boolean
          max_quantity?: number
          name: string
          position?: number
          price_cents?: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          addon_group_id?: string
          created_at?: string
          id?: string
          is_available?: boolean
          max_quantity?: number
          name?: string
          position?: number
          price_cents?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_options_addon_group_id_fkey"
            columns: ["addon_group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_options_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "addon_options_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_options_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          data: Json
          entity: string
          entity_id: string | null
          id: string
          restaurant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          data?: Json
          entity: string
          entity_id?: string | null
          id?: string
          restaurant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          data?: Json
          entity?: string
          entity_id?: string | null
          id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "audit_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          restaurant_id: string | null
          result: string | null
          subscription_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider: string
          restaurant_id?: string | null
          result?: string | null
          subscription_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          restaurant_id?: string | null
          result?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "billing_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "billing_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "restaurant_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          menu_id: string
          name: string
          position: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          menu_id: string
          name: string
          position?: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          menu_id?: string
          name?: string
          position?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          customer_id: string | null
          id: string
          order_id: string
          restaurant_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          order_id: string
          restaurant_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          order_id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "coupon_redemptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          is_public: boolean
          max_discount_cents: number | null
          min_order_cents: number
          per_customer_limit: number | null
          restaurant_id: string
          starts_at: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          usage_limit: number | null
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          max_discount_cents?: number | null
          min_order_cents?: number
          per_customer_limit?: number | null
          restaurant_id: string
          starts_at?: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          max_discount_cents?: number | null
          min_order_cents?: number
          per_customer_limit?: number | null
          restaurant_id?: string
          starts_at?: string | null
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "coupons_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          cep: string | null
          city: string
          complement: string | null
          created_at: string
          customer_id: string
          id: string
          label: string | null
          neighborhood: string
          number: string
          reference: string | null
          restaurant_id: string
          state: string | null
          street: string
          updated_at: string
        }
        Insert: {
          cep?: string | null
          city: string
          complement?: string | null
          created_at?: string
          customer_id: string
          id?: string
          label?: string | null
          neighborhood: string
          number: string
          reference?: string | null
          restaurant_id: string
          state?: string | null
          street: string
          updated_at?: string
        }
        Update: {
          cep?: string | null
          city?: string
          complement?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          label?: string | null
          neighborhood?: string
          number?: string
          reference?: string | null
          restaurant_id?: string
          state?: string | null
          street?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "customer_addresses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_order_at: string | null
          name: string
          orders_count: number
          phone: string
          restaurant_id: string
          total_spent_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_order_at?: string | null
          name: string
          orders_count?: number
          phone: string
          restaurant_id: string
          total_spent_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_order_at?: string | null
          name?: string
          orders_count?: number
          phone?: string
          restaurant_id?: string
          total_spent_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          cep_end: string | null
          cep_start: string | null
          city: string | null
          created_at: string
          est_minutes: number | null
          fee_cents: number
          id: string
          is_active: boolean
          max_distance_km: number | null
          min_order_cents: number | null
          name: string
          neighborhoods: string[]
          position: number
          restaurant_id: string
          state: string | null
          type: Database["public"]["Enums"]["delivery_zone_type"]
          updated_at: string
        }
        Insert: {
          cep_end?: string | null
          cep_start?: string | null
          city?: string | null
          created_at?: string
          est_minutes?: number | null
          fee_cents?: number
          id?: string
          is_active?: boolean
          max_distance_km?: number | null
          min_order_cents?: number | null
          name: string
          neighborhoods?: string[]
          position?: number
          restaurant_id: string
          state?: string | null
          type?: Database["public"]["Enums"]["delivery_zone_type"]
          updated_at?: string
        }
        Update: {
          cep_end?: string | null
          cep_start?: string | null
          city?: string | null
          created_at?: string
          est_minutes?: number | null
          fee_cents?: number
          id?: string
          is_active?: boolean
          max_distance_km?: number | null
          min_order_cents?: number | null
          name?: string
          neighborhoods?: string[]
          position?: number
          restaurant_id?: string
          state?: string | null
          type?: Database["public"]["Enums"]["delivery_zone_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "delivery_zones_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_zones_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_campaigns: {
        Row: {
          description: string | null
          ends_at: string
          id: string
          image_url: string | null
          placement: string
          position: number
          starts_at: string
          status: string
          target_id: string | null
          target_kind: string
          title: string
        }
        Insert: {
          description?: string | null
          ends_at: string
          id?: string
          image_url?: string | null
          placement: string
          position?: number
          starts_at: string
          status?: string
          target_id?: string | null
          target_kind: string
          title: string
        }
        Update: {
          description?: string | null
          ends_at?: string
          id?: string
          image_url?: string | null
          placement?: string
          position?: number
          starts_at?: string
          status?: string
          target_id?: string | null
          target_kind?: string
          title?: string
        }
        Relationships: []
      }
      discovery_categories: {
        Row: {
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          position: number
        }
        Insert: {
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          position?: number
        }
        Update: {
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          position?: number
        }
        Relationships: []
      }
      discovery_category_links: {
        Row: {
          category_id: string
          discovery_category_id: string
        }
        Insert: {
          category_id: string
          discovery_category_id: string
        }
        Update: {
          category_id?: string
          discovery_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_category_links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_category_links_discovery_category_id_fkey"
            columns: ["discovery_category_id"]
            isOneToOne: false
            referencedRelation: "discovery_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_publications: {
        Row: {
          is_published: boolean
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          is_published?: boolean
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          is_published?: boolean
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_publications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "discovery_publications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_publications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          category: string
          created_at: string
          description: string | null
          enforced: boolean
          key: string
          kind: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          enforced?: boolean
          key: string
          kind: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          enforced?: boolean
          key?: string
          kind?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      menus: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          position: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          position?: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "menus_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menus_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menzu_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      mp_oauth_states: {
        Row: {
          code_verifier_enc: string
          created_at: string
          expires_at: string
          id: string
          restaurant_id: string
          state_hash: string
          user_id: string
        }
        Insert: {
          code_verifier_enc: string
          created_at?: string
          expires_at: string
          id?: string
          restaurant_id: string
          state_hash: string
          user_id: string
        }
        Update: {
          code_verifier_enc?: string
          created_at?: string
          expires_at?: string
          id?: string
          restaurant_id?: string
          state_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_oauth_states_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "mp_oauth_states_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp_oauth_states_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      opening_hours: {
        Row: {
          closes_at: string
          created_at: string
          id: string
          opens_at: string
          restaurant_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          closes_at: string
          created_at?: string
          id?: string
          opens_at: string
          restaurant_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          closes_at?: string
          created_at?: string
          id?: string
          opens_at?: string
          restaurant_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "opening_hours_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "opening_hours_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opening_hours_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_attempts: {
        Row: {
          created_at: string
          payload_hash: string
          request_id: string
          result: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          payload_hash: string
          request_id: string
          result?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          payload_hash?: string
          request_id?: string
          result?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      order_client_marks: {
        Row: {
          client_fingerprint: string
          created_at: string
          new_client: boolean
          order_id: string
          restaurant_id: string
        }
        Insert: {
          client_fingerprint: string
          created_at?: string
          new_client: boolean
          order_id: string
          restaurant_id: string
        }
        Update: {
          client_fingerprint?: string
          created_at?: string
          new_client?: boolean
          order_id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_client_marks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_client_marks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "order_client_marks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_client_marks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_addons: {
        Row: {
          addon_option_id: string | null
          created_at: string
          group_name: string
          id: string
          option_name: string
          order_item_id: string
          quantity: number
          restaurant_id: string
          unit_price_cents: number
        }
        Insert: {
          addon_option_id?: string | null
          created_at?: string
          group_name: string
          id?: string
          option_name: string
          order_item_id: string
          quantity?: number
          restaurant_id: string
          unit_price_cents: number
        }
        Update: {
          addon_option_id?: string | null
          created_at?: string
          group_name?: string
          id?: string
          option_name?: string
          order_item_id?: string
          quantity?: number
          restaurant_id?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_addons_addon_option_id_fkey"
            columns: ["addon_option_id"]
            isOneToOne: false
            referencedRelation: "addon_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_addons_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_addons_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "order_item_addons_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_addons_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          restaurant_id: string
          total_cents: number
          unit_price_cents: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          restaurant_id: string
          total_cents: number
          unit_price_cents: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          restaurant_id?: string
          total_cents?: number
          unit_price_cents?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "order_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          note: string | null
          order_id: string
          restaurant_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id: string
          restaurant_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id?: string
          restaurant_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "order_status_history_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: Json | null
          buyer_user_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          change_for_cents: number | null
          confirmed_at: string | null
          coupon_id: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          delivery_fee_cents: number
          delivery_zone_id: string | null
          discount_cents: number
          id: string
          notes: string | null
          number: number
          out_for_delivery_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          preparing_at: string | null
          public_token: string
          ready_at: string | null
          restaurant_id: string
          scheduled_for: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          table_number: number | null
          total_cents: number
          type: Database["public"]["Enums"]["order_type"]
          updated_at: string
        }
        Insert: {
          address?: Json | null
          buyer_user_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          change_for_cents?: number | null
          confirmed_at?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          delivery_fee_cents?: number
          delivery_zone_id?: string | null
          discount_cents?: number
          id?: string
          notes?: string | null
          number: number
          out_for_delivery_at?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          preparing_at?: string | null
          public_token?: string
          ready_at?: string | null
          restaurant_id: string
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          table_number?: number | null
          total_cents: number
          type: Database["public"]["Enums"]["order_type"]
          updated_at?: string
        }
        Update: {
          address?: Json | null
          buyer_user_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          change_for_cents?: number | null
          confirmed_at?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          delivery_fee_cents?: number
          delivery_zone_id?: string | null
          discount_cents?: number
          id?: string
          notes?: string | null
          number?: number
          out_for_delivery_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          preparing_at?: string | null
          public_token?: string
          ready_at?: string | null
          restaurant_id?: string
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          table_number?: number | null
          total_cents?: number
          type?: Database["public"]["Enums"]["order_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payload: Json
          payment_id: string | null
          processed_at: string | null
          provider: string
          restaurant_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payload?: Json
          payment_id?: string | null
          processed_at?: string | null
          provider: string
          restaurant_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payload?: Json
          payment_id?: string | null
          processed_at?: string | null
          provider?: string
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "payment_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          checkout_url: string | null
          commission_bps: number
          created_at: string
          fee_collection: string
          gateway_fee_cents: number | null
          gross_amount_cents: number | null
          id: string
          mercadopago_payment_id: string | null
          mercadopago_preference_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          money_release_date: string | null
          mp_seller_id: string | null
          order_id: string
          paid_at: string | null
          pix_qr_base64: string | null
          pix_qr_code: string | null
          platform_fee_cents: number
          provider: string
          provider_payment_id: string | null
          raw: Json
          restaurant_id: string
          restaurant_net_amount_cents: number | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          checkout_url?: string | null
          commission_bps?: number
          created_at?: string
          fee_collection?: string
          gateway_fee_cents?: number | null
          gross_amount_cents?: number | null
          id?: string
          mercadopago_payment_id?: string | null
          mercadopago_preference_id?: string | null
          method: Database["public"]["Enums"]["payment_method"]
          money_release_date?: string | null
          mp_seller_id?: string | null
          order_id: string
          paid_at?: string | null
          pix_qr_base64?: string | null
          pix_qr_code?: string | null
          platform_fee_cents?: number
          provider: string
          provider_payment_id?: string | null
          raw?: Json
          restaurant_id: string
          restaurant_net_amount_cents?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          checkout_url?: string | null
          commission_bps?: number
          created_at?: string
          fee_collection?: string
          gateway_fee_cents?: number | null
          gross_amount_cents?: number | null
          id?: string
          mercadopago_payment_id?: string | null
          mercadopago_preference_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          money_release_date?: string | null
          mp_seller_id?: string | null
          order_id?: string
          paid_at?: string | null
          pix_qr_base64?: string | null
          pix_qr_code?: string | null
          platform_fee_cents?: number
          provider?: string
          provider_payment_id?: string | null
          raw?: Json
          restaurant_id?: string
          restaurant_net_amount_cents?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          enabled: boolean
          feature_key: string
          limit_value: number | null
          plan_id: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          feature_key: string
          limit_value?: number | null
          plan_id: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          feature_key?: string
          limit_value?: number | null
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "admin_plan_stats"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          commission_bps: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          price_monthly_cents: number
          price_yearly_cents: number | null
          slug: string
          sort_order: number
          support_level: string | null
          trial_days: number
          updated_at: string
        }
        Insert: {
          commission_bps: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          price_monthly_cents: number
          price_yearly_cents?: number | null
          slug: string
          sort_order?: number
          support_level?: string | null
          trial_days?: number
          updated_at?: string
        }
        Update: {
          commission_bps?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          price_monthly_cents?: number
          price_yearly_cents?: number | null
          slug?: string
          sort_order?: number
          support_level?: string | null
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          created_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          data: Json
          entity: string
          entity_id: string | null
          id: string
          restaurant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          data?: Json
          entity: string
          entity_id?: string | null
          id?: string
          restaurant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          data?: Json
          entity?: string
          entity_id?: string | null
          id?: string
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "platform_audit_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_audit_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_addon_groups: {
        Row: {
          addon_group_id: string
          created_at: string
          id: string
          position: number
          product_id: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          addon_group_id: string
          created_at?: string
          id?: string
          position?: number
          product_id: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          addon_group_id?: string
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addon_groups_addon_group_id_fkey"
            columns: ["addon_group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addon_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addon_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "product_addon_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addon_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          name: string
          position: number
          price_cents: number
          product_id: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          name: string
          position?: number
          price_cents: number
          product_id: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          name?: string
          position?: number
          price_cents?: number
          product_id?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "product_variants_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          position: number
          price_cents: number
          promo_price_cents: number | null
          restaurant_id: string
          status: Database["public"]["Enums"]["product_status"]
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          position?: number
          price_cents: number
          promo_price_cents?: number | null
          restaurant_id: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          position?: number
          price_cents?: number
          promo_price_cents?: number | null
          restaurant_id?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_counters: {
        Row: {
          last_order_number: number
          restaurant_id: string
        }
        Insert: {
          last_order_number?: number
          restaurant_id: string
        }
        Update: {
          last_order_number?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_counters_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_counters_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_counters_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_feature_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean | null
          expires_at: string | null
          feature_key: string
          limit_value: number | null
          reason: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean | null
          expires_at?: string | null
          feature_key: string
          limit_value?: number | null
          reason?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean | null
          expires_at?: string | null
          feature_key?: string
          limit_value?: number | null
          reason?: string | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_feature_overrides_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "restaurant_feature_overrides_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_feature_overrides_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_feature_overrides_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_members: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          role: Database["public"]["Enums"]["member_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          role: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_payment_accounts: {
        Row: {
          access_expires_at: string | null
          access_token_enc: string | null
          connected_at: string | null
          connected_by: string | null
          created_at: string
          disconnected_at: string | null
          email: string | null
          last_refreshed_at: string | null
          live_mode: boolean
          mp_user_id: string
          nickname: string | null
          provider: string
          public_key: string | null
          refresh_lock_until: string | null
          refresh_token_enc: string | null
          restaurant_id: string
          scope: string | null
          status: string
          token_version: number
          updated_at: string
        }
        Insert: {
          access_expires_at?: string | null
          access_token_enc?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          disconnected_at?: string | null
          email?: string | null
          last_refreshed_at?: string | null
          live_mode?: boolean
          mp_user_id: string
          nickname?: string | null
          provider?: string
          public_key?: string | null
          refresh_lock_until?: string | null
          refresh_token_enc?: string | null
          restaurant_id: string
          scope?: string | null
          status: string
          token_version?: number
          updated_at?: string
        }
        Update: {
          access_expires_at?: string | null
          access_token_enc?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          disconnected_at?: string | null
          email?: string | null
          last_refreshed_at?: string | null
          live_mode?: boolean
          mp_user_id?: string
          nickname?: string | null
          provider?: string
          public_key?: string | null
          refresh_lock_until?: string | null
          refresh_token_enc?: string | null
          restaurant_id?: string
          scope?: string | null
          status?: string
          token_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_payment_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_payment_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_payment_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          custom_commission_bps: number | null
          discount_bps: number
          discount_until: string | null
          grace_ends_at: string | null
          id: string
          past_due_since: string | null
          pending_billing_cycle: string | null
          pending_plan_id: string | null
          pending_price_cents: number | null
          pending_provider_subscription_id: string | null
          plan_id: string
          price_cents: number
          provider: string
          provider_subscription_id: string | null
          restaurant_id: string
          scheduled_billing_cycle: string | null
          scheduled_plan_id: string | null
          status: string
          suspended_at: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          custom_commission_bps?: number | null
          discount_bps?: number
          discount_until?: string | null
          grace_ends_at?: string | null
          id?: string
          past_due_since?: string | null
          pending_billing_cycle?: string | null
          pending_plan_id?: string | null
          pending_price_cents?: number | null
          pending_provider_subscription_id?: string | null
          plan_id: string
          price_cents?: number
          provider?: string
          provider_subscription_id?: string | null
          restaurant_id: string
          scheduled_billing_cycle?: string | null
          scheduled_plan_id?: string | null
          status: string
          suspended_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          custom_commission_bps?: number | null
          discount_bps?: number
          discount_until?: string | null
          grace_ends_at?: string | null
          id?: string
          past_due_since?: string | null
          pending_billing_cycle?: string | null
          pending_plan_id?: string | null
          pending_price_cents?: number | null
          pending_provider_subscription_id?: string | null
          plan_id?: string
          price_cents?: number
          provider?: string
          provider_subscription_id?: string | null
          restaurant_id?: string
          scheduled_billing_cycle?: string | null
          scheduled_plan_id?: string | null
          status?: string
          suspended_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_subscriptions_pending_plan_id_fkey"
            columns: ["pending_plan_id"]
            isOneToOne: false
            referencedRelation: "admin_plan_stats"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "restaurant_subscriptions_pending_plan_id_fkey"
            columns: ["pending_plan_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "restaurant_subscriptions_pending_plan_id_fkey"
            columns: ["pending_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "admin_plan_stats"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "restaurant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "restaurant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_subscriptions_scheduled_plan_id_fkey"
            columns: ["scheduled_plan_id"]
            isOneToOne: false
            referencedRelation: "admin_plan_stats"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "restaurant_subscriptions_scheduled_plan_id_fkey"
            columns: ["scheduled_plan_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "restaurant_subscriptions_scheduled_plan_id_fkey"
            columns: ["scheduled_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          created_at: string
          id: string
          label: string | null
          number: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          number: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          number?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          accepts_delivery: boolean
          accepts_dine_in: boolean
          accepts_pickup: boolean
          accepts_scheduling: boolean
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          avg_prep_minutes: number
          banner_url: string | null
          created_at: string
          created_by: string | null
          default_delivery_fee_cents: number
          description: string | null
          id: string
          instagram: string | null
          lat: number | null
          lng: number | null
          logo_url: string | null
          min_order_cents: number
          name: string
          onboarding_completed: boolean
          payment_methods: Database["public"]["Enums"]["payment_method"][]
          phone: string | null
          primary_color: string | null
          slug: string
          status: Database["public"]["Enums"]["restaurant_status"]
          timezone: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          accepts_delivery?: boolean
          accepts_dine_in?: boolean
          accepts_pickup?: boolean
          accepts_scheduling?: boolean
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avg_prep_minutes?: number
          banner_url?: string | null
          created_at?: string
          created_by?: string | null
          default_delivery_fee_cents?: number
          description?: string | null
          id?: string
          instagram?: string | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          min_order_cents?: number
          name: string
          onboarding_completed?: boolean
          payment_methods?: Database["public"]["Enums"]["payment_method"][]
          phone?: string | null
          primary_color?: string | null
          slug: string
          status?: Database["public"]["Enums"]["restaurant_status"]
          timezone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          accepts_delivery?: boolean
          accepts_dine_in?: boolean
          accepts_pickup?: boolean
          accepts_scheduling?: boolean
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avg_prep_minutes?: number
          banner_url?: string | null
          created_at?: string
          created_by?: string | null
          default_delivery_fee_cents?: number
          description?: string | null
          id?: string
          instagram?: string | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          min_order_cents?: number
          name?: string
          onboarding_completed?: boolean
          payment_methods?: Database["public"]["Enums"]["payment_method"][]
          phone?: string | null
          primary_color?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["restaurant_status"]
          timezone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          actor_id: string | null
          created_at: string
          data: Json
          event: string
          from_plan_id: string | null
          id: string
          restaurant_id: string
          subscription_id: string | null
          to_plan_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          event: string
          from_plan_id?: string | null
          id?: string
          restaurant_id: string
          subscription_id?: string | null
          to_plan_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          event?: string
          from_plan_id?: string | null
          id?: string
          restaurant_id?: string
          subscription_id?: string | null
          to_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_from_plan_id_fkey"
            columns: ["from_plan_id"]
            isOneToOne: false
            referencedRelation: "admin_plan_stats"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "subscription_events_from_plan_id_fkey"
            columns: ["from_plan_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "subscription_events_from_plan_id_fkey"
            columns: ["from_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "subscription_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "restaurant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_to_plan_id_fkey"
            columns: ["to_plan_id"]
            isOneToOne: false
            referencedRelation: "admin_plan_stats"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "subscription_events_to_plan_id_fkey"
            columns: ["to_plan_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "subscription_events_to_plan_id_fkey"
            columns: ["to_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          provider: string
          provider_payment_id: string
          raw: Json
          restaurant_id: string
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          provider: string
          provider_payment_id: string
          raw?: Json
          restaurant_id: string
          status: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          provider?: string
          provider_payment_id?: string
          raw?: Json
          restaurant_id?: string
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "subscription_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "restaurant_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          restaurant_id: string
          role: Database["public"]["Enums"]["member_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          restaurant_id: string
          role: Database["public"]["Enums"]["member_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          restaurant_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "team_invites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_plan_stats: {
        Row: {
          active: number | null
          cancelled: number | null
          commission_bps: number | null
          expired: number | null
          is_active: boolean | null
          is_public: boolean | null
          mrr_cents: number | null
          name: string | null
          past_due: number | null
          plan_id: string | null
          price_monthly_cents: number | null
          price_yearly_cents: number | null
          restaurants_total: number | null
          slug: string | null
          sort_order: number | null
          suspended: number | null
          trialing: number | null
        }
        Relationships: []
      }
      admin_restaurants_overview: {
        Row: {
          billing_cycle: string | null
          commission_bps: number | null
          commission_month_cents: number | null
          created_at: string | null
          current_period_end: string | null
          custom_commission_bps: number | null
          discount_bps: number | null
          discount_until: string | null
          effective_status: string | null
          grace_ends_at: string | null
          mp_connected: boolean | null
          name: string | null
          onboarding_completed: boolean | null
          orders_month: number | null
          owner_email: string | null
          paid_gross_month_cents: number | null
          plan_id: string | null
          plan_name: string | null
          plan_slug: string | null
          price_cents: number | null
          provider: string | null
          restaurant_id: string | null
          scheduled_plan_id: string | null
          slug: string | null
          status: string | null
          subscription_id: string | null
          trial_ends_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_subscriptions_scheduled_plan_id_fkey"
            columns: ["scheduled_plan_id"]
            isOneToOne: false
            referencedRelation: "admin_plan_stats"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "restaurant_subscriptions_scheduled_plan_id_fkey"
            columns: ["scheduled_plan_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "restaurant_subscriptions_scheduled_plan_id_fkey"
            columns: ["scheduled_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_stats: {
        Row: {
          avg_ticket_cents: number | null
          created_at: string | null
          email: string | null
          id: string | null
          last_order_at: string | null
          name: string | null
          orders_count: number | null
          phone: string | null
          restaurant_id: string | null
          total_spent_cents: number | null
          updated_at: string | null
        }
        Insert: {
          avg_ticket_cents?: never
          created_at?: string | null
          email?: string | null
          id?: string | null
          last_order_at?: string | null
          name?: string | null
          orders_count?: number | null
          phone?: string | null
          restaurant_id?: string | null
          total_spent_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_ticket_cents?: never
          created_at?: string | null
          email?: string | null
          id?: string | null
          last_order_at?: string | null
          name?: string | null
          orders_count?: number | null
          phone?: string | null
          restaurant_id?: string | null
          total_spent_cents?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "admin_restaurants_overview"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      public_restaurants: {
        Row: {
          accepts_delivery: boolean | null
          accepts_dine_in: boolean | null
          accepts_pickup: boolean | null
          accepts_scheduling: boolean | null
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          avg_prep_minutes: number | null
          banner_url: string | null
          default_delivery_fee_cents: number | null
          description: string | null
          id: string | null
          instagram: string | null
          lat: number | null
          lng: number | null
          logo_url: string | null
          min_order_cents: number | null
          name: string | null
          payment_methods:
            | Database["public"]["Enums"]["payment_method"][]
            | null
          phone: string | null
          primary_color: string | null
          slug: string | null
          status: Database["public"]["Enums"]["restaurant_status"] | null
          timezone: string | null
          whatsapp: string | null
        }
        Insert: {
          accepts_delivery?: boolean | null
          accepts_dine_in?: boolean | null
          accepts_pickup?: boolean | null
          accepts_scheduling?: boolean | null
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avg_prep_minutes?: number | null
          banner_url?: string | null
          default_delivery_fee_cents?: number | null
          description?: string | null
          id?: string | null
          instagram?: string | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          min_order_cents?: number | null
          name?: string | null
          payment_methods?:
            | Database["public"]["Enums"]["payment_method"][]
            | null
          phone?: string | null
          primary_color?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["restaurant_status"] | null
          timezone?: string | null
          whatsapp?: string | null
        }
        Update: {
          accepts_delivery?: boolean | null
          accepts_dine_in?: boolean | null
          accepts_pickup?: boolean | null
          accepts_scheduling?: boolean | null
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avg_prep_minutes?: number | null
          banner_url?: string | null
          default_delivery_fee_cents?: number | null
          description?: string | null
          id?: string | null
          instagram?: string | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          min_order_cents?: number | null
          name?: string | null
          payment_methods?:
            | Database["public"]["Enums"]["payment_method"][]
            | null
          phone?: string | null
          primary_color?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["restaurant_status"] | null
          timezone?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      guest_order_review_state: {
        Args: { p_order_id: string; p_token: string; p_confirm: boolean }
        Returns: "unavailable" | "reviewed" | "awaiting_receipt" | "ready"
      }
      submit_order_feedback: {
        Args: { p_order_id: string; p_token: string; p_restaurant_stars: number; p_system_stars: number; p_restaurant_comment: string; p_system_comment: string }
        Returns: boolean
      }
      restaurant_rating: {
        Args: { p_restaurant_id: string }
        Returns: { average: number | null; total: number }[]
      }
      restaurant_feedback: {
        Args: { p_restaurant_id: string }
        Returns: { stars: number; comment: string | null; created_at: string }[]
      }
      menzu_public_catalog: {
        Args: { p_restaurant_id: string }
        Returns: {
          menus: { id: string; name: string; position: number }[]
          categories: { id: string; menu_id: string; name: string; description: string | null; position: number }[]
          products: {
            id: string
            category_id: string
            name: string
            description: string | null
            image_url: string | null
            price_cents: number
            promo_price_cents: number | null
            position: number
            available: boolean
          }[]
          variants: { id: string; product_id: string; name: string; price_cents: number; is_available: boolean; position: number }[]
          links: { product_id: string; addon_group_id: string; position: number }[]
          groups: { id: string; name: string; min_select: number; max_select: number; is_required: boolean }[]
          options: {
            id: string
            addon_group_id: string
            name: string
            price_cents: number
            is_available: boolean
            max_quantity: number
            position: number
          }[]
        }
      }
      menzu_public_table_exists: {
        Args: { p_restaurant_id: string; p_table_number: number }
        Returns: boolean
      }
      public_coupons: { Args: { p_slug: string }; Returns: Json }
      public_menu_bestsellers: {
        Args: { p_restaurant_id: string }
        Returns: { product_id: string; quantity: number }[]
      }
      accept_invite: { Args: { p_token: string }; Returns: string }
      admin_clear_override: {
        Args: { p_feature_key: string; p_restaurant_id: string }
        Returns: boolean
      }
      admin_extend_trial: {
        Args: { p_restaurant_id: string; p_until: string }
        Returns: undefined
      }
      admin_grant_plan: {
        Args: {
          p_period_end: string
          p_plan_id: string
          p_reason: string
          p_restaurant_id: string
        }
        Returns: undefined
      }
      admin_reactivate: {
        Args: { p_reason: string; p_restaurant_id: string }
        Returns: undefined
      }
      admin_set_custom_commission: {
        Args: { p_bps: number; p_restaurant_id: string }
        Returns: undefined
      }
      admin_set_discount: {
        Args: { p_bps: number; p_restaurant_id: string; p_until: string }
        Returns: undefined
      }
      admin_set_override: {
        Args: {
          p_enabled: boolean
          p_expires_at: string
          p_feature_key: string
          p_limit: number
          p_restaurant_id: string
        }
        Returns: undefined
      }
      admin_set_plan_active: {
        Args: { p_active: boolean; p_plan_id: string }
        Returns: undefined
      }
      admin_set_plan_feature: {
        Args: {
          p_enabled: boolean
          p_feature_key: string
          p_limit_value: number
          p_plan_id: string
        }
        Returns: undefined
      }
      admin_suspend: {
        Args: { p_reason: string; p_restaurant_id: string }
        Returns: undefined
      }
      admin_upsert_plan: { Args: { p: Json }; Returns: string }
      apply_payment_update: {
        Args: {
          p_event_id: string
          p_gateway_fee_cents?: number
          p_mercadopago_payment_id?: string
          p_mercadopago_preference_id?: string
          p_money_release_date?: string
          p_mp_seller_id?: string
          p_payment_id: string
          p_provider: string
          p_provider_payment_id: string
          p_raw: Json
          p_status: Database["public"]["Enums"]["payment_status"]
        }
        Returns: boolean
      }
      apply_subscription_event: {
        Args: {
          p_amount_cents?: number
          p_event_id: string
          p_kind: string
          p_period_end?: string
          p_period_start?: string
          p_provider: string
          p_provider_payment_id?: string
          p_provider_subscription_id: string
          p_raw?: Json
          p_subscription_id: string
        }
        Returns: boolean
      }
      billing_tick: { Args: never; Returns: Json }
      create_invite: {
        Args: {
          p_email: string
          p_restaurant_id: string
          p_role: Database["public"]["Enums"]["member_role"]
        }
        Returns: string
      }
      create_order: { Args: { p_payload: Json }; Returns: Json }
      create_restaurant: { Args: { p: Json }; Returns: string }
      dashboard_metrics: {
        Args: { p_from: string; p_restaurant_id: string; p_to: string }
        Returns: Json
      }
      delete_restaurant: {
        Args: { p_restaurant_id: string }
        Returns: undefined
      }
      dev_simulate_payment: {
        Args: {
          p_payment_id: string
          p_status: Database["public"]["Enums"]["payment_status"]
        }
        Returns: undefined
      }
      get_public_order: {
        Args: { p_order_id: string; p_token: string }
        Returns: Json
      }
      is_slug_available: {
        Args: { p_restaurant_id?: string; p_slug: string }
        Returns: boolean
      }
      kitchen_orders: { Args: { p_restaurant_id: string }; Returns: Json }
      mark_payment_paid: { Args: { p_payment_id: string }; Returns: undefined }
      marketplace_admin_read: { Args: never; Returns: Json }
      marketplace_admin_save: { Args: { p_input: Json }; Returns: undefined }
      marketplace_discover: {
        Args: {
          p_address: Json
          p_filters?: Json
          p_page?: number
          p_restaurant_page?: number
        }
        Returns: Json
      }
      marketplace_product: {
        Args: { p_address: Json; p_product_id: string }
        Returns: Json
      }
      marketplace_recent: { Args: { p_address: Json }; Returns: Json }
      marketplace_repeat_catalog: {
        Args: { p_address: Json; p_order_id: string }
        Returns: Json
      }
      menzu_assert_below_limit: {
        Args: { p_current: number; p_key: string; rid: string }
        Returns: undefined
      }
      menzu_assert_feature: {
        Args: { p_key: string; rid: string }
        Returns: undefined
      }
      menzu_assert_platform_admin: { Args: never; Returns: string }
      menzu_commission_bps: { Args: { rid: string }; Returns: number }
      menzu_create_order_core: { Args: { p_payload: Json }; Returns: Json }
      menzu_create_order_with_limits: {
        Args: { p_payload: Json }
        Returns: Json
      }
      menzu_default_plan_id: { Args: never; Returns: string }
      menzu_delivery_zone: {
        Args: { p_address: Json; p_restaurant_id: string }
        Returns: {
          cep_end: string | null
          cep_start: string | null
          city: string | null
          created_at: string
          est_minutes: number | null
          fee_cents: number
          id: string
          is_active: boolean
          max_distance_km: number | null
          min_order_cents: number | null
          name: string
          neighborhoods: string[]
          position: number
          restaurant_id: string
          state: string | null
          type: Database["public"]["Enums"]["delivery_zone_type"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "delivery_zones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      menzu_discovery_catalog: {
        Args: { p_address: Json; p_product_ids?: string[] }
        Returns: {
          category_id: string
          discount: number
          display_cents: number
          doc: Json
          eta: number
          fee_cents: number
          id: string
          open_now: boolean
          popular: number
          restaurant_id: string
          sold: number
        }[]
      }
      menzu_discovery_restaurants: {
        Args: { p_address: Json }
        Returns: {
          doc: Json
          eta: number
          fee_cents: number
          open_now: boolean
          restaurant_id: string
        }[]
      }
      menzu_effective_features: {
        Args: { rid: string }
        Returns: {
          enabled: boolean
          feature_key: string
          kind: string
          limit_value: number
          source: string
        }[]
      }
      menzu_fold: { Args: { p_text: string }; Returns: string }
      menzu_format_money: { Args: { p_cents: number }; Returns: string }
      menzu_has_feature: {
        Args: { p_key: string; rid: string }
        Returns: boolean
      }
      menzu_has_role: {
        Args: {
          rid: string
          roles: Database["public"]["Enums"]["member_role"][]
        }
        Returns: boolean
      }
      menzu_is_member: { Args: { rid: string }; Returns: boolean }
      menzu_is_member_plan: { Args: { p_plan_id: string }; Returns: boolean }
      menzu_is_open_at: {
        Args: { p_at: string; p_restaurant_id: string }
        Returns: boolean
      }
      menzu_is_owner: {
        Args: { p_restaurant_id: string; p_user_id: string }
        Returns: boolean
      }
      menzu_is_platform_admin: { Args: never; Returns: boolean }
      menzu_is_public_restaurant: { Args: { rid: string }; Returns: boolean }
      menzu_lock_subscription: {
        Args: { p_restaurant_id: string }
        Returns: {
          billing_cycle: string
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          custom_commission_bps: number | null
          discount_bps: number
          discount_until: string | null
          grace_ends_at: string | null
          id: string
          past_due_since: string | null
          pending_billing_cycle: string | null
          pending_plan_id: string | null
          pending_price_cents: number | null
          pending_provider_subscription_id: string | null
          plan_id: string
          price_cents: number
          provider: string
          provider_subscription_id: string | null
          restaurant_id: string
          scheduled_billing_cycle: string | null
          scheduled_plan_id: string | null
          status: string
          suspended_at: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "restaurant_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      menzu_normalize_phone: { Args: { p_phone: string }; Returns: string }
      menzu_online_payments_allowed: { Args: never; Returns: boolean }
      menzu_order_key_valid: { Args: { p_key: string }; Returns: boolean }
      menzu_order_transitions: { Args: never; Returns: Json }
      menzu_period_metrics: {
        Args: { p_from: string; p_restaurant_id: string; p_to: string }
        Returns: Json
      }
      menzu_plan_limit: {
        Args: { p_key: string; rid: string }
        Returns: number
      }
      menzu_plan_price: {
        Args: {
          p_cycle: string
          p_plan: Database["public"]["Tables"]["plans"]["Row"]
        }
        Returns: number
      }
      menzu_price_cart: { Args: { p_payload: Json }; Returns: Json }
      menzu_price_cart_core: { Args: { p_payload: Json }; Returns: Json }
      menzu_raise: {
        Args: { p_code: string; p_detail: string }
        Returns: undefined
      }
      menzu_refresh_customer_stats: {
        Args: { p_customer_id: string }
        Returns: undefined
      }
      menzu_restaurant_online_payments_allowed: {
        Args: { p_restaurant_id: string }
        Returns: boolean
      }
      menzu_setting_int: {
        Args: { p_default: number; p_key: string }
        Returns: number
      }
      menzu_subscription_blocked: { Args: { rid: string }; Returns: boolean }
      menzu_subscription_log: {
        Args: {
          p_actor: string
          p_audit_action?: string
          p_data: Json
          p_event: string
          p_from_plan: string
          p_sub: Database["public"]["Tables"]["restaurant_subscriptions"]["Row"]
          p_to_plan: string
        }
        Returns: undefined
      }
      menzu_subscription_state: { Args: { rid: string }; Returns: string }
      menzu_transition_check: {
        Args: {
          p_from: Database["public"]["Enums"]["order_status"]
          p_role: Database["public"]["Enums"]["member_role"]
          p_to: Database["public"]["Enums"]["order_status"]
          p_type: Database["public"]["Enums"]["order_type"]
        }
        Returns: string
      }
      menzu_transition_matrix: { Args: never; Returns: Json }
      menzu_usage_count: {
        Args: { p_key: string; rid: string }
        Returns: number
      }
      menzu_uuid_or_null: { Args: { value: string }; Returns: string }
      oauth_state_consume: {
        Args: { p_state_hash: string }
        Returns: {
          code_verifier_enc: string
          restaurant_id: string
          user_id: string
        }[]
      }
      oauth_state_create: {
        Args: {
          p_code_verifier_enc: string
          p_expires_at?: string
          p_restaurant_id: string
          p_state_hash: string
          p_user_id: string
        }
        Returns: string
      }
      online_payments_available: { Args: never; Returns: boolean }
      payment_account_begin_refresh: {
        Args: { p_restaurant_id: string }
        Returns: {
          locked: boolean
          refresh_enc: string
          token_version: number
        }[]
      }
      payment_account_get: {
        Args: { p_restaurant_id: string }
        Returns: {
          access_expires_at: string | null
          access_token_enc: string | null
          connected_at: string | null
          connected_by: string | null
          created_at: string
          disconnected_at: string | null
          email: string | null
          last_refreshed_at: string | null
          live_mode: boolean
          mp_user_id: string
          nickname: string | null
          provider: string
          public_key: string | null
          refresh_lock_until: string | null
          refresh_token_enc: string | null
          restaurant_id: string
          scope: string | null
          status: string
          token_version: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "restaurant_payment_accounts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      payment_account_mark: {
        Args: {
          p_actor_id?: string
          p_expected_version?: number
          p_restaurant_id: string
          p_status: string
        }
        Returns: boolean
      }
      payment_account_release_refresh: {
        Args: { p_restaurant_id: string; p_version: number }
        Returns: boolean
      }
      payment_account_status: {
        Args: { p_restaurant_id: string }
        Returns: Json
      }
      payment_account_store_tokens: {
        Args: {
          p_access_enc: string
          p_access_expires_at: string
          p_expected_version: number
          p_refresh_enc: string
          p_restaurant_id: string
        }
        Returns: boolean
      }
      payment_account_upsert_connected: {
        Args: {
          p_access_enc: string
          p_access_expires_at: string
          p_connected_by: string
          p_email: string
          p_live_mode: boolean
          p_mp_user_id: string
          p_nickname: string
          p_public_key: string
          p_refresh_enc: string
          p_restaurant_id: string
          p_scope: string
        }
        Returns: undefined
      }
      product_sales: {
        Args: { p_product_ids: string[]; p_restaurant_id: string }
        Returns: {
          product_id: string
          units: number
        }[]
      }
      quote_order: { Args: { p_payload: Json }; Returns: Json }
      remove_member: {
        Args: { p_restaurant_id: string; p_user_id: string }
        Returns: undefined
      }
      reorder: {
        Args: { p_ids: string[]; p_table: string }
        Returns: undefined
      }
      restaurant_entitlements: {
        Args: { p_restaurant_id: string }
        Returns: Json
      }
      restaurant_online_payments_available: {
        Args: { p_slug: string }
        Returns: boolean
      }
      restaurant_subscription_available: {
        Args: { p_slug: string }
        Returns: boolean
      }
      save_addon_group: { Args: { p: Json }; Returns: string }
      save_product: { Args: { p: Json }; Returns: string }
      set_development_payment_data: {
        Args: {
          p_payment_id: string
          p_pix_qr_code: string
          p_provider_payment_id: string
          p_raw: Json
          p_server_key: string
          p_status: Database["public"]["Enums"]["payment_status"]
          p_token: string
        }
        Returns: undefined
      }
      set_opening_hours: {
        Args: { p_hours: Json; p_restaurant_id: string }
        Returns: undefined
      }
      set_payment_provider_data: {
        Args: {
          p_checkout_url: string
          p_mercadopago_preference_id?: string
          p_mp_seller_id?: string
          p_payment_id: string
          p_pix_qr_base64: string
          p_pix_qr_code: string
          p_provider: string
          p_provider_payment_id: string
          p_raw: Json
          p_status: Database["public"]["Enums"]["payment_status"]
          p_token: string
        }
        Returns: undefined
      }
      set_restaurant_status: {
        Args: {
          p_restaurant_id: string
          p_status: Database["public"]["Enums"]["restaurant_status"]
        }
        Returns: undefined
      }
      subscription_attach_checkout: {
        Args: {
          p_actor_id: string
          p_billing_cycle: string
          p_plan_id: string
          p_price_cents: number
          p_provider_subscription_id: string
          p_restaurant_id: string
        }
        Returns: string
      }
      subscription_schedule_change: {
        Args: {
          p_actor_id: string
          p_billing_cycle: string
          p_plan_id: string
          p_restaurant_id: string
        }
        Returns: Json
      }
      team_members: { Args: { p_restaurant_id: string }; Returns: Json }
      update_member_role: {
        Args: {
          p_restaurant_id: string
          p_role: Database["public"]["Enums"]["member_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      update_order_status: {
        Args: {
          p_order_id: string
          p_reason?: string
          p_to: Database["public"]["Enums"]["order_status"]
        }
        Returns: Json
      }
    }
    Enums: {
      coupon_type: "PERCENT" | "FIXED"
      delivery_zone_type: "NEIGHBORHOOD" | "CEP_RANGE" | "DISTANCE"
      member_role: "OWNER" | "MANAGER" | "ATTENDANT" | "KITCHEN" | "DELIVERY"
      order_status:
        | "PENDING"
        | "CONFIRMED"
        | "PREPARING"
        | "READY"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
        | "CANCELLED"
      order_type: "DELIVERY" | "PICKUP" | "DINE_IN"
      payment_method: "PIX" | "CARD_ONLINE" | "CARD_ON_DELIVERY" | "CASH"
      payment_status:
        | "PENDING"
        | "PROCESSING"
        | "PAID"
        | "FAILED"
        | "REFUNDED"
        | "CANCELLED"
      product_status: "ACTIVE" | "ARCHIVED"
      restaurant_status: "OPEN" | "CLOSED" | "PAUSED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      coupon_type: ["PERCENT", "FIXED"],
      delivery_zone_type: ["NEIGHBORHOOD", "CEP_RANGE", "DISTANCE"],
      member_role: ["OWNER", "MANAGER", "ATTENDANT", "KITCHEN", "DELIVERY"],
      order_status: [
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      ],
      order_type: ["DELIVERY", "PICKUP", "DINE_IN"],
      payment_method: ["PIX", "CARD_ONLINE", "CARD_ON_DELIVERY", "CASH"],
      payment_status: [
        "PENDING",
        "PROCESSING",
        "PAID",
        "FAILED",
        "REFUNDED",
        "CANCELLED",
      ],
      product_status: ["ACTIVE", "ARCHIVED"],
      restaurant_status: ["OPEN", "CLOSED", "PAUSED"],
    },
  },
} as const
