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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          color: string | null
          created_at: string
          currency: string
          icon: string | null
          id: string
          is_liability: boolean
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          color?: string | null
          created_at?: string
          currency?: string
          icon?: string | null
          id?: string
          is_liability?: boolean
          name: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          color?: string | null
          created_at?: string
          currency?: string
          icon?: string | null
          id?: string
          is_liability?: boolean
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_recommendations: {
        Row: {
          content: Json
          created_at: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          kind: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          kind?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          kind?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_markets: {
        Row: {
          baseline_price: number | null
          category: string
          created_at: string
          id: string
          invested_amount: number
          label: string
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          baseline_price?: number | null
          category?: string
          created_at?: string
          id?: string
          invested_amount?: number
          label: string
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          baseline_price?: number | null
          category?: string
          created_at?: string
          id?: string
          invested_amount?: number
          label?: string
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          account_id: string | null
          amount: number
          category: string | null
          created_at: string
          id: string
          merchant: string
          notes: string | null
          occurred_at: string | null
          occurred_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string | null
          created_at?: string
          id?: string
          merchant: string
          notes?: string | null
          occurred_at?: string | null
          occurred_on?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string | null
          created_at?: string
          id?: string
          merchant?: string
          notes?: string | null
          occurred_at?: string | null
          occurred_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_health_scores: {
        Row: {
          created_at: string
          id: string
          improvements: Json | null
          risk_level: string | null
          score: number
          strengths: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          improvements?: Json | null
          risk_level?: string | null
          score: number
          strengths?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          improvements?: Json | null
          risk_level?: string | null
          score?: number
          strengths?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          account_id: string | null
          amount: number
          category: string | null
          created_at: string
          id: string
          notes: string | null
          occurred_at: string | null
          occurred_on: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          occurred_at?: string | null
          occurred_on?: string
          source: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          occurred_at?: string | null
          occurred_on?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_goals: {
        Row: {
          category: string | null
          created_at: string
          current_amount: number
          id: string
          name: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_amount?: number
          id?: string
          name: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          current_amount?: number
          id?: string
          name?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      market_data_cache: {
        Row: {
          data: Json
          fetched_at: string
          id: string
          source: string
          symbol: string
        }
        Insert: {
          data: Json
          fetched_at?: string
          id?: string
          source: string
          symbol: string
        }
        Update: {
          data?: Json
          fetched_at?: string
          id?: string
          source?: string
          symbol?: string
        }
        Relationships: []
      }
      monthly_contributions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          id: string
          month: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          id?: string
          month: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          id?: string
          month?: string
          user_id?: string
        }
        Relationships: []
      }
      past_statements: {
        Row: {
          coaching: Json | null
          created_at: string
          currency: string | null
          id: string
          insights: string | null
          label: string
          net: number
          parsed: Json
          period_end: string | null
          period_start: string | null
          source_filename: string | null
          total_expense: number
          total_income: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coaching?: Json | null
          created_at?: string
          currency?: string | null
          id?: string
          insights?: string | null
          label: string
          net?: number
          parsed?: Json
          period_end?: string | null
          period_start?: string | null
          source_filename?: string | null
          total_expense?: number
          total_income?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coaching?: Json | null
          created_at?: string
          currency?: string | null
          id?: string
          insights?: string | null
          label?: string
          net?: number
          parsed?: Json
          period_end?: string | null
          period_start?: string | null
          source_filename?: string | null
          total_expense?: number
          total_income?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_holdings: {
        Row: {
          asset_type: string | null
          cost_basis: number
          created_at: string
          current_value: number
          id: string
          name: string
          quantity: number | null
          symbol: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_type?: string | null
          cost_basis?: number
          created_at?: string
          current_value?: number
          id?: string
          name: string
          quantity?: number | null
          symbol?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_type?: string | null
          cost_basis?: number
          created_at?: string
          current_value?: number
          id?: string
          name?: string
          quantity?: number | null
          symbol?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          account_id: string | null
          amount: number
          billing_end: string | null
          billing_start: string | null
          category: string | null
          created_at: string
          cycle: string
          id: string
          name: string
          next_renewal: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          billing_end?: string | null
          billing_start?: string | null
          category?: string | null
          created_at?: string
          cycle?: string
          id?: string
          name: string
          next_renewal?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          billing_end?: string | null
          billing_start?: string | null
          category?: string | null
          created_at?: string
          cycle?: string
          id?: string
          name?: string
          next_renewal?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      users_financial_profiles: {
        Row: {
          age: number | null
          country: string | null
          created_at: string
          currency: string | null
          emergency_fund: number | null
          existing_investments: number | null
          id: string
          investment_goal: string | null
          knowledge_level: string | null
          monthly_expenses: number | null
          monthly_income: number | null
          monthly_savings: number | null
          monthly_savings_goal: number | null
          risk_tolerance: string | null
          time_horizon: string | null
          total_debt: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          country?: string | null
          created_at?: string
          currency?: string | null
          emergency_fund?: number | null
          existing_investments?: number | null
          id?: string
          investment_goal?: string | null
          knowledge_level?: string | null
          monthly_expenses?: number | null
          monthly_income?: number | null
          monthly_savings?: number | null
          monthly_savings_goal?: number | null
          risk_tolerance?: string | null
          time_horizon?: string | null
          total_debt?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          country?: string | null
          created_at?: string
          currency?: string | null
          emergency_fund?: number | null
          existing_investments?: number | null
          id?: string
          investment_goal?: string | null
          knowledge_level?: string | null
          monthly_expenses?: number | null
          monthly_income?: number | null
          monthly_savings?: number | null
          monthly_savings_goal?: number | null
          risk_tolerance?: string | null
          time_horizon?: string | null
          total_debt?: number | null
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
