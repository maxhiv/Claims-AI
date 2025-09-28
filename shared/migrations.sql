-- Add new columns to existing claims table (safely extending existing structure)
-- This preserves existing data while adding property loss form fields

-- Policy Information
ALTER TABLE claims ADD COLUMN IF NOT EXISTS policy_name TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS policy_effective_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS policy_expiration_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS federal_id_number TEXT;

-- Enhanced Incident Information
ALTER TABLE claims ADD COLUMN IF NOT EXISTS incident_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS incident_time TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS date_insured_notified TIMESTAMP WITH TIME ZONE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS date_reported TIMESTAMP WITH TIME ZONE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS incident_state TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS occurred_on_premises BOOLEAN;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS location_inspected_immediately BOOLEAN;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS photos_taken BOOLEAN;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mortgage_on_property BOOLEAN;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS incident_description TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS cause_of_loss TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS cause_of_loss_other TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS category_of_loss TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS category_of_loss_other TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS damage_description TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS damage_estimate INTEGER; -- in cents

-- Authority Information
ALTER TABLE claims ADD COLUMN IF NOT EXISTS authorities_contacted BOOLEAN;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS police_contacted BOOLEAN;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS police_authority_name TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS police_report_number TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS police_violations TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS fire_contacted BOOLEAN;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS fire_authority_name TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS fire_report_number TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS fire_violations TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS other_authority_contacted BOOLEAN;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS other_authority_name TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS other_authority_phone TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS suspect_apprehended BOOLEAN;

-- Enhanced Insured Information
ALTER TABLE claims ADD COLUMN IF NOT EXISTS insured_cell_number TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS insured_fax TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS drivers_license_number TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS drivers_license_state TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS license_plate_number TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS license_plate_state TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS is_cargo_owner BOOLEAN;

-- Contact Preferences
ALTER TABLE claims ADD COLUMN IF NOT EXISTS best_contact_time_from TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS best_contact_time_to TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS best_contact_days TEXT[];
ALTER TABLE claims ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT;

-- Enhanced Location Information
ALTER TABLE claims ADD COLUMN IF NOT EXISTS loss_address_2 TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS loss_city TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS loss_state TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS loss_zip TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS loss_county TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS loss_country TEXT;

-- Mailing Address
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mailing_same_as_loss BOOLEAN DEFAULT TRUE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mailing_address TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mailing_address_2 TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mailing_city TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mailing_state TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mailing_zip TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mailing_county TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mailing_country TEXT;

-- Business Information
ALTER TABLE claims ADD COLUMN IF NOT EXISTS business_location TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS location_code_l1 TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS location_code_l2 TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS location_code_l3 TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS location_code_l4 TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS location_code_l5 TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS location_code_l6 TEXT;

-- Reporter Information
ALTER TABLE claims ADD COLUMN IF NOT EXISTS reported_by_first_name TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS reported_by_last_name TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS reporter_job_title TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS reporter_phone TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS reporter_email TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS is_reporter_contact BOOLEAN;

-- AI-Computed Fields
ALTER TABLE claims ADD COLUMN IF NOT EXISTS severity_level TEXT; -- critical, urgent, standard
ALTER TABLE claims ADD COLUMN IF NOT EXISTS priority_score INTEGER; -- 1-100
ALTER TABLE claims ADD COLUMN IF NOT EXISTS requires_immediate_response BOOLEAN;

-- Additional Management Fields
ALTER TABLE claims ADD COLUMN IF NOT EXISTS is_notice_only BOOLEAN DEFAULT FALSE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS additional_comments TEXT;

-- Create new stakeholders table
CREATE TABLE IF NOT EXISTS stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id),
  
  -- Stakeholder Type
  type TEXT NOT NULL, -- witness, emergency_contact, reporter, authority, mortgage_company
  role TEXT, -- primary_contact, witness, police_officer, fire_department, etc.
  
  -- Contact Information
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  phone TEXT,
  phone_ext TEXT,
  email TEXT,
  
  -- Address
  address TEXT,
  address_2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  county TEXT,
  country TEXT,
  
  -- Contact Preferences
  best_contact_time_from TEXT,
  best_contact_time_to TEXT,
  best_contact_days TEXT[],
  preferred_contact_method TEXT,
  
  -- Status
  contacted BOOLEAN DEFAULT FALSE,
  statement_collected BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create compliance items table
CREATE TABLE IF NOT EXISTS compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id),
  
  -- Item Details
  item_type TEXT NOT NULL, -- photo, report, statement, document
  category TEXT NOT NULL, -- authority_report, witness_statement, damage_photo, etc.
  description TEXT NOT NULL,
  required BOOLEAN DEFAULT TRUE,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, collected, reviewed, approved
  collected_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- File/Reference Information  
  file_path TEXT,
  file_type TEXT,
  reference_number TEXT, -- report numbers, etc.
  
  -- Metadata
  assigned_to UUID REFERENCES adjusters(id),
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add stakeholder reference to communications table
ALTER TABLE communications ADD COLUMN IF NOT EXISTS stakeholder_id UUID REFERENCES stakeholders(id);

-- Add stakeholder reference to consents table  
ALTER TABLE consents ADD COLUMN IF NOT EXISTS stakeholder_id UUID REFERENCES stakeholders(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_claims_severity ON claims(severity_level);
CREATE INDEX IF NOT EXISTS idx_claims_priority ON claims(priority_score);
CREATE INDEX IF NOT EXISTS idx_claims_incident_date ON claims(incident_date);
CREATE INDEX IF NOT EXISTS idx_claims_cause_of_loss ON claims(cause_of_loss);
CREATE INDEX IF NOT EXISTS idx_stakeholders_claim_id ON stakeholders(claim_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_type ON stakeholders(type);
CREATE INDEX IF NOT EXISTS idx_compliance_items_claim_id ON compliance_items(claim_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_status ON compliance_items(status);