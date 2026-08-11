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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      booking_payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          created_by: string | null
          id: string
          payment_date: string
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          reference_number: string | null
          remarks: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          payment_date?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          reference_number?: string | null
          remarks?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          payment_date?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          reference_number?: string | null
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount_received: number
          balance: number
          booking_amount: number
          booking_date: string
          booking_number: string
          created_at: string
          customer_id: string
          exchange_details: string | null
          exchange_required: boolean
          expected_delivery_date: string | null
          final_price: number
          finance_company: string | null
          finance_required: boolean
          id: string
          inquiry_id: string
          payment_mode: Database["public"]["Enums"]["payment_mode"] | null
          remarks: string | null
          salesman_id: string
          status: Database["public"]["Enums"]["booking_status"]
          subsidy_required: boolean
          tractor_model: string
          updated_at: string
          variant: string | null
        }
        Insert: {
          amount_received?: number
          balance?: number
          booking_amount?: number
          booking_date?: string
          booking_number: string
          created_at?: string
          customer_id: string
          exchange_details?: string | null
          exchange_required?: boolean
          expected_delivery_date?: string | null
          final_price?: number
          finance_company?: string | null
          finance_required?: boolean
          id?: string
          inquiry_id: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
          remarks?: string | null
          salesman_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          subsidy_required?: boolean
          tractor_model: string
          updated_at?: string
          variant?: string | null
        }
        Update: {
          amount_received?: number
          balance?: number
          booking_amount?: number
          booking_date?: string
          booking_number?: string
          created_at?: string
          customer_id?: string
          exchange_details?: string | null
          exchange_required?: boolean
          expected_delivery_date?: string | null
          final_price?: number
          finance_company?: string | null
          finance_required?: boolean
          id?: string
          inquiry_id?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
          remarks?: string | null
          salesman_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          subsidy_required?: boolean
          tractor_model?: string
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: true
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          alternate_mobile: string | null
          assigned_salesman_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          district: string | null
          id: string
          mobile: string
          taluka: string | null
          updated_at: string
          village: string
        }
        Insert: {
          address?: string | null
          alternate_mobile?: string | null
          assigned_salesman_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          district?: string | null
          id?: string
          mobile: string
          taluka?: string | null
          updated_at?: string
          village?: string
        }
        Update: {
          address?: string | null
          alternate_mobile?: string | null
          assigned_salesman_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          district?: string | null
          id?: string
          mobile?: string
          taluka?: string | null
          updated_at?: string
          village?: string
        }
        Relationships: []
      }
      demos: {
        Row: {
          competitor_present: string | null
          created_at: string
          customer_id: string
          demo_date: string
          feedback: string | null
          id: string
          inquiry_id: string
          location: string | null
          next_action: string | null
          remarks: string | null
          salesman_id: string
          status: Database["public"]["Enums"]["demo_status"]
          tractor_model: string
        }
        Insert: {
          competitor_present?: string | null
          created_at?: string
          customer_id: string
          demo_date: string
          feedback?: string | null
          id?: string
          inquiry_id: string
          location?: string | null
          next_action?: string | null
          remarks?: string | null
          salesman_id: string
          status?: Database["public"]["Enums"]["demo_status"]
          tractor_model: string
        }
        Update: {
          competitor_present?: string | null
          created_at?: string
          customer_id?: string
          demo_date?: string
          feedback?: string | null
          id?: string
          inquiry_id?: string
          location?: string | null
          next_action?: string | null
          remarks?: string | null
          salesman_id?: string
          status?: Database["public"]["Enums"]["demo_status"]
          tractor_model?: string
        }
        Relationships: [
          {
            foreignKeyName: "demos_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demos_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      followups: {
        Row: {
          competitor_info: string | null
          contact_method: Database["public"]["Enums"]["contact_method"]
          created_at: string
          customer_id: string
          customer_response: string | null
          discussion: string | null
          expected_purchase_date: string | null
          followup_date: string
          followup_time: string | null
          id: string
          inquiry_id: string
          interest_level: Database["public"]["Enums"]["interest_level"] | null
          next_action: string | null
          next_followup_date: string | null
          remarks: string | null
          salesman_id: string
          status: Database["public"]["Enums"]["followup_status"]
        }
        Insert: {
          competitor_info?: string | null
          contact_method?: Database["public"]["Enums"]["contact_method"]
          created_at?: string
          customer_id: string
          customer_response?: string | null
          discussion?: string | null
          expected_purchase_date?: string | null
          followup_date?: string
          followup_time?: string | null
          id?: string
          inquiry_id: string
          interest_level?: Database["public"]["Enums"]["interest_level"] | null
          next_action?: string | null
          next_followup_date?: string | null
          remarks?: string | null
          salesman_id: string
          status?: Database["public"]["Enums"]["followup_status"]
        }
        Update: {
          competitor_info?: string | null
          contact_method?: Database["public"]["Enums"]["contact_method"]
          created_at?: string
          customer_id?: string
          customer_response?: string | null
          discussion?: string | null
          expected_purchase_date?: string | null
          followup_date?: string
          followup_time?: string | null
          id?: string
          inquiry_id?: string
          interest_level?: Database["public"]["Enums"]["interest_level"] | null
          next_action?: string | null
          next_followup_date?: string | null
          remarks?: string | null
          salesman_id?: string
          status?: Database["public"]["Enums"]["followup_status"]
        }
        Relationships: [
          {
            foreignKeyName: "followups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          budget: number | null
          competitor: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          exchange_required: boolean
          expected_purchase_date: string | null
          finance_required: boolean
          hp: string | null
          id: string
          inquiry_date: string
          inquiry_number: string
          interest_level: Database["public"]["Enums"]["interest_level"]
          model: string
          next_followup_date: string | null
          purchase_purpose: string | null
          remarks: string | null
          salesman_id: string
          source: string
          status: Database["public"]["Enums"]["inquiry_status"]
          subsidy_required: boolean
          updated_at: string
          variant: string | null
        }
        Insert: {
          budget?: number | null
          competitor?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          exchange_required?: boolean
          expected_purchase_date?: string | null
          finance_required?: boolean
          hp?: string | null
          id?: string
          inquiry_date?: string
          inquiry_number: string
          interest_level?: Database["public"]["Enums"]["interest_level"]
          model: string
          next_followup_date?: string | null
          purchase_purpose?: string | null
          remarks?: string | null
          salesman_id: string
          source?: string
          status?: Database["public"]["Enums"]["inquiry_status"]
          subsidy_required?: boolean
          updated_at?: string
          variant?: string | null
        }
        Update: {
          budget?: number | null
          competitor?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          exchange_required?: boolean
          expected_purchase_date?: string | null
          finance_required?: boolean
          hp?: string | null
          id?: string
          inquiry_date?: string
          inquiry_number?: string
          interest_level?: Database["public"]["Enums"]["interest_level"]
          model?: string
          next_followup_date?: string | null
          purchase_purpose?: string | null
          remarks?: string | null
          salesman_id?: string
          source?: string
          status?: Database["public"]["Enums"]["inquiry_status"]
          subsidy_required?: boolean
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_inquiries: {
        Row: {
          competitor: string | null
          created_at: string
          created_by: string | null
          id: string
          inquiry_id: string
          lost_date: string
          lost_reason: string
          remarks: string | null
        }
        Insert: {
          competitor?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inquiry_id: string
          lost_date?: string
          lost_reason: string
          remarks?: string | null
        }
        Update: {
          competitor?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inquiry_id?: string
          lost_date?: string
          lost_reason?: string
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lost_inquiries_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: true
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiations: {
        Row: {
          accessories: string | null
          competitor_quote: string | null
          created_at: string
          created_by: string | null
          customer_demand: number | null
          discount: number
          exchange_value: number
          final_expected_price: number
          finance: number
          id: string
          inquiry_id: string
          quoted_price: number
          remarks: string | null
          subsidy: number
          tractor_model: string | null
        }
        Insert: {
          accessories?: string | null
          competitor_quote?: string | null
          created_at?: string
          created_by?: string | null
          customer_demand?: number | null
          discount?: number
          exchange_value?: number
          final_expected_price?: number
          finance?: number
          id?: string
          inquiry_id: string
          quoted_price?: number
          remarks?: string | null
          subsidy?: number
          tractor_model?: string | null
        }
        Update: {
          accessories?: string | null
          competitor_quote?: string | null
          created_at?: string
          created_by?: string | null
          customer_demand?: number | null
          discount?: number
          exchange_value?: number
          final_expected_price?: number
          finance?: number
          id?: string
          inquiry_id?: string
          quoted_price?: number
          remarks?: string | null
          subsidy?: number
          tractor_model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      tractor_allocations: {
        Row: {
          allocated_by: string | null
          allocated_date: string
          booking_id: string
          chassis_number: string
          created_at: string
          customer_id: string
          engine_number: string
          id: string
          model: string | null
          tractor_stock_id: string
          variant: string | null
        }
        Insert: {
          allocated_by?: string | null
          allocated_date?: string
          booking_id: string
          chassis_number: string
          created_at?: string
          customer_id: string
          engine_number: string
          id?: string
          model?: string | null
          tractor_stock_id: string
          variant?: string | null
        }
        Update: {
          allocated_by?: string | null
          allocated_date?: string
          booking_id?: string
          chassis_number?: string
          created_at?: string
          customer_id?: string
          engine_number?: string
          id?: string
          model?: string | null
          tractor_stock_id?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tractor_allocations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tractor_allocations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tractor_allocations_tractor_stock_id_fkey"
            columns: ["tractor_stock_id"]
            isOneToOne: true
            referencedRelation: "tractor_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      tractor_stock: {
        Row: {
          chassis_number: string
          created_at: string
          engine_number: string
          hp: string | null
          id: string
          model: string
          status: Database["public"]["Enums"]["tractor_stock_status"]
          variant: string | null
        }
        Insert: {
          chassis_number: string
          created_at?: string
          engine_number: string
          hp?: string | null
          id?: string
          model: string
          status?: Database["public"]["Enums"]["tractor_stock_status"]
          variant?: string | null
        }
        Update: {
          chassis_number?: string
          created_at?: string
          engine_number?: string
          hp?: string | null
          id?: string
          model?: string
          status?: Database["public"]["Enums"]["tractor_stock_status"]
          variant?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_management: { Args: { _user_id: string }; Returns: boolean }
      is_receptionist: { Args: { _user_id: string }; Returns: boolean }
      log_activity: {
        Args: {
          _action: string
          _entity_id: string
          _entity_type: string
          _new: Json
          _old: Json
        }
        Returns: undefined
      }
      owns_booking: { Args: { _booking_id: string }; Returns: boolean }
      owns_inquiry: { Args: { _inquiry_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "ceo" | "manager" | "salesman" | "receptionist"
      booking_status:
        | "BOOKED"
        | "ALLOCATED"
        | "READY_FOR_DELIVERY"
        | "DELIVERED"
        | "CANCELLED"
      contact_method:
        | "Phone"
        | "WhatsApp"
        | "Visit"
        | "Showroom Visit"
        | "Demo"
        | "Other"
      customer_type: "Farmer" | "Contractor" | "Commercial" | "Other"
      demo_status: "PLANNED" | "COMPLETED" | "CANCELLED"
      followup_status: "PENDING" | "COMPLETED" | "CANCELLED"
      inquiry_status:
        | "NEW"
        | "CONTACTED"
        | "FOLLOW_UP"
        | "DEMO"
        | "NEGOTIATION"
        | "BOOKED"
        | "DELIVERED"
        | "LOST"
      interest_level: "HOT" | "WARM" | "COLD"
      payment_mode: "Cash" | "Bank" | "UPI" | "Cheque"
      tractor_stock_status: "AVAILABLE" | "RESERVED" | "SOLD"
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
      app_role: ["ceo", "manager", "salesman", "receptionist"],
      booking_status: [
        "BOOKED",
        "ALLOCATED",
        "READY_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      ],
      contact_method: [
        "Phone",
        "WhatsApp",
        "Visit",
        "Showroom Visit",
        "Demo",
        "Other",
      ],
      customer_type: ["Farmer", "Contractor", "Commercial", "Other"],
      demo_status: ["PLANNED", "COMPLETED", "CANCELLED"],
      followup_status: ["PENDING", "COMPLETED", "CANCELLED"],
      inquiry_status: [
        "NEW",
        "CONTACTED",
        "FOLLOW_UP",
        "DEMO",
        "NEGOTIATION",
        "BOOKED",
        "DELIVERED",
        "LOST",
      ],
      interest_level: ["HOT", "WARM", "COLD"],
      payment_mode: ["Cash", "Bank", "UPI", "Cheque"],
      tractor_stock_status: ["AVAILABLE", "RESERVED", "SOLD"],
    },
  },
} as const
