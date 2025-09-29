'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import KanbanBoard from '../../components/kanban/KanbanBoard';
import { getAssignments, listAppointments } from '../../lib/api-client';

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

export default function KanbanPage() {
  const [claimCards, setClaimCards] = useState<ClaimCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const handleClaimStageUpdate = (updatedClaims: ClaimCardData[]) => {
    setClaimCards(updatedClaims);
  };
  
  // Fetch real data from the API
  const adjusterId = 'a1234567-e89b-12d3-a456-426614174000'; // Sample adjuster ID
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get claims assigned to the adjuster
        const { claims } = await getAssignments(adjusterId);
        console.log('Fetched claims for kanban:', claims);
        
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
        
        // Process results to build claim cards
        appointmentResults.forEach(({ claim, appointments: claimAppointments }) => {
          if (claimAppointments.length > 0) {
            // Claim has appointments
            claimAppointments.forEach((apt: any) => {
              const statusMap: { [key: string]: 'confirmed' | 'pending' | 'canceled' } = {
                'confirmed': 'confirmed',
                'pending': 'pending', 
                'cancelled': 'canceled',
                'canceled': 'canceled'
              };
              const mappedStatus = statusMap[apt.status?.toLowerCase()] || 'pending';
              
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
            // Claim has NO appointments
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
        
        setClaimCards(cards);
      } catch (error) {
        console.error('Failed to fetch claims:', error);
        setClaimCards([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [adjusterId]);

  if (isLoading) {
    return (
      <main className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading claims...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Claims Workflow - Kanban View</h1>
          <nav className="flex gap-4 items-center text-sm">
            <Link 
              href="/"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500"
            >
              📊 Dashboard View
            </Link>
            <Link 
              href="/claims/intake"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              🆕 New Claim Intake
            </Link>
          </nav>
        </div>
        
        <KanbanBoard claims={claimCards} onClaimStageUpdate={handleClaimStageUpdate} />
      </div>
    </main>
  );
}