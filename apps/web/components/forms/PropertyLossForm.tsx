'use client';
import { useState } from 'react';
import { EnhancedClaim, SeverityLevel, ContactMethod } from '../../../../shared/schema';

interface PropertyLossFormProps {
  onSubmit: (claim: Partial<EnhancedClaim>) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<EnhancedClaim>;
}

export default function PropertyLossForm({ onSubmit, onCancel, initialData }: PropertyLossFormProps) {
  const [formData, setFormData] = useState<Partial<EnhancedClaim>>(initialData || {
    is_notice_only: false,
    mailing_same_as_loss: true,
    insured_language: 'en',
    best_contact_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState('policy');

  const handleInputChange = (field: keyof EnhancedClaim) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sections = [
    { id: 'policy', title: 'Policy Information', icon: '📋' },
    { id: 'incident', title: 'Incident Details', icon: '🚨' },
    { id: 'location', title: 'Loss Location', icon: '📍' },
    { id: 'insured', title: 'Insured Information', icon: '👤' },
    { id: 'authority', title: 'Authority Reports', icon: '🚔' },
    { id: 'stakeholders', title: 'Witnesses & Contacts', icon: '👥' },
    { id: 'reporter', title: 'Reporter Details', icon: '📝' }
  ];

  const renderPolicySection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Policy Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Policy Number *
          </label>
          <input
            type="text"
            required
            value={formData.policy_number || ''}
            onChange={handleInputChange('policy_number')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Policy Name *
          </label>
          <input
            type="text"
            required
            value={formData.policy_name || ''}
            onChange={handleInputChange('policy_name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Policy Effective Date *
          </label>
          <input
            type="date"
            required
            value={formData.policy_effective_date ? formData.policy_effective_date.split('T')[0] : ''}
            onChange={handleInputChange('policy_effective_date')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Policy Expiration Date *
          </label>
          <input
            type="date"
            required
            value={formData.policy_expiration_date ? formData.policy_expiration_date.split('T')[0] : ''}
            onChange={handleInputChange('policy_expiration_date')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Carrier
          </label>
          <input
            type="text"
            value={formData.carrier || ''}
            onChange={handleInputChange('carrier')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Federal ID Number
          </label>
          <input
            type="text"
            value={formData.federal_id_number || ''}
            onChange={handleInputChange('federal_id_number')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="notice_only"
          checked={formData.is_notice_only || false}
          onChange={handleInputChange('is_notice_only')}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="notice_only" className="text-sm text-gray-700">
          Is this a Notice Only Claim?
        </label>
      </div>
    </div>
  );

  const renderIncidentSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Incident Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Incident *
          </label>
          <input
            type="date"
            required
            value={formData.incident_date ? formData.incident_date.split('T')[0] : ''}
            onChange={handleInputChange('incident_date')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time of Incident
          </label>
          <input
            type="time"
            value={formData.incident_time || ''}
            onChange={handleInputChange('incident_time')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cause of Loss
          </label>
          <select
            value={formData.cause_of_loss || ''}
            onChange={handleInputChange('cause_of_loss')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select cause of loss</option>
            <option value="fire">Fire</option>
            <option value="water">Water Damage</option>
            <option value="wind">Wind/Hail</option>
            <option value="theft">Theft/Burglary</option>
            <option value="vandalism">Vandalism</option>
            <option value="lightning">Lightning</option>
            <option value="explosion">Explosion</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Damage Estimate ($)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.damage_estimate ? formData.damage_estimate / 100 : ''}
            onChange={(e) => {
              const dollars = parseFloat(e.target.value) || 0;
              setFormData(prev => ({ ...prev, damage_estimate: Math.round(dollars * 100) }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Brief Description of Incident *
        </label>
        <textarea
          required
          rows={3}
          value={formData.incident_description || ''}
          onChange={handleInputChange('incident_description')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Describe what happened..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Damage Description
        </label>
        <textarea
          rows={3}
          value={formData.damage_description || ''}
          onChange={handleInputChange('damage_description')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Describe the damage in detail..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="occurred_on_premises"
            checked={formData.occurred_on_premises || false}
            onChange={handleInputChange('occurred_on_premises')}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="occurred_on_premises" className="text-sm text-gray-700">
            Occurred on insured premises?
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="photos_taken"
            checked={formData.photos_taken || false}
            onChange={handleInputChange('photos_taken')}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="photos_taken" className="text-sm text-gray-700">
            Were photos taken?
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="location_inspected"
            checked={formData.location_inspected_immediately || false}
            onChange={handleInputChange('location_inspected_immediately')}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="location_inspected" className="text-sm text-gray-700">
            Location inspected immediately?
          </label>
        </div>
      </div>
    </div>
  );

  const renderLocationSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Loss Location</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address *
          </label>
          <input
            type="text"
            required
            value={formData.loss_address || ''}
            onChange={handleInputChange('loss_address')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address Line 2
          </label>
          <input
            type="text"
            value={formData.loss_address_2 || ''}
            onChange={handleInputChange('loss_address_2')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City *
          </label>
          <input
            type="text"
            required
            value={formData.loss_city || ''}
            onChange={handleInputChange('loss_city')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State *
          </label>
          <input
            type="text"
            required
            value={formData.loss_state || ''}
            onChange={handleInputChange('loss_state')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ZIP Code *
          </label>
          <input
            type="text"
            required
            value={formData.loss_zip || ''}
            onChange={handleInputChange('loss_zip')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            County
          </label>
          <input
            type="text"
            value={formData.loss_county || ''}
            onChange={handleInputChange('loss_county')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="mortgage_on_property"
          checked={formData.mortgage_on_property || false}
          onChange={handleInputChange('mortgage_on_property')}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="mortgage_on_property" className="text-sm text-gray-700">
          Is there a mortgage on the property?
        </label>
      </div>
    </div>
  );

  const renderInsuredSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Insured Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Insured Name *
          </label>
          <input
            type="text"
            required
            value={formData.insured_name || ''}
            onChange={handleInputChange('insured_name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.insured_phone || ''}
            onChange={handleInputChange('insured_phone')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cell Number
          </label>
          <input
            type="tel"
            value={formData.insured_cell_number || ''}
            onChange={handleInputChange('insured_cell_number')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={formData.insured_email || ''}
            onChange={handleInputChange('insured_email')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Contact Method
          </label>
          <select
            value={formData.preferred_contact_method || ''}
            onChange={handleInputChange('preferred_contact_method')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select method</option>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Language
          </label>
          <select
            value={formData.insured_language || 'en'}
            onChange={handleInputChange('insured_language')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Best Contact Time - From
          </label>
          <input
            type="time"
            value={formData.best_contact_time_from || ''}
            onChange={handleInputChange('best_contact_time_from')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Best Contact Time - To
          </label>
          <input
            type="time"
            value={formData.best_contact_time_to || ''}
            onChange={handleInputChange('best_contact_time_to')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderAuthoritySection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Authority Reports</h3>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="authorities_contacted"
            checked={formData.authorities_contacted || false}
            onChange={handleInputChange('authorities_contacted')}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="authorities_contacted" className="text-sm font-medium text-gray-700">
            Were authorities contacted?
          </label>
        </div>

        {formData.authorities_contacted && (
          <div className="ml-6 space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="police_contacted"
                  checked={formData.police_contacted || false}
                  onChange={handleInputChange('police_contacted')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="police_contacted" className="text-sm text-gray-700">Police</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="fire_contacted"
                  checked={formData.fire_contacted || false}
                  onChange={handleInputChange('fire_contacted')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="fire_contacted" className="text-sm text-gray-700">Fire Department</label>
              </div>
            </div>

            {formData.police_contacted && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Police Authority Name
                  </label>
                  <input
                    type="text"
                    value={formData.police_authority_name || ''}
                    onChange={handleInputChange('police_authority_name')}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Police Report Number
                  </label>
                  <input
                    type="text"
                    value={formData.police_report_number || ''}
                    onChange={handleInputChange('police_report_number')}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {formData.fire_contacted && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Fire Authority Name
                  </label>
                  <input
                    type="text"
                    value={formData.fire_authority_name || ''}
                    onChange={handleInputChange('fire_authority_name')}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Fire Report Number
                  </label>
                  <input
                    type="text"
                    value={formData.fire_report_number || ''}
                    onChange={handleInputChange('fire_report_number')}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderSection = () => {
    switch (currentSection) {
      case 'policy': return renderPolicySection();
      case 'incident': return renderIncidentSection();
      case 'location': return renderLocationSection();
      case 'insured': return renderInsuredSection();
      case 'authority': return renderAuthoritySection();
      default: return renderPolicySection();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Property Loss Form</h1>
      
      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setCurrentSection(section.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentSection === section.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {section.icon} {section.title}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {renderSection()}

        {/* Form Actions */}
        <div className="flex justify-between pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            Cancel
          </button>
          
          <div className="space-x-2">
            <button
              type="button"
              onClick={() => {
                const currentIndex = sections.findIndex(s => s.id === currentSection);
                if (currentIndex > 0) {
                  setCurrentSection(sections[currentIndex - 1].id);
                }
              }}
              disabled={currentSection === 'policy'}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <button
              type="button"
              onClick={() => {
                const currentIndex = sections.findIndex(s => s.id === currentSection);
                if (currentIndex < sections.length - 1) {
                  setCurrentSection(sections[currentIndex + 1].id);
                }
              }}
              disabled={currentSection === sections[sections.length - 1].id}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}