'use client';

import { useState, useRef, useEffect } from 'react';

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

interface KanbanBoardProps {
  claims: ClaimCardData[];
  onClaimStageUpdate?: (updatedClaims: ClaimCardData[]) => void;
}

const workflowStages = [
  { key: 'Intake', title: 'Intake', color: 'bg-gray-100' },
  { key: 'Contacted', title: 'Contacted', color: 'bg-blue-100' },
  { key: 'Inspection Scheduled', title: 'Inspection Scheduled', color: 'bg-yellow-100' },
  { key: 'Inspection Completed', title: 'Inspection Completed', color: 'bg-orange-100' },
  { key: 'Estimate Written', title: 'Estimate Written', color: 'bg-purple-100' },
  { key: 'Carrier Approval Pending', title: 'Carrier Approval Pending', color: 'bg-pink-100' },
  { key: 'Carrier Approved', title: 'Carrier Approved', color: 'bg-green-100' },
  { key: 'Closed', title: 'Closed', color: 'bg-green-200' },
];

export default function KanbanBoard({ claims, onClaimStageUpdate }: KanbanBoardProps) {
  const [draggedClaim, setDraggedClaim] = useState<ClaimCardData | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getClaimsForStage = (stage: string) => {
    return claims.filter(claim => claim.stage === stage);
  };

  const handleDragStart = (e: React.DragEvent, claim: ClaimCardData) => {
    setDraggedClaim(claim);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (draggedClaim && draggedClaim.stage !== targetStage) {
      // Optimistically update the local state immediately for better UX
      const updatedClaims = claims.map(claim => 
        claim.claimNumber === draggedClaim.claimNumber 
          ? { ...claim, stage: targetStage }
          : claim
      );
      
      // Update parent component's claims state
      onClaimStageUpdate?.(updatedClaims);
      
      // Here you would call the API to persist the change
      console.log(`Moving claim ${draggedClaim.claimNumber} from ${draggedClaim.stage} to ${targetStage}`);
      // TODO: Implement API call to update claim stage
      // updateClaimStage(draggedClaim.claimNumber, targetStage)
      //   .catch(error => {
      //     console.error('Failed to update claim stage:', error);
      //     // Revert optimistic update on error
      //     onClaimStageUpdate?.(claims);
      //   });
    }
    setDraggedClaim(null);
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
      updateScrollButtons();
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
      updateScrollButtons();
    }
  };

  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const getPriorityColor = (priorityScore?: number) => {
    if (!priorityScore) return 'border-gray-200';
    if (priorityScore >= 80) return 'border-red-300 border-l-4 border-l-red-500';
    if (priorityScore >= 60) return 'border-orange-300 border-l-4 border-l-orange-500';
    return 'border-green-300 border-l-4 border-l-green-500';
  };

  // Initialize scroll button states on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      updateScrollButtons();
    }, 100); // Small delay to ensure DOM is rendered
    
    return () => clearTimeout(timer);
  }, [claims]);

  return (
    <div className="w-full h-full bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Claims Kanban Board</h1>
        <p className="text-gray-600">Drag and drop claims between workflow stages</p>
      </div>
      
      {/* Scroll Controls */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          className={`px-3 py-2 rounded-lg border ${
            canScrollLeft 
              ? 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300' 
              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          }`}
        >
          ← Left
        </button>
        <button
          onClick={scrollRight}
          disabled={!canScrollRight}
          className={`px-3 py-2 rounded-lg border ${
            canScrollRight 
              ? 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300' 
              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          }`}
        >
          Right →
        </button>
      </div>
      
      <div 
        ref={scrollContainerRef}
        className="flex gap-6 overflow-x-auto pb-6"
        onScroll={updateScrollButtons}
      >
        {workflowStages.map((stage) => {
          const stageClaims = getClaimsForStage(stage.key);
          return (
            <div
              key={stage.key}
              className={`min-w-80 ${stage.color} rounded-lg p-4`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">{stage.title}</h3>
                <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-600">
                  {stageClaims.length}
                </span>
              </div>
              
              <div className="space-y-3 min-h-96">
                {stageClaims.map((claim, index) => (
                  <div
                    key={`${claim.claimNumber}-${index}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, claim)}
                    className={`bg-white rounded-lg p-4 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${getPriorityColor(claim.priorityScore)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{claim.name}</h4>
                      {claim.priorityScore && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          claim.priorityScore >= 80 ? 'bg-red-100 text-red-800' :
                          claim.priorityScore >= 60 ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {claim.priorityScore}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-600">
                      <div><strong>Claim:</strong> {claim.claimNumber}</div>
                      <div><strong>Peril:</strong> {claim.peril}</div>
                      <div><strong>Carrier:</strong> {claim.carrier}</div>
                      <div className="text-gray-500 truncate">{claim.location}</div>
                    </div>
                    
                    {claim.hasAppointment && (
                      <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                        <div className="font-medium text-blue-800">📅 {claim.appointmentDate}</div>
                        <div className="text-blue-600">{claim.appointmentTime}</div>
                        <span className={`inline-block mt-1 px-2 py-1 rounded text-xs ${
                          claim.appointmentStatus === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {claim.appointmentStatus}
                        </span>
                      </div>
                    )}
                    
                    {!claim.hasAppointment && stage.key !== 'Intake' && (
                      <div className="mt-3 p-2 bg-orange-50 rounded text-xs">
                        <div className="font-medium text-orange-800">⏳ Needs Scheduling</div>
                      </div>
                    )}
                    
                    {claim.notes.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        💬 {claim.notes[0].substring(0, 50)}...
                      </div>
                    )}
                  </div>
                ))}
                
                {stageClaims.length === 0 && (
                  <div className="text-center text-gray-400 py-8 text-sm">
                    No claims in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}