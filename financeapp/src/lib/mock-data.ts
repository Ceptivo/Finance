export type ServiceType =
  | "Website Design"
  | "Website Hosting"
  | "Website Maintenance"
  | "AI Automation"
  | "AI WhatsApp Assistant"
  | "Notion Setup"
  | "CRM Setup"
  | "Consulting"
  | "Real Estate Automation"
  | "Custom Project"
  | "Other";

export type PaymentStatus = "Paid" | "Pending" | "Overdue";

export interface Earning {
  id: string;
  date: string;
  clientName: string;
  businessName: string;
  serviceType: ServiceType;
  amount: number;
  paymentMethod: string;
  status: PaymentStatus;
  notes?: string;
}

export interface Client {
  id: string;
  clientName: string;
  businessName: string;
  email: string;
  phone: string;
  monthlySubscription: number;
  oneTimeRevenue: number;
  totalRevenue: number;
  lastPaymentDate: string;
  nextPaymentDate: string;
  status: "Active" | "Paused" | "Cancelled";
  notes?: string;
}

export interface Subscription {
  id: string;
  client: string;
  type: string;
  monthlyFee: number;
  startDate: string;
  renewalDate: string;
  status: "Active" | "Paused" | "Cancelled";
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  cost: number;
}

export interface Deal {
  id: string;
  client: string;
  value: number;
  stage: "Lead" | "Contacted" | "Proposal Sent" | "Negotiation" | "Won" | "Lost";
  updated: string;
}

// All demo data cleared — real data lives in localStorage via src/lib/store.ts.
// These exports remain so legacy pages still compile while you build them out.

export const earnings: Earning[] = [];
export const clients: Client[] = [];
export const subscriptions: Subscription[] = [];
export const expenses: Expense[] = [];
export const deals: Deal[] = [];

export const monthlyRevenue: Array<{ month: string; revenue: number; expenses: number; profit: number }> = [];
export const incomeSources: Array<{ name: string; value: number }> = [];

export const totals = {
  revenueMonth: 0,
  revenueYear: 0,
  revenueLifetime: 0,
  expenseMonth: 0,
  expenseYear: 0,
  profitMonth: 0,
  profitYear: 0,
  profitLifetime: 0,
  mrr: 0,
  mrrNext: 0,
  activeClients: 0,
  newClientsMonth: 0,
  monthlyGoal: 12000,
};

export interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  revenueMonth: number;
  revenueYear: number;
  revenueLifetime: number;
  mrr: number;
  profitMargin: number;
  status: "Active" | "Scaling" | "Paused";
  trend: Array<{ month: string; revenue: number }>;
}

export const businesses: Business[] = [];

export interface PersonalSubscription {
  id: string;
  name: string;
  category: "AI" | "Software" | "Hosting" | "Productivity" | "Entertainment" | "Other";
  monthlyCost: number;
  billingCycle: "Monthly" | "Yearly";
  nextCharge: string;
  status: "Active" | "Paused";
}

export const personalSubscriptions: PersonalSubscription[] = [];
