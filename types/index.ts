// Database types

export interface Report {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  corporation: string;
  address: string;
  certificate_date: string;
  expiry_date: string;
  status: 'draft' | 'reviewed' | 'sent';
  risk_rating: 'GREEN' | 'YELLOW' | 'RED';
  analysis: AnalysisResult;
  created_at: string;
  updated_at: string;
}

export interface AnalysisResult {
  summary: {
    verified: number;
    warnings: number;
    missing: number;
    total: number;
  };
  sections: Record<string, Section>;
  issues: Issue[];
  raw_text?: string;
}

export interface Section {
  title: string;
  items: ExtractedItem[];
}

export interface ExtractedItem {
  id: string;
  label: string;
  value: string;
  page: number | null;
  status: 'ok' | 'warning' | 'missing';
  confidence: 'high' | 'medium' | 'low';
  quote: string | null;
  reason: string;
}

export interface Issue {
  id: number;
  severity: 'high' | 'warning' | 'low';
  title: string;
  page: number;
  finding: string;
  regulation: string;
  recommendation: string;
  quote: string;
}

export interface AuditLogEntry {
  id: string;
  report_id: string;
  user_id: string;
  action: string;
  detail: string;
  created_at: string;
}

export interface UserNote {
  id: string;
  report_id: string;
  item_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface UserVerification {
  id: string;
  report_id: string;
  item_id: string;
  verified: boolean;
  created_at: string;
}

// User & Auth types

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  firm_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: 'free' | 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'incomplete';
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  certificates_used: number;
  certificates_limit: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentHistory {
  id: string;
  user_id: string;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  description: string | null;
  created_at: string;
}

// API types

export interface AnalyzeRequest {
  file: File;
}

export interface AnalyzeResponse {
  success: boolean;
  report_id?: string;
  error?: string;
}

// Claude extraction types

export interface ClaudeExtractionPrompt {
  role: 'user' | 'assistant';
  content: string;
}

export interface ExtractionResult {
  corporation: string;
  unit?: string;
  parking?: string;
  locker?: string;
  address: string;
  owner?: string;
  common_interest?: string;
  certificate_date: string;
  expiry_date: string;
  sections: Record<string, Section>;
  issues: Issue[];
  risk_rating: 'GREEN' | 'YELLOW' | 'RED';
  summary?: {
    total_items: number;
    verified: number;
    warnings: number;
    missing: number;
  };
}

export interface ExtractedItem {
  id: string;
  key?: string;
  label: string;
  value: string;
  page?: number | null;
  status: 'ok' | 'warning' | 'error' | 'missing';
  confidence: 'high' | 'medium' | 'low';
  quote?: string | null;
  reason?: string;
}

// Plan types

export interface Plan {
  id: string;
  name: string;
  price: number;
  priceId?: string;
  certificates: number;
  features: string[];
}
