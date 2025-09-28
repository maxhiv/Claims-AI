import Link from 'next/link';
import OfflineBanner from '../components/../components/sync-status/OfflineBanner';
import AppointmentCalendar from '../components/../components/calendar/AppointmentCalendar';
import RouteSummary from '../components/../components/map/RouteSummary';
import AppointmentCard from '../components/../components/cards/AppointmentCard';
import CommsLog from '../components/../components/comms-log/Log';
import TemplatePicker from '../components/../components/templates/TemplatePicker';
import StageTracker from '../components/../components/stage-tracker/StageTracker';

export default function Page() {
  const mockItems = [
    { id: '1', title: 'John Smith • Daphne', start: new Date().toISOString(), end: new Date(Date.now()+60*60*1000).toISOString(), status: 'confirmed' as const },
    { id: '2', title: 'Mary Johnson • Fairhope', start: new Date(Date.now()+2*60*60*1000).toISOString(), end: new Date(Date.now()+3*60*60*1000).toISOString(), status: 'pending' as const }
  ];
  const legs = [{ from: 'Daphne', to: 'Fairhope', driveTime: '22m' }, { from: 'Fairhope', to: 'Mobile', driveTime: '41m' }];
  const comms = [{ id:'1', ts:new Date().toISOString(), who:'System', channel:'sms' as const, preview:'Reminder sent (24h)'}];

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-4">
      <OfflineBanner />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Adjuster Scheduler Dashboard</h1>
        <nav className="flex gap-4 text-sm">
          <Link className="underline" href="/templates">Templates</Link>
          <Link className="underline" href="/claims/CLM-2025-001184">Claim example</Link>
        </nav>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AppointmentCalendar items={mockItems} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppointmentCard
              name="John Smith"
              date="Wed, Sept 27"
              time="2:00 PM"
              location="11504 Redfern Rd, Daphne, AL"
              status="confirmed"
              claimNumber="CLM-2025-001184"
              policyNumber="POL-AL-7789123"
              carrier="Davies TPA / Liberty Mutual"
              notes={['9/20 – Left voicemail','9/22 – Confirmed appointment by text']}
            />
            <AppointmentCard
              name="Mary Johnson"
              date="Thurs, Sept 28"
              time="10:00 AM"
              location="890 Pine St, Fairhope, AL"
              status="pending"
              claimNumber="CLM-2025-001229"
            />
          </div>
        </div>
        <div className="space-y-4">
          <RouteSummary legs={legs} />
          <CommsLog items={comms} />
          <TemplatePicker />
          <StageTracker stage="Inspection Scheduled" />
        </div>
      </div>
    </main>
  );
}
