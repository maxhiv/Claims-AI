'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface HighlightOverlayProps {
  element: HTMLElement;
  stepNumber: number;
}

function HighlightOverlay({ element, stepNumber }: HighlightOverlayProps) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    const updatePosition = () => {
      const rect = element.getBoundingClientRect();
      setPosition({
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
      });
    };

    updatePosition();
    
    // Update position on scroll and resize to keep highlight aligned
    const handleUpdate = () => {
      requestAnimationFrame(updatePosition);
    };
    
    window.addEventListener('scroll', handleUpdate);
    window.addEventListener('resize', handleUpdate);
    
    return () => {
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [element]);

  return (
    <div
      className="fixed z-50 border-4 border-blue-500 rounded-lg shadow-lg pointer-events-none transition-all duration-300"
      style={position}
    >
      <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
        {stepNumber}
      </div>
    </div>
  );
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'header',
    title: 'Smart Adjuster Dashboard',
    description: 'This is your central command center for managing insurance claims. The dashboard provides an intelligent overview of all your assigned claims, appointments, and workflow progress.',
    target: '[data-tutorial="header"]',
    position: 'bottom'
  },
  {
    id: 'kanban-nav',
    title: 'Kanban View',
    description: 'Switch to a visual board layout that organizes claims by workflow stage. Perfect for seeing the big picture of claim progression and identifying bottlenecks.',
    target: '[data-tutorial="kanban-nav"]',
    position: 'bottom'
  },
  {
    id: 'new-claim',
    title: 'New Claim Intake',
    description: 'Start the intake process for new insurance claims. This streamlined form captures all necessary initial information and assigns the claim to your workflow.',
    target: '[data-tutorial="new-claim"]',
    position: 'bottom'
  },
  {
    id: 'calendar',
    title: 'Appointment Calendar',
    description: 'View and manage all your scheduled appointments. Color-coded status indicators show confirmed (green), pending (yellow), and canceled (red) appointments at a glance.',
    target: '[data-tutorial="calendar"]',
    position: 'right'
  },
  {
    id: 'claim-cards',
    title: 'Active Claims',
    description: 'Each card represents an assigned claim with key details like claimant name, location, priority score, and appointment status. Cards show different layouts for scheduled vs. unscheduled claims.',
    target: '[data-tutorial="claim-cards"]',
    position: 'right'
  },
  {
    id: 'route-summary',
    title: 'Optimized Route',
    description: 'AI-powered route optimization calculates the most efficient travel path between your scheduled appointments, saving time and reducing mileage costs.',
    target: '[data-tutorial="route-summary"]',
    position: 'left'
  },
  {
    id: 'comms-log',
    title: 'Communication Log',
    description: 'Track all interactions with claimants, witnesses, and stakeholders. Shows SMS, email, and phone communications with timestamps and status updates.',
    target: '[data-tutorial="comms-log"]',
    position: 'left'
  },
  {
    id: 'templates',
    title: 'Quick-Send Templates',
    description: 'Pre-written message templates for common scenarios like appointment confirmations, document requests, and status updates. Speeds up routine communications.',
    target: '[data-tutorial="templates"]',
    position: 'left'
  },
  {
    id: 'stage-tracker',
    title: 'Workflow Progress',
    description: 'Visual progress tracker showing current claim stage and next steps. Helps ensure nothing falls through the cracks and SLA deadlines are met.',
    target: '[data-tutorial="stage-tracker"]',
    position: 'left'
  }
];

interface DashboardTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DashboardTutorial({ isOpen, onClose }: DashboardTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightElement, setHighlightElement] = useState<HTMLElement | null>(null);
  const [cardPosition, setCardPosition] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });

  useEffect(() => {
    if (isOpen && currentStep < tutorialSteps.length) {
      const step = tutorialSteps[currentStep];
      const element = document.querySelector(step.target) as HTMLElement;
      setHighlightElement(element);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Initial card position calculation
        const updateCardPosition = () => {
          const newPosition = getCardPosition(element, step.position);
          setCardPosition(newPosition);
        };
        
        updateCardPosition();
        
        // Update card position on scroll and resize
        const handleUpdate = () => {
          requestAnimationFrame(updateCardPosition);
        };
        
        window.addEventListener('scroll', handleUpdate);
        window.addEventListener('resize', handleUpdate);
        
        return () => {
          window.removeEventListener('scroll', handleUpdate);
          window.removeEventListener('resize', handleUpdate);
        };
      }
    } else {
      setHighlightElement(null);
    }
  }, [isOpen, currentStep]);

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTutorial = () => {
    localStorage.setItem('dashboard-tutorial-completed', 'true');
    onClose();
    setCurrentStep(0);
  };

  const skipTutorial = () => {
    localStorage.setItem('dashboard-tutorial-completed', 'true');
    onClose();
    setCurrentStep(0);
  };

  if (!isOpen) return null;

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" />
      
      {/* Highlight */}
      {highlightElement && (
        <HighlightOverlay element={highlightElement} stepNumber={currentStep + 1} />
      )}

      {/* Tutorial Card */}
      <div className="fixed z-50 bg-white rounded-xl shadow-2xl border max-w-md mx-4 transition-all duration-300" 
           style={cardPosition}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {currentStep + 1}
              </div>
              <div className="text-sm text-gray-500">
                Step {currentStep + 1} of {tutorialSteps.length}
              </div>
            </div>
            <button onClick={skipTutorial} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
          <p className="text-gray-600 mb-6 leading-relaxed">{step.description}</p>

          <div className="flex justify-between items-center">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex gap-1">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              {isLastStep ? (
                <>
                  Complete
                  <Play className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Arrow pointing to highlighted element */}
        <div className={`absolute w-4 h-4 bg-white border rotate-45 ${getArrowPosition(step.position)}`} />
      </div>
    </>
  );
}

function getCardPosition(element: HTMLElement | null, position: string) {
  if (!element) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  const rect = element.getBoundingClientRect();
  const cardWidth = 384; // max-w-md = 384px
  const cardHeight = 300; // approximate
  const spacing = 20;
  
  // Ensure card stays within viewport bounds
  const maxTop = Math.max(16, window.innerHeight - cardHeight - 16);
  const maxLeft = Math.max(16, window.innerWidth - cardWidth - 16);

  switch (position) {
    case 'top':
      return {
        top: Math.max(16, rect.top - cardHeight - spacing),
        left: Math.max(16, Math.min(maxLeft, rect.left + rect.width / 2 - cardWidth / 2)),
      };
    case 'bottom':
      return {
        top: Math.min(maxTop, rect.bottom + spacing),
        left: Math.max(16, Math.min(maxLeft, rect.left + rect.width / 2 - cardWidth / 2)),
      };
    case 'left':
      return {
        top: Math.max(16, Math.min(maxTop, rect.top + rect.height / 2 - cardHeight / 2)),
        left: Math.max(16, rect.left - cardWidth - spacing),
      };
    case 'right':
      return {
        top: Math.max(16, Math.min(maxTop, rect.top + rect.height / 2 - cardHeight / 2)),
        left: Math.min(maxLeft, rect.right + spacing),
      };
    default:
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
}

function getArrowPosition(position: string) {
  switch (position) {
    case 'top':
      return 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 border-t border-l';
    case 'bottom':
      return 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-b border-r';
    case 'left':
      return 'right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 border-t border-l';
    case 'right':
      return 'left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 border-b border-r';
    default:
      return 'hidden';
  }
}