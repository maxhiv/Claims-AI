'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import OfflineBanner from '../components/../components/sync-status/OfflineBanner';
import AppointmentCalendar from '../components/../components/calendar/AppointmentCalendar';
import RouteSummary from '../components/../components/map/RouteSummary';
import AppointmentCard from '../components/../components/cards/AppointmentCard';
import CommsLog from '../components/../components/comms-log/Log';
import TemplatePicker from '../components/../components/templates/TemplatePicker';
import StageTracker from '../components/../components/stage-tracker/StageTracker';
import { getAssignments, listAppointments } from '../lib/api-client';

// Define types for our data structures
interface CalendarAppointment {
  id: string;
  title: string;
  start: string;
  end: string;
  status: 'confirmed' | 'pending' | 'canceled';
}

interface AppointmentCardData {
  name: string;
  date: string;
  time: string;
  location: string;
  status: 'confirmed' | 'pending' | 'canceled';
  claimNumber: string;
  policyNumber: string;
  carrier: string;
  notes: string[];
}

export default function Page() {
  const [allAppointments, setAllAppointments] = useState<CalendarAppointment[]>([]);
  const [appointmentCards, setAppointmentCards] = useState<AppointmentCardData[]>([]);
  const [currentStage, setCurrentStage] = useState('Inspection Scheduled');
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch real data from the API
  const adjusterId = 'a1234567-e89b-12d3-a456-426614174000'; // Sample adjuster ID
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get claims assigned to the adjuster
        const { claims } = await getAssignments(adjusterId);
        console.log('Fetched claims:', claims);
        
        const appointments: CalendarAppointment[] = [];
        const cards: AppointmentCardData[] = [];
        
        // Get all appointments for the claims
        for (const claim of claims) {
          try {
            const { appointments: claimAppointments } = await listAppointments(claim.id);
            
            // Transform appointments for calendar
            claimAppointments.forEach((apt: any) => {
              // Map status to expected values
              const statusMap: { [key: string]: 'confirmed' | 'pending' | 'canceled' } = {
                'confirmed': 'confirmed',
                'pending': 'pending', 
                'cancelled': 'canceled',
                'canceled': 'canceled'
              };
              const mappedStatus = statusMap[apt.status?.toLowerCase()] || 'pending';
              
              appointments.push({
                id: apt.id,
                title: `${claim.insured?.name || 'Unknown'} • ${claim.lossLocation?.address?.split(',').pop()?.trim() || 'Location'}`,
                start: apt.start,
                end: apt.end,
                status: mappedStatus
              });
              
              // Transform appointments for appointment cards
              cards.push({
                name: claim.insured?.name || 'Unknown',
                date: new Date(apt.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                time: new Date(apt.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                location: apt.location?.address || claim.lossLocation?.address || 'Unknown Location',
                status: mappedStatus,
                claimNumber: claim.claimNumber,
                policyNumber: claim.policyNumber || 'N/A',
                carrier: claim.carrier || 'N/A',
                notes: apt.notes ? [apt.notes] : []
              });
            });
          } catch (error) {
            console.error(`Failed to fetch appointments for claim ${claim.id}:`, error);
          }
        }
        
        setAllAppointments(appointments);
        setAppointmentCards(cards);
        
        // Use the first claim's stage for the stage tracker
        if (claims.length > 0) {
          setCurrentStage(claims[0].stage);
        }
      } catch (error) {
        console.error('Failed to fetch claims or appointments:', error);
        // Fall back to empty data if API fails
        setAllAppointments([]);
        setAppointmentCards([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [adjusterId]);

  const legs = [{ from: 'Daphne', to: 'Fairhope', driveTime: '22m' }, { from: 'Fairhope', to: 'Mobile', driveTime: '41m' }];
  const comms = [{ id:'1', ts:new Date().toISOString(), who:'System', channel:'sms' as const, preview:'Reminder sent (24h)'}];

  if (isLoading) {
    return (
      <main className="p-6 max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading appointments...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-4">
      <OfflineBanner />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Adjuster Scheduler Dashboard</h1>
        <nav className="flex gap-4 items-center text-sm">
          <Link 
            href="/claims/intake"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          >
            🆕 New Claim Intake
          </Link>
          <Link className="underline" href="/templates">Templates</Link>
          <Link className="underline" href="/claims/CLM-2025-001184">Claim example</Link>
        </nav>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AppointmentCalendar items={allAppointments} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointmentCards.map((card, index) => (
              <AppointmentCard
                key={index}
                name={card.name}
                date={card.date}
                time={card.time}
                location={card.location}
                status={card.status}
                claimNumber={card.claimNumber}
                policyNumber={card.policyNumber}
                carrier={card.carrier}
                notes={card.notes}
              />
            ))}
            {appointmentCards.length === 0 && (
              <div className="p-4 rounded-xl border bg-gray-50 text-gray-500 text-center">
                No appointments found. Data will appear here when appointments are created.
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <RouteSummary legs={legs} />
          <CommsLog items={comms} />
          <TemplatePicker />
          <StageTracker stage={currentStage} />
        </div>
      </div>
    </main>
  );
}
