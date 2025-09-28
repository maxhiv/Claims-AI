export type ClaimStage = 'Intake'|'Inspection Scheduled'|'Inspection Complete'|'Estimate Written'|'Carrier Approval Pending'|'Closed';
export type Claim = {
  id: string; claimNumber: string; policyNumber?: string; carrier?: string;
  insured: { name: string; phone?: string; email?: string; language?: string };
  lossLocation: { address: string; lat?: number; lng?: number };
  peril?: string; slaDue?: string; adjusterId: string; stage: ClaimStage;
};
export type Appointment = {
  id: string; claimId: string; start: string; end: string;
  status: 'proposed'|'pending'|'confirmed'|'canceled'|'completed';
  location: { address: string; lat?: number; lng?: number };
  channel?: 'sms'|'email'|'voice'; messageId?: string; notes?: string;
  idempotencyKey?: string; version: number;
};
export type Communication = {
  id: string; claimId: string; kind: 'sms'|'email'|'voice'; direction: 'out'|'in';
  providerId?: string; templateKey?: string; bodyPreview?: string; language?: string;
  consentState?: 'opted_in'|'opted_out'|'unknown'; timestamp: string; userId?: string;
};
