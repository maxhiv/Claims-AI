'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PropertyLossForm from '../../../components/forms/PropertyLossForm';
import { EnhancedClaim, SeverityLevel } from '../../../../../shared/schema';

// Severity classification logic
function classifyIncidentSeverity(claim: Partial<EnhancedClaim>): {
  severity: SeverityLevel;
  priority: number;
  requires_immediate_response: boolean;
  reasoning: string;
} {
  let severity: SeverityLevel = 'standard';
  let priority = 50;
  let requires_immediate_response = false;
  const reasons: string[] = [];

  // Fire damage = CRITICAL
  if (claim.cause_of_loss === 'fire' || claim.peril === 'Fire') {
    severity = 'critical';
    priority = 95;
    requires_immediate_response = true;
    reasons.push('Fire damage requires immediate response');
  }
  
  // Water damage = URGENT (especially if recent)
  else if (claim.cause_of_loss === 'water' || claim.peril === 'Water' || claim.peril === 'Water Damage') {
    severity = 'urgent';
    priority = 80;
    requires_immediate_response = true;
    reasons.push('Water damage requires urgent attention to prevent mold');
  }
  
  // High damage estimates = URGENT
  if (claim.damage_estimate && claim.damage_estimate >= 5000000) { // $50,000+
    severity = severity === 'critical' ? 'critical' : 'urgent';
    priority = Math.max(priority, 85);
    requires_immediate_response = true;
    reasons.push('High damage estimate requires priority handling');
  }
  
  // Authority involvement = Higher priority
  if (claim.authorities_contacted) {
    priority += 15;
    if (claim.police_contacted || claim.fire_contacted) {
      severity = severity === 'standard' ? 'urgent' : severity;
      reasons.push('Authority involvement increases urgency');
    }
  }
  
  // Recent incident = Higher priority
  if (claim.incident_date) {
    const incidentDate = new Date(claim.incident_date);
    const daysDiff = (Date.now() - incidentDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 1) {
      priority += 20;
      if (severity === 'standard') severity = 'urgent';
      reasons.push('Recent incident requires quick response');
    }
  }
  
  // Theft/Burglary = URGENT (crime scene, evidence)
  if (claim.cause_of_loss === 'theft' || claim.peril?.toLowerCase().includes('theft') || 
      claim.peril?.toLowerCase().includes('burglary')) {
    severity = severity === 'critical' ? 'critical' : 'urgent';
    priority = Math.max(priority, 75);
    reasons.push('Theft/burglary requires prompt investigation');
  }
  
  // Wind/Hail in season = Standard but elevated
  if (claim.cause_of_loss === 'wind' || claim.peril?.toLowerCase().includes('wind') || 
      claim.peril?.toLowerCase().includes('hail')) {
    priority = Math.max(priority, 60);
    reasons.push('Weather-related damage requires timely assessment');
  }

  // Cap priority at 100
  priority = Math.min(priority, 100);

  return {
    severity,
    priority,
    requires_immediate_response,
    reasoning: reasons.join('; ') || 'Standard processing based on incident type'
  };
}

export default function ClaimIntakePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (claimData: Partial<EnhancedClaim>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Classify incident severity
      const classification = classifyIncidentSeverity(claimData);
      
      // Prepare enhanced claim data
      const enhancedClaim = {
        ...claimData,
        severity_level: classification.severity,
        priority_score: classification.priority,
        requires_immediate_response: classification.requires_immediate_response,
        claim_number: `CLM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        stage: 'Intake',
        date_reported: new Date().toISOString(),
        // Default adjuster - in production this would be assigned based on workload/expertise
        adjuster_id: 'a1234567-e89b-12d3-a456-426614174000'
      };

      // Submit to API
      const response = await fetch('/api/proxy/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedClaim),
      });

      if (!response.ok) {
        throw new Error('Failed to submit claim');
      }

      const result = await response.json();
      
      // Show success message with severity info
      alert(`Claim submitted successfully!\n\nClaim Number: ${enhancedClaim.claim_number}\nSeverity: ${classification.severity.toUpperCase()}\nPriority Score: ${classification.priority}\n\nReasoning: ${classification.reasoning}`);
      
      // Redirect to claims list
      router.push('/');
      
    } catch (err) {
      console.error('Error submitting claim:', err);
      setError('Failed to submit claim. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">New Claim Intake</h1>
          <p className="text-gray-600 mt-2">
            Complete the property loss information below. The system will automatically classify 
            severity and prioritize scheduling based on incident details.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="text-red-600">
                <span className="font-medium">Error:</span> {error}
              </div>
            </div>
          </div>
        )}

        <PropertyLossForm 
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />

        {isSubmitting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <div className="flex items-center space-x-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-700">Processing claim and analyzing severity...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}