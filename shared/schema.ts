// TypeScript types for enhanced database schema
// (Raw SQL approach - no Drizzle ORM)

export type SeverityLevel = 'critical' | 'urgent' | 'standard';
export type StakeholderType = 'witness' | 'emergency_contact' | 'reporter' | 'authority' | 'mortgage_company';
export type ContactMethod = 'email' | 'phone' | 'sms' | 'whatsapp';
export type ComplianceStatus = 'pending' | 'collected' | 'reviewed' | 'approved';

// Enhanced Claim type with all property loss form fields
export interface EnhancedClaim {
  id: string;
  claim_number: string;
  
  // Policy Information
  policy_number?: string;
  policy_name?: string;
  policy_effective_date?: string;
  policy_expiration_date?: string;
  carrier?: string;
  federal_id_number?: string;
  
  // Incident Information
  peril?: string;
  incident_date?: string;
  incident_time?: string;
  date_insured_notified?: string;
  date_reported?: string;
  incident_state?: string;
  occurred_on_premises?: boolean;
  location_inspected_immediately?: boolean;
  photos_taken?: boolean;
  mortgage_on_property?: boolean;
  incident_description?: string;
  cause_of_loss?: string;
  cause_of_loss_other?: string;
  category_of_loss?: string;
  category_of_loss_other?: string;
  damage_description?: string;
  damage_estimate?: number; // in cents
  
  // Authority Information
  authorities_contacted?: boolean;
  police_contacted?: boolean;
  police_authority_name?: string;
  police_report_number?: string;
  police_violations?: string;
  fire_contacted?: boolean;
  fire_authority_name?: string;
  fire_report_number?: string;
  fire_violations?: string;
  other_authority_contacted?: boolean;
  other_authority_name?: string;
  other_authority_phone?: string;
  suspect_apprehended?: boolean;
  
  // Insured Information
  insured_name?: string;
  insured_phone?: string;
  insured_email?: string;
  insured_language?: string;
  insured_cell_number?: string;
  insured_fax?: string;
  drivers_license_number?: string;
  drivers_license_state?: string;
  license_plate_number?: string;
  license_plate_state?: string;
  is_cargo_owner?: boolean;
  
  // Contact Preferences
  best_contact_time_from?: string;
  best_contact_time_to?: string;
  best_contact_days?: string[];
  preferred_contact_method?: ContactMethod;
  
  // Location Information
  loss_address?: string;
  loss_address_2?: string;
  loss_city?: string;
  loss_state?: string;
  loss_zip?: string;
  loss_county?: string;
  loss_country?: string;
  loss_lat?: number;
  loss_lng?: number;
  
  // Mailing Address (if different)
  mailing_same_as_loss?: boolean;
  mailing_address?: string;
  mailing_address_2?: string;
  mailing_city?: string;
  mailing_state?: string;
  mailing_zip?: string;
  mailing_county?: string;
  mailing_country?: string;
  
  // Business Information
  business_location?: string;
  location_code_l1?: string;
  location_code_l2?: string;
  location_code_l3?: string;
  location_code_l4?: string;
  location_code_l5?: string;
  location_code_l6?: string;
  
  // Reporter Information
  reported_by_first_name?: string;
  reported_by_last_name?: string;
  reporter_job_title?: string;
  reporter_phone?: string;
  reporter_email?: string;
  is_reporter_contact?: boolean;
  
  // AI-Computed Fields
  severity_level?: SeverityLevel;
  priority_score?: number; // 1-100
  requires_immediate_response?: boolean;
  
  // Management Fields
  adjuster_id: string;
  stage: string;
  sla_due?: string;
  is_notice_only?: boolean;
  additional_comments?: string;
  
  created_at?: string;
  updated_at?: string;
}

// Stakeholder for managing witnesses, contacts, authorities, etc.
export interface Stakeholder {
  id: string;
  claim_id: string;
  
  // Stakeholder Type
  type: StakeholderType;
  role?: string; // primary_contact, witness, police_officer, fire_department, etc.
  
  // Contact Information
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
  phone_ext?: string;
  email?: string;
  
  // Address
  address?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  country?: string;
  
  // Contact Preferences
  best_contact_time_from?: string;
  best_contact_time_to?: string;
  best_contact_days?: string[];
  preferred_contact_method?: ContactMethod;
  
  // Status
  contacted?: boolean;
  statement_collected?: boolean;
  
  created_at?: string;
  updated_at?: string;
}

// Compliance and Documentation tracking
export interface ComplianceItem {
  id: string;
  claim_id: string;
  
  // Item Details
  item_type: string; // photo, report, statement, document
  category: string; // authority_report, witness_statement, damage_photo, etc.
  description: string;
  required?: boolean;
  
  // Status
  status?: ComplianceStatus;
  collected_date?: string;
  due_date?: string;
  
  // File/Reference Information  
  file_path?: string;
  file_type?: string;
  reference_number?: string; // report numbers, etc.
  
  // Metadata
  assigned_to?: string; // adjuster ID
  notes?: string;
  
  created_at?: string;
  updated_at?: string;
}

// Incident severity classification for AI scheduling
export interface IncidentClassification {
  severity: SeverityLevel;
  priority: number;
  requires_immediate_response: boolean;
  recommended_sla_hours: number;
  reasoning: string;
}