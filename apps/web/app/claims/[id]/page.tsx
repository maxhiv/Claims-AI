import AppointmentCard from '../../../components/cards/AppointmentCard';
import CommsLog from '../../../components/comms-log/Log';
import StageTracker from '../../../components/stage-tracker/StageTracker';

type Params = { params: { id: string } };

export default function ClaimDetailPage({ params }: Params) {
  // In production, fetch from API with params.id
  const claimId = params.id;
  const mock = {
    name: 'Policyholder Name',
    date: 'Wed, Sept 27',
    time: '2:00 PM',
    location: '11504 Redfern Rd, Daphne, AL',
    status: 'confirmed' as const,
    claimNumber: claimId.toUpperCase(),
    policyNumber: 'POL-AL-7789123',
    carrier: 'Davies TPA / Liberty Mutual',
    notes: ['9/20 – Left voicemail', '9/22 – Confirmed appointment by text']
  };

  const comms = [
    { id:'1', ts:new Date().toISOString(), who:'System', channel:'sms' as const, preview:'Initial outreach sent' },
    { id:'2', ts:new Date().toISOString(), who:'PH', channel:'sms' as const, preview:'Confirmed Tuesday 10:00am' }
  ];

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Claim #{claimId}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AppointmentCard {...mock} />
        <div className="space-y-4">
          <StageTracker stage="Inspection Scheduled" />
          <CommsLog items={comms} />
        </div>
      </div>
    </main>
  );
}
