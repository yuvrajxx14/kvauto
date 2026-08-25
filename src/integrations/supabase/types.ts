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
    PostgrestVersion: "14.17"
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
      booking_cancellations: {
        Row: {
          booking_id: string
          cancel_date: string
          cancelled_by: string | null
          created_at: string
          customer_id: string
          id: string
          reason: string
          refund_amount: number
          refund_mode: string | null
          remarks: string | null
        }
        Insert: {
          booking_id: string
          cancel_date?: string
          cancelled_by?: string | null
          created_at?: string
          customer_id: string
          id?: string
          reason: string
          refund_amount?: number
          refund_mode?: string | null
          remarks?: string | null
        }
        Update: {
          booking_id?: string
          cancel_date?: string
          cancelled_by?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          reason?: string
          refund_amount?: number
          refund_mode?: string | null
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_cancellations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_cancellations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          created_by: string | null
          id: string
          payment_date: string
          payment_mode: string
          payment_type: string
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
          payment_mode?: string
          payment_type?: string
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
          payment_mode?: string
          payment_type?: string
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
          cancelled_at: string | null
          created_at: string
          customer_id: string
          doc_charge_posted: boolean
          exchange_details: string | null
          exchange_required: boolean
          expected_delivery_date: string | null
          extra_charges: number
          final_price: number
          finance_company: string | null
          finance_required: boolean
          finance_type: string
          id: string
          inquiry_id: string
          loan_amount: number
          payment_mode: string | null
          remarks: string | null
          salesman_id: string
          status: string
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
          cancelled_at?: string | null
          created_at?: string
          customer_id: string
          doc_charge_posted?: boolean
          exchange_details?: string | null
          exchange_required?: boolean
          expected_delivery_date?: string | null
          extra_charges?: number
          final_price?: number
          finance_company?: string | null
          finance_required?: boolean
          finance_type?: string
          id?: string
          inquiry_id: string
          loan_amount?: number
          payment_mode?: string | null
          remarks?: string | null
          salesman_id: string
          status?: string
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
          cancelled_at?: string | null
          created_at?: string
          customer_id?: string
          doc_charge_posted?: boolean
          exchange_details?: string | null
          exchange_required?: boolean
          expected_delivery_date?: string | null
          extra_charges?: number
          final_price?: number
          finance_company?: string | null
          finance_required?: boolean
          finance_type?: string
          id?: string
          inquiry_id?: string
          loan_amount?: number
          payment_mode?: string | null
          remarks?: string | null
          salesman_id?: string
          status?: string
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
          {
            foreignKeyName: "bookings_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          created_at: string
          customer_id: string
          doc_type: string
          document_number: string | null
          expiry_date: string | null
          file_name: string | null
          file_path: string | null
          id: string
          remarks: string | null
          updated_at: string
          uploaded_by: string | null
          verification_status: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          doc_type: string
          document_number?: string | null
          expiry_date?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          remarks?: string | null
          updated_at?: string
          uploaded_by?: string | null
          verification_status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          doc_type?: string
          document_number?: string | null
          expiry_date?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          remarks?: string | null
          updated_at?: string
          uploaded_by?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
      deliveries: {
        Row: {
          booking_id: string
          created_at: string
          customer_id: string
          delivered_by: string | null
          delivery_date: string
          id: string
          odometer_hours: number | null
          remarks: string | null
          tractor_stock_id: string
          use_type: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          customer_id: string
          delivered_by?: string | null
          delivery_date?: string
          id?: string
          odometer_hours?: number | null
          remarks?: string | null
          tractor_stock_id: string
          use_type?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          customer_id?: string
          delivered_by?: string | null
          delivery_date?: string
          id?: string
          odometer_hours?: number | null
          remarks?: string | null
          tractor_stock_id?: string
          use_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_tractor_stock_id_fkey"
            columns: ["tractor_stock_id"]
            isOneToOne: false
            referencedRelation: "tractor_stock"
            referencedColumns: ["id"]
          },
        ]
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
      document_checklist: {
        Row: {
          active: boolean
          category: string
          created_at: string
          doc_type: string
          has_expiry: boolean
          has_number: boolean
          id: string
          is_required: boolean
          label: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          doc_type: string
          has_expiry?: boolean
          has_number?: boolean
          id?: string
          is_required?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          doc_type?: string
          has_expiry?: boolean
          has_number?: boolean
          id?: string
          is_required?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
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
      gate_passes: {
        Row: {
          booking_id: string
          chassis_number: string | null
          created_at: string
          customer_id: string
          engine_number: string | null
          gatepass_number: string
          id: string
          issue_date: string
          issued_by: string | null
          model: string | null
          remarks: string | null
          updated_at: string
          variant: string | null
        }
        Insert: {
          booking_id: string
          chassis_number?: string | null
          created_at?: string
          customer_id: string
          engine_number?: string | null
          gatepass_number: string
          id?: string
          issue_date?: string
          issued_by?: string | null
          model?: string | null
          remarks?: string | null
          updated_at?: string
          variant?: string | null
        }
        Update: {
          booking_id?: string
          chassis_number?: string | null
          created_at?: string
          customer_id?: string
          engine_number?: string | null
          gatepass_number?: string
          id?: string
          issue_date?: string
          issued_by?: string | null
          model?: string | null
          remarks?: string | null
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_passes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_passes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
      ledger_entries: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          direction: string
          entry_date: string
          id: string
          payment_id: string | null
          payment_mode: string | null
          reference_number: string | null
          remarks: string | null
          txn_type: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          direction: string
          entry_date?: string
          id?: string
          payment_id?: string | null
          payment_mode?: string | null
          reference_number?: string | null
          remarks?: string | null
          txn_type: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          direction?: string
          entry_date?: string
          id?: string
          payment_id?: string | null
          payment_mode?: string | null
          reference_number?: string | null
          remarks?: string | null
          txn_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "booking_payments"
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
      model_stock_config: {
        Row: {
          branch: string
          created_at: string
          id: string
          min_regular_stock: number
          model: string
          updated_at: string
        }
        Insert: {
          branch?: string
          created_at?: string
          id?: string
          min_regular_stock?: number
          model: string
          updated_at?: string
        }
        Update: {
          branch?: string
          created_at?: string
          id?: string
          min_regular_stock?: number
          model?: string
          updated_at?: string
        }
        Relationships: []
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
      passing_checklist: {
        Row: {
          created_at: string
          id: string
          is_done: boolean
          item_key: string
          label: string
          passing_id: string
          provided_by: string
          remarks: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_done?: boolean
          item_key: string
          label: string
          passing_id: string
          provided_by?: string
          remarks?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_done?: boolean
          item_key?: string
          label?: string
          passing_id?: string
          provided_by?: string
          remarks?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "passing_checklist_passing_id_fkey"
            columns: ["passing_id"]
            isOneToOne: false
            referencedRelation: "passing_records"
            referencedColumns: ["id"]
          },
        ]
      }
      passing_records: {
        Row: {
          booking_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          fitment_date: string | null
          form22_printed: boolean
          id: string
          insurance_policy_number: string | null
          insurance_received: boolean
          invoice_date: string | null
          invoice_number: string | null
          number_plate_ordered: boolean
          number_plate_ordered_date: string | null
          number_plate_received: boolean
          number_plate_received_date: string | null
          passing_set_printed: boolean
          passing_set_printed_date: string | null
          remarks: string | null
          rto_number: string | null
          rto_receipt_received: boolean
          screen_report_received: boolean
          sent_to_insurance: boolean
          sent_to_rto: boolean
          sent_to_rto_date: string | null
          set_sent_date: string | null
          set_sent_for_passing: boolean
          subsidy_file_created: boolean
          subsidy_file_date: string | null
          subsidy_file_printed: boolean
          subsidy_file_printed_date: string | null
          subsidy_file_status: string
          subsidy_file_uploaded_date: string | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          fitment_date?: string | null
          form22_printed?: boolean
          id?: string
          insurance_policy_number?: string | null
          insurance_received?: boolean
          invoice_date?: string | null
          invoice_number?: string | null
          number_plate_ordered?: boolean
          number_plate_ordered_date?: string | null
          number_plate_received?: boolean
          number_plate_received_date?: string | null
          passing_set_printed?: boolean
          passing_set_printed_date?: string | null
          remarks?: string | null
          rto_number?: string | null
          rto_receipt_received?: boolean
          screen_report_received?: boolean
          sent_to_insurance?: boolean
          sent_to_rto?: boolean
          sent_to_rto_date?: string | null
          set_sent_date?: string | null
          set_sent_for_passing?: boolean
          subsidy_file_created?: boolean
          subsidy_file_date?: string | null
          subsidy_file_printed?: boolean
          subsidy_file_printed_date?: string | null
          subsidy_file_status?: string
          subsidy_file_uploaded_date?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          fitment_date?: string | null
          form22_printed?: boolean
          id?: string
          insurance_policy_number?: string | null
          insurance_received?: boolean
          invoice_date?: string | null
          invoice_number?: string | null
          number_plate_ordered?: boolean
          number_plate_ordered_date?: string | null
          number_plate_received?: boolean
          number_plate_received_date?: string | null
          passing_set_printed?: boolean
          passing_set_printed_date?: string | null
          remarks?: string | null
          rto_number?: string | null
          rto_receipt_received?: boolean
          screen_report_received?: boolean
          sent_to_insurance?: boolean
          sent_to_rto?: boolean
          sent_to_rto_date?: string | null
          set_sent_date?: string | null
          set_sent_for_passing?: boolean
          subsidy_file_created?: boolean
          subsidy_file_date?: string | null
          subsidy_file_printed?: boolean
          subsidy_file_printed_date?: string | null
          subsidy_file_status?: string
          subsidy_file_uploaded_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "passing_records_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passing_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          created_by: string | null
          hp: string | null
          id: string
          model: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          hp?: string | null
          id?: string
          model: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          hp?: string | null
          id?: string
          model?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      service_checklist: {
        Row: {
          created_at: string
          id: string
          is_done: boolean
          item_key: string
          label: string
          remarks: string | null
          service_job_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_done?: boolean
          item_key: string
          label: string
          remarks?: string | null
          service_job_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_done?: boolean
          item_key?: string
          label?: string
          remarks?: string | null
          service_job_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_checklist_service_job_id_fkey"
            columns: ["service_job_id"]
            isOneToOne: false
            referencedRelation: "service_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      service_jobs: {
        Row: {
          assigned_to: string | null
          chassis_number: string | null
          complaint: string | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          hours_reading: number | null
          id: string
          job_number: string
          labour_amount: number
          mobile: string
          model: string | null
          parts_amount: number
          parts_details: string | null
          planned_visit_date: string | null
          priority: string
          problem_category: string | null
          promised_date: string | null
          received_date: string
          registration_number: string | null
          remarks: string | null
          service_mode: string
          service_type: string
          status: string
          taluka: string | null
          total_amount: number
          updated_at: string
          village: string
          work_done: string | null
        }
        Insert: {
          assigned_to?: string | null
          chassis_number?: string | null
          complaint?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          hours_reading?: number | null
          id?: string
          job_number: string
          labour_amount?: number
          mobile: string
          model?: string | null
          parts_amount?: number
          parts_details?: string | null
          planned_visit_date?: string | null
          priority?: string
          problem_category?: string | null
          promised_date?: string | null
          received_date?: string
          registration_number?: string | null
          remarks?: string | null
          service_mode?: string
          service_type?: string
          status?: string
          taluka?: string | null
          total_amount?: number
          updated_at?: string
          village: string
          work_done?: string | null
        }
        Update: {
          assigned_to?: string | null
          chassis_number?: string | null
          complaint?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          hours_reading?: number | null
          id?: string
          job_number?: string
          labour_amount?: number
          mobile?: string
          model?: string | null
          parts_amount?: number
          parts_details?: string | null
          planned_visit_date?: string | null
          priority?: string
          problem_category?: string | null
          promised_date?: string | null
          received_date?: string
          registration_number?: string | null
          remarks?: string | null
          service_mode?: string
          service_type?: string
          status?: string
          taluka?: string | null
          total_amount?: number
          updated_at?: string
          village?: string
          work_done?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_jobs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_route_stops: {
        Row: {
          created_at: string
          done: boolean
          id: string
          remarks: string | null
          route_id: string
          service_job_id: string
          village: string
          visit_order: number
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          remarks?: string | null
          route_id: string
          service_job_id: string
          village: string
          visit_order?: number
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          remarks?: string | null
          route_id?: string
          service_job_id?: string
          village?: string
          visit_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "service_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_route_stops_service_job_id_fkey"
            columns: ["service_job_id"]
            isOneToOne: false
            referencedRelation: "service_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      service_routes: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          id: string
          remarks: string | null
          route_number: string
          status: string
          updated_at: string
          villages: string[]
          visit_date: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          remarks?: string | null
          route_number: string
          status?: string
          updated_at?: string
          villages?: string[]
          visit_date?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          remarks?: string | null
          route_number?: string
          status?: string
          updated_at?: string
          villages?: string[]
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_routes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spare_request_items: {
        Row: {
          created_at: string
          id: string
          part_name: string
          part_number: string | null
          qty_issued: number
          qty_requested: number
          rate: number
          remarks: string | null
          request_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          part_name: string
          part_number?: string | null
          qty_issued?: number
          qty_requested?: number
          rate?: number
          remarks?: string | null
          request_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          part_name?: string
          part_number?: string | null
          qty_issued?: number
          qty_requested?: number
          rate?: number
          remarks?: string | null
          request_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spare_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "spare_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      spare_requests: {
        Row: {
          approved_by: string | null
          chassis_number: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          issued_at: string | null
          issued_by: string | null
          mobile: string | null
          model: string | null
          needed_by: string | null
          priority: string
          remarks: string | null
          request_number: string
          request_type: string
          requested_by: string | null
          requester_name: string
          service_job_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          chassis_number?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          mobile?: string | null
          model?: string | null
          needed_by?: string | null
          priority?: string
          remarks?: string | null
          request_number?: string
          request_type?: string
          requested_by?: string | null
          requester_name: string
          service_job_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          chassis_number?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          mobile?: string | null
          model?: string | null
          needed_by?: string | null
          priority?: string
          remarks?: string | null
          request_number?: string
          request_type?: string
          requested_by?: string | null
          requester_name?: string
          service_job_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spare_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spare_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spare_requests_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spare_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spare_requests_service_job_id_fkey"
            columns: ["service_job_id"]
            isOneToOne: false
            referencedRelation: "service_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_documents: {
        Row: {
          created_at: string
          doc_type: string
          document_number: string | null
          file_name: string | null
          file_path: string
          id: string
          remarks: string | null
          tractor_stock_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          doc_type: string
          document_number?: string | null
          file_name?: string | null
          file_path: string
          id?: string
          remarks?: string | null
          tractor_stock_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          document_number?: string | null
          file_name?: string | null
          file_path?: string
          id?: string
          remarks?: string | null
          tractor_stock_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_documents_tractor_stock_id_fkey"
            columns: ["tractor_stock_id"]
            isOneToOne: false
            referencedRelation: "tractor_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subsidy_cases: {
        Row: {
          application_date: string | null
          application_status: string
          approval_date: string | null
          approval_status: string
          booking_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_date: string | null
          delivery_id: string | null
          id: string
          insurance_amount: number
          insurance_charged: boolean
          insurance_required: boolean
          remarks: string | null
          updated_at: string
          use_type: string
        }
        Insert: {
          application_date?: string | null
          application_status?: string
          approval_date?: string | null
          approval_status?: string
          booking_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_date?: string | null
          delivery_id?: string | null
          id?: string
          insurance_amount?: number
          insurance_charged?: boolean
          insurance_required?: boolean
          remarks?: string | null
          updated_at?: string
          use_type?: string
        }
        Update: {
          application_date?: string | null
          application_status?: string
          approval_date?: string | null
          approval_status?: string
          booking_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_date?: string | null
          delivery_id?: string | null
          id?: string
          insurance_amount?: number
          insurance_charged?: boolean
          insurance_required?: boolean
          remarks?: string | null
          updated_at?: string
          use_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "subsidy_cases_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subsidy_cases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subsidy_cases_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_invoices: {
        Row: {
          booking_id: string
          buyer_address: string | null
          buyer_gstin: string | null
          buyer_mobile: string | null
          buyer_name: string
          cgst: number
          chassis_number: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string
          engine_number: string | null
          fy_code: string
          grand_total: number
          gst_rate: number
          hpa_hypo: string | null
          hsn_code: string
          id: string
          invoice_date: string
          invoice_number: string
          month_code: string
          place_of_supply: string
          prefix: string
          quantity: number
          rate: number
          remarks: string | null
          round_off: number
          seq: number
          sgst: number
          taxable_value: number
          updated_at: string
        }
        Insert: {
          booking_id: string
          buyer_address?: string | null
          buyer_gstin?: string | null
          buyer_mobile?: string | null
          buyer_name: string
          cgst: number
          chassis_number?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description: string
          engine_number?: string | null
          fy_code: string
          grand_total: number
          gst_rate?: number
          hpa_hypo?: string | null
          hsn_code?: string
          id?: string
          invoice_date?: string
          invoice_number: string
          month_code: string
          place_of_supply?: string
          prefix?: string
          quantity?: number
          rate: number
          remarks?: string | null
          round_off?: number
          seq: number
          sgst: number
          taxable_value: number
          updated_at?: string
        }
        Update: {
          booking_id?: string
          buyer_address?: string | null
          buyer_gstin?: string | null
          buyer_mobile?: string | null
          buyer_name?: string
          cgst?: number
          chassis_number?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string
          engine_number?: string | null
          fy_code?: string
          grand_total?: number
          gst_rate?: number
          hpa_hypo?: string | null
          hsn_code?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          month_code?: string
          place_of_supply?: string
          prefix?: string
          quantity?: number
          rate?: number
          remarks?: string | null
          round_off?: number
          seq?: number
          sgst?: number
          taxable_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
      tractor_orders: {
        Row: {
          approved_by: string | null
          branch: string
          created_at: string
          created_by: string | null
          expected_arrival_date: string | null
          id: string
          model: string
          order_date: string
          order_number: string
          quantity: number
          remarks: string | null
          status: string
          supplier: string | null
          updated_at: string
          variant: string | null
        }
        Insert: {
          approved_by?: string | null
          branch?: string
          created_at?: string
          created_by?: string | null
          expected_arrival_date?: string | null
          id?: string
          model: string
          order_date?: string
          order_number: string
          quantity?: number
          remarks?: string | null
          status?: string
          supplier?: string | null
          updated_at?: string
          variant?: string | null
        }
        Update: {
          approved_by?: string | null
          branch?: string
          created_at?: string
          created_by?: string | null
          expected_arrival_date?: string | null
          id?: string
          model?: string
          order_date?: string
          order_number?: string
          quantity?: number
          remarks?: string | null
          status?: string
          supplier?: string | null
          updated_at?: string
          variant?: string | null
        }
        Relationships: []
      }
      tractor_stock: {
        Row: {
          arrival_date: string | null
          branch: string
          chassis_number: string
          colour: string | null
          created_at: string
          delivery_check_remarks: string | null
          delivery_check_status: string
          engine_number: string
          hp: string | null
          id: string
          inspection_remarks: string | null
          inspection_status: string
          location: string
          mfg_year: string | null
          model: string
          order_id: string | null
          order_reference: string | null
          pdi_remarks: string | null
          pdi_status: string
          status: string
          updated_at: string
          variant: string | null
        }
        Insert: {
          arrival_date?: string | null
          branch?: string
          chassis_number: string
          colour?: string | null
          created_at?: string
          delivery_check_remarks?: string | null
          delivery_check_status?: string
          engine_number: string
          hp?: string | null
          id?: string
          inspection_remarks?: string | null
          inspection_status?: string
          location?: string
          mfg_year?: string | null
          model: string
          order_id?: string | null
          order_reference?: string | null
          pdi_remarks?: string | null
          pdi_status?: string
          status?: string
          updated_at?: string
          variant?: string | null
        }
        Update: {
          arrival_date?: string | null
          branch?: string
          chassis_number?: string
          colour?: string | null
          created_at?: string
          delivery_check_remarks?: string | null
          delivery_check_status?: string
          engine_number?: string
          hp?: string | null
          id?: string
          inspection_remarks?: string | null
          inspection_status?: string
          location?: string
          mfg_year?: string | null
          model?: string
          order_id?: string | null
          order_reference?: string | null
          pdi_remarks?: string | null
          pdi_status?: string
          status?: string
          updated_at?: string
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
      allocate_tractor_atomic: {
        Args: { _booking_id: string; _tractor_stock_id: string }
        Returns: string
      }
      cancel_booking_atomic: {
        Args: {
          _booking_id: string
          _reason: string
          _refund_amount: number
          _refund_mode: string
          _remarks: string
        }
        Returns: string
      }
      complete_delivery_atomic: {
        Args: {
          _application_date?: string
          _application_status?: string
          _approval_date?: string
          _approval_status?: string
          _booking_id: string
          _delivery_date: string
          _remarks: string
          _use_type?: string
        }
        Returns: string
      }
      create_booking_atomic: {
        Args: {
          _booking_amount: number
          _booking_date: string
          _final_price: number
          _finance_type?: string
          _inquiry_id: string
          _loan_amount?: number
          _payment_mode?: string
          _remarks: string
          _salesman_id: string
          _tractor_model: string
          _variant: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_management: { Args: { _user_id: string }; Returns: boolean }
      is_receptionist: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_workshop: { Args: { _user_id: string }; Returns: boolean }
      issue_gate_pass: {
        Args: { _booking_id: string; _issue_date?: string; _remarks?: string }
        Returns: string
      }
      issue_tax_invoice: {
        Args: {
          _booking_id: string
          _buyer_address: string
          _buyer_gstin: string
          _description: string
          _gst_rate: number
          _hpa_hypo: string
          _hsn_code: string
          _invoice_date: string
          _place_of_supply: string
          _prefix?: string
          _rate: number
        }
        Returns: string
      }
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
      owns_customer: { Args: { _customer_id: string }; Returns: boolean }
      owns_inquiry: { Args: { _inquiry_id: string }; Returns: boolean }
      post_extra_charge_atomic: {
        Args: {
          _amount: number
          _booking_id: string
          _kind: string
          _remarks: string
        }
        Returns: undefined
      }
      receive_booking_payment_atomic: {
        Args: {
          _amount: number
          _booking_id: string
          _payment_date: string
          _payment_mode: string
          _payment_type?: string
          _reference_number: string
          _remarks: string
        }
        Returns: string
      }
      staff_directory: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
          phone: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "ceo"
        | "manager"
        | "salesman"
        | "receptionist"
        | "workshop_manager"
        | "mechanic"
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
      app_role: [
        "ceo",
        "manager",
        "salesman",
        "receptionist",
        "workshop_manager",
        "mechanic",
      ],
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
