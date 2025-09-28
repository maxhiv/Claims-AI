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

interface ClaimCardData {
  name: string;
  claimNumber: string;
  policyNumber: string;
  carrier: string;
  stage: string;
  peril: string;
  location: string;
  priorityScore?: number;
  hasAppointment: boolean;
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentStatus?: 'confirmed' | 'pending' | 'canceled';
  notes: string[];
}

export default function Page() {
  const [allAppointments, setAllAppointments] = useState<CalendarAppointment[]>([]);
  const [claimCards, setClaimCards] = useState<ClaimCardData[]>([]);
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
        const cards: ClaimCardData[] = [];
        
        // Fetch appointments for ALL claims in parallel for better performance
        const appointmentPromises = claims.map(claim => 
          listAppointments(claim.id)
            .then(result => ({ claim, appointments: result.appointments }))
            .catch(error => {
              console.error(`Failed to fetch appointments for claim ${claim.id}:`, error);
              return { claim, appointments: [] };
            })
        );
        
        const appointmentResults = await Promise.all(appointmentPromises);
        
        // Process results to build appointments and cards
        appointmentResults.forEach(({ claim, appointments: claimAppointments }) => {
          if (claimAppointments.length > 0) {
            // Claim has appointments - create calendar entries and scheduled claim cards
            claimAppointments.forEach((apt: any) => {
              const statusMap: { [key: string]: 'confirmed' | 'pending' | 'canceled' } = {
                'confirmed': 'confirmed',
                'pending': 'pending', 
                'cancelled': 'canceled',
                'canceled': 'canceled'
              };
              const mappedStatus = statusMap[apt.status?.toLowerCase()] || 'pending';
              
              // Add to calendar
              appointments.push({
                id: apt.id,
                title: `${claim.insured?.name || 'Unknown'} • ${claim.lossLocation?.address?.split(',').pop()?.trim() || 'Location'}`,
                start: apt.start,
                end: apt.end,
                status: mappedStatus
              });
              
              // Add scheduled claim card
              cards.push({
                name: claim.insured?.name || 'Unknown',
                claimNumber: claim.claimNumber,
                policyNumber: claim.policyNumber || 'N/A',
                carrier: claim.carrier || 'N/A',
                stage: claim.stage,
                peril: claim.peril || 'Unknown',
                location: apt.location?.address || claim.lossLocation?.address || 'Unknown Location',
                priorityScore: claim.priorityScore,
                hasAppointment: true,
                appointmentDate: new Date(apt.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                appointmentTime: new Date(apt.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                appointmentStatus: mappedStatus,
                notes: apt.notes ? [apt.notes] : []
              });
            });
          } else {
            // Claim has NO appointments - create unscheduled claim card
            cards.push({
              name: claim.insured?.name || 'Unknown',
              claimNumber: claim.claimNumber,
              policyNumber: claim.policyNumber || 'N/A',
              carrier: claim.carrier || 'N/A',
              stage: claim.stage,
              peril: claim.peril || 'Unknown',
              location: claim.lossLocation?.address || 'Unknown Location',
              priorityScore: claim.priorityScore,
              hasAppointment: false,
              notes: []
            });
          }
        });
        
        setAllAppointments(appointments);
        setClaimCards(cards);
        
        // Use the first claim's stage for the stage tracker
        if (claims.length > 0) {
          setCurrentStage(claims[0].stage);
        }
      } catch (error) {
        console.error('Failed to fetch claims or appointments:', error);
        // Fall back to empty data if API fails
        setAllAppointments([]);
        setClaimCards([]);
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
            href="/kanban"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 text-sm font-medium"
          >
            📋 Kanban View
          </Link>
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
            {claimCards.map((card: ClaimCardData, index: number) => (
              <div
                key={index}
                className={`p-6 rounded-xl border-2 ${
                  card.hasAppointment 
                    ? card.appointmentStatus === 'confirmed' 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-yellow-200 bg-yellow-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{card.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    card.hasAppointment
                      ? card.appointmentStatus === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {card.hasAppointment ? card.appointmentStatus : card.stage}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div><strong>Claim:</strong> {card.claimNumber}</div>
                  <div><strong>Policy:</strong> {card.policyNumber}</div>
                  <div><strong>Carrier:</strong> {card.carrier}</div>
                  <div><strong>Peril:</strong> {card.peril}</div>
                  <div><strong>Stage:</strong> {card.stage}</div>
                  
                  {card.hasAppointment ? (
                    <div className="mt-4 p-3 bg-white rounded-lg">
                      <div className="font-medium">📅 {card.appointmentDate} • {card.appointmentTime}</div>
                      <div className="text-gray-600">{card.location}</div>
                    </div>
                  ) : (
                    <div className="mt-4 p-3 bg-white rounded-lg">
                      <div className="font-medium text-orange-600">⏳ Needs Scheduling</div>
                      <div className="text-gray-600">{card.location}</div>
                      {card.priorityScore && (
                        <div className="text-sm mt-1">
                          Priority: <span className={`font-medium ${
                            card.priorityScore >= 80 ? 'text-red-600' : 
                            card.priorityScore >= 60 ? 'text-orange-600' : 'text-green-600'
                          }`}>{card.priorityScore}/100</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex gap-2">
                  <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">
                    Open Claim
                  </button>
                  {!card.hasAppointment && (
                    <button className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200">
                      Schedule
                    </button>
                  )}
                </div>
                
                {card.notes.length > 0 && (
                  <div className="mt-4 text-sm">
                    <div className="font-medium">Notes:</div>
                    {card.notes.map((note, i) => (
                      <div key={i} className="text-gray-600">• {note}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {claimCards.length === 0 && (
              <div className="p-4 rounded-xl border bg-gray-50 text-gray-500 text-center">
                No claims found. Data will appear here when claims are assigned.
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
