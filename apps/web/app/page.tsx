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
import TutorialButton from '../components/tutorial/TutorialButton';
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
  const [legs, setLegs] = useState<{ from: string; to: string; driveTime: string }[]>([]);
  
  // Fetch real data from the API
  const adjusterId = 'a1234567-e89b-12d3-a456-426614174000'; // Sample adjuster ID
  
  // Optimize route from appointment locations
  const optimizeRoute = async (appointments: CalendarAppointment[]) => {
    if (appointments.length < 2) {
      setLegs([]);
      return;
    }

    try {
      // Extract real locations from scheduled appointments with actual coordinates  
      // Get claim data to access real coordinates for each appointment
      const { claims } = await getAssignments(adjusterId);
      
      const waypoints = appointments.map((apt, index) => {
        // Get the full street address from the appointment 
        const fullAddress = apt.title.split(' • ')[1] || 'Unknown';
        
        // Find the corresponding claim to get real coordinates
        const claimForApt = claims.find((claim: any) => 
          apt.title.includes(claim.insured?.name || '') && 
          apt.title.includes(claim.lossLocation?.address || '')
        );
        
        // Use real coordinates from the claim data if available
        let coords = { lat: 30.6877, lng: -88.1789 }; // Default to Mobile
        
        if (claimForApt?.lossLocation?.lat && claimForApt?.lossLocation?.lng) {
          coords = {
            lat: claimForApt.lossLocation.lat,
            lng: claimForApt.lossLocation.lng
          };
          console.log(`Route optimization: Using real coordinates for "${fullAddress}":`, coords);
        } else {
          console.warn(`Route optimization: No coordinates found for "${fullAddress}", using fallback`);
        }
        
        return {
          id: `apt_${index}`,
          lat: coords.lat,
          lng: coords.lng,
          address: fullAddress, // Use the full street address for real-world routing
          name: fullAddress
        };
      });
      
      console.log('Generated waypoints for route optimization:', waypoints);

      const response = await fetch('/api/proxy/routing/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          waypoints,
          constraints: {
            optimization_mode: 'time',
            traffic: true
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.routes) {
          // Convert optimized route to legs format
          const optimizedLegs = result.routes.map((route: any) => ({
            from: waypoints[route.fromWaypointIndex]?.name || 'Unknown',
            to: waypoints[route.toWaypointIndex]?.name || 'Unknown',
            driveTime: `${Math.round(route.duration || 0)}m`
          }));
          
          setLegs(optimizedLegs);
          console.log('Route optimization successful:', optimizedLegs);
        } else {
          // API returned success: false - use fallback logic
          console.warn('Route optimization API returned success: false, using fallback routing');
          if (appointments.length >= 2) {
            const fallbackLegs = [];
            for (let i = 0; i < appointments.length - 1; i++) {
              const fromAddress = appointments[i].title.split(' • ')[1] || 'Unknown';
              const toAddress = appointments[i + 1].title.split(' • ')[1] || 'Unknown';
              fallbackLegs.push({
                from: fromAddress,
                to: toAddress, 
                driveTime: '25m' // Estimated fallback time
              });
            }
            setLegs(fallbackLegs);
            console.log('Using fallback route with real addresses:', fallbackLegs);
          }
        }
      } else {
        console.warn('Route optimization failed, using fallback');
        // Fallback to simple sequential route with real addresses
        if (appointments.length >= 2) {
          const fallbackLegs = [];
          for (let i = 0; i < appointments.length - 1; i++) {
            const fromAddress = appointments[i].title.split(' • ')[1] || 'Unknown';
            const toAddress = appointments[i + 1].title.split(' • ')[1] || 'Unknown';
            fallbackLegs.push({
              from: fromAddress,
              to: toAddress,
              driveTime: '25m' // Estimated fallback time
            });
          }
          setLegs(fallbackLegs);
          console.log('Using HTTP error fallback route with real addresses:', fallbackLegs);
        }
      }
    } catch (error) {
      console.error('Route optimization error:', error);
      setLegs([]);
    }
  };
  
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
        const appointmentPromises = claims.map((claim: any) => 
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
                title: `${claim.insured?.name || 'Unknown'} • ${claim.lossLocation?.address || 'Location'}`,
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
                location: claim.lossLocation?.address || 'Unknown Location',
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
        
        // Automatically optimize route when appointments are loaded
        await optimizeRoute(appointments);
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <OfflineBanner />
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl" data-tutorial="header">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                Smart Adjuster Dashboard
              </h1>
              <p className="text-slate-300 mt-2 text-lg">Intelligent workflow management for field adjusters</p>
            </div>
            <nav className="flex gap-3 items-center">
              <Link 
                href="/kanban"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 focus:ring-2 focus:ring-purple-500 text-sm font-semibold shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
                data-tutorial="kanban-nav"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2z" />
                  </svg>
                  Kanban View
                </span>
              </Link>
              <Link 
                href="/claims/intake"
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 focus:ring-2 focus:ring-emerald-500 text-sm font-semibold shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
                data-tutorial="new-claim"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Claim
                </span>
              </Link>
              <div className="flex gap-4 ml-4">
                <Link className="text-slate-300 hover:text-white transition-colors text-sm" href="/templates">Templates</Link>
                <Link className="text-slate-300 hover:text-white transition-colors text-sm" href="/claims/CLM-2025-001184">Example</Link>
              </div>
            </nav>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div data-tutorial="calendar">
            <AppointmentCalendar items={allAppointments} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-tutorial="claim-cards">
            {claimCards.map((card: ClaimCardData, index: number) => (
              <div
                key={index}
                className={`p-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                  card.hasAppointment 
                    ? card.appointmentStatus === 'confirmed' 
                      ? 'bg-gradient-to-br from-emerald-50 to-green-50 shadow-md border border-emerald-200/50' 
                      : 'bg-gradient-to-br from-amber-50 to-yellow-50 shadow-md border border-amber-200/50'
                    : 'bg-gradient-to-br from-slate-50 to-gray-50 shadow-md border border-slate-200/50'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-xl text-slate-800">{card.name}</h3>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                    card.hasAppointment
                      ? card.appointmentStatus === 'confirmed' 
                        ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' 
                        : 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
                      : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                  }`}>
                    {card.hasAppointment ? card.appointmentStatus?.toUpperCase() : card.stage}
                  </span>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-slate-600"><span className="font-semibold text-slate-700">Claim:</span> {card.claimNumber}</div>
                    <div className="text-slate-600"><span className="font-semibold text-slate-700">Policy:</span> {card.policyNumber}</div>
                    <div className="text-slate-600"><span className="font-semibold text-slate-700">Carrier:</span> {card.carrier}</div>
                    <div className="text-slate-600"><span className="font-semibold text-slate-700">Peril:</span> {card.peril}</div>
                  </div>
                  <div className="text-slate-600"><span className="font-semibold text-slate-700">Stage:</span> {card.stage}</div>
                  
                  {card.hasAppointment ? (
                    <div className="mt-5 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
                      <div className="flex items-center gap-2 font-semibold text-slate-700 mb-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        {card.appointmentDate} • {card.appointmentTime}
                      </div>
                      <div className="text-slate-600 text-sm">{card.location}</div>
                    </div>
                  ) : (
                    <div className="mt-5 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
                      <div className="flex items-center gap-2 font-semibold text-orange-600 mb-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                        Needs Scheduling
                      </div>
                      <div className="text-slate-600 text-sm mb-2">{card.location}</div>
                      {card.priorityScore && (
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-slate-500">Priority:</div>
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                card.priorityScore >= 80 ? 'bg-red-500' : 
                                card.priorityScore >= 60 ? 'bg-orange-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${card.priorityScore}%` }}
                            ></div>
                          </div>
                          <span className={`text-xs font-bold ${
                            card.priorityScore >= 80 ? 'text-red-600' : 
                            card.priorityScore >= 60 ? 'text-orange-600' : 'text-green-600'
                          }`}>{card.priorityScore}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex gap-3">
                  <button className="flex-1 px-4 py-2.5 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
                    Open Claim
                  </button>
                  {!card.hasAppointment && (
                    <button className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
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
        <div className="space-y-6">
          <div data-tutorial="route-summary">
            <RouteSummary legs={legs} />
          </div>
          <div data-tutorial="comms-log">
            <CommsLog items={comms} />
          </div>
          <div data-tutorial="templates">
            <TemplatePicker />
          </div>
          <div data-tutorial="stage-tracker">
            <StageTracker stage={currentStage} />
          </div>
        </div>
        </div>
      </div>
      <TutorialButton />
    </main>
  );
}
