export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'employee';
}

export interface Contract {
  id?: number;
  title: string;
  partner_name: string;
  category: string;
  start_date: string;
  end_date: string;
  notice_period_days: number;
  auto_renewal: number; // 0 or 1
  cost_amount: number;
  cost_currency: string;
  responsible_person: string;
  responsible_email: string;
  external_system_link?: string;
  status: 'active' | 'terminated' | 'expired' | 'draft';
  created_at?: string;
  updated_at?: string;
  created_by?: number;
}

export interface Alert {
  id: number;
  contract_id: number;
  contract_title: string; // Joined from contract
  alert_type: 'expiry' | 'notice_period';
  message: string;
  created_at: string;
  is_read: number; // 0 or 1
}

export interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  expiringSoon: number;
  unreadAlerts: number;
  monthlyCost: number;
}

export interface Attachment {
  id: number;
  contract_id: number;
  filename: string;
  original_name: string;
  uploaded_at: string;
  size: number;
}

export interface AuditLog {
  id: number;
  contract_id: number;
  user_name: string;
  action: string;
  details: string;
  timestamp: string;
}