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
      admin_income_ledger: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string
          id?: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          created_at: string
          id: string
          proof_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          proof_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          proof_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ledger: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          borrower_id: string
          collateral_amount: number
          created_at: string
          duration_days: number
          id: string
          interest_rate: number
          lender_id: string | null
          principal: number
          status: string
          updated_at: string
        }
        Insert: {
          borrower_id: string
          collateral_amount?: number
          created_at?: string
          duration_days?: number
          id?: string
          interest_rate?: number
          lender_id?: string | null
          principal: number
          status?: string
          updated_at?: string
        }
        Update: {
          borrower_id?: string
          collateral_amount?: number
          created_at?: string
          duration_days?: number
          id?: string
          interest_rate?: number
          lender_id?: string | null
          principal?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          frozen_balance: number
          id: string
          kyc_status: string
          last_name: string
          lending_balance: number
          referral_code: string | null
          referred_by: string | null
          tier: string
          updated_at: string
          user_id: string
          vault_balance: number
        }
        Insert: {
          created_at?: string
          email?: string
          first_name?: string
          frozen_balance?: number
          id?: string
          kyc_status?: string
          last_name?: string
          lending_balance?: number
          referral_code?: string | null
          referred_by?: string | null
          tier?: string
          updated_at?: string
          user_id: string
          vault_balance?: number
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          frozen_balance?: number
          id?: string
          kyc_status?: string
          last_name?: string
          lending_balance?: number
          referral_code?: string | null
          referred_by?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
          vault_balance?: number
        }
        Relationships: []
      }
      profit_distribution_history: {
        Row: {
          created_at: string
          distributed_amount: number
          id: string
          total_profit: number
          year: number
        }
        Insert: {
          created_at?: string
          distributed_amount?: number
          id?: string
          total_profit?: number
          year: number
        }
        Update: {
          created_at?: string
          distributed_amount?: number
          id?: string
          total_profit?: number
          year?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          level: number
          referred_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: number
          referred_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          referred_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account_holder: string
          account_number: string
          amount: number
          bank_name: string
          created_at: string
          fee: number
          id: string
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder?: string
          account_number?: string
          amount: number
          bank_name?: string
          created_at?: string
          fee?: number
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          amount?: number
          bank_name?: string
          created_at?: string
          fee?: number
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atomic_approve_deposit: {
        Args: { p_deposit_id: string; p_fee_pct: number }
        Returns: Json
      }
      atomic_approve_withdrawal: {
        Args: { p_withdrawal_id: string }
        Returns: Json
      }
      atomic_daily_interest: {
        Args: {
          p_lender_share: number
          p_loan_id: string
          p_system_share: number
        }
        Returns: Json
      }
      atomic_default_loan: { Args: { p_loan_id: string }; Returns: Json }
      atomic_fund_loan: {
        Args: { p_lender_id: string; p_loan_id: string }
        Returns: Json
      }
      atomic_lock_collateral: {
        Args: { p_amount: number; p_user_id: string }
        Returns: Json
      }
      atomic_referral_commission: {
        Args: { p_amount: number; p_level: number; p_user_id: string }
        Returns: Json
      }
      atomic_reject_loan: {
        Args: { p_loan_id: string; p_rejection_reason?: string }
        Returns: Json
      }
      atomic_release_collateral: { Args: { p_loan_id: string }; Returns: Json }
      atomic_repay_loan: {
        Args: {
          p_borrower_id: string
          p_lender_share_pct: number
          p_loan_id: string
        }
        Returns: Json
      }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "member" | "governor"
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
      app_role: ["member", "governor"],
    },
  },
} as const
