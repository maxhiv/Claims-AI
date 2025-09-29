'use client';

import { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import DashboardTutorial from './DashboardTutorial';

export default function TutorialButton() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const tutorialCompleted = localStorage.getItem('dashboard-tutorial-completed');
    const hasVisited = localStorage.getItem('dashboard-visited');
    
    if (!hasVisited) {
      setIsFirstVisit(true);
      localStorage.setItem('dashboard-visited', 'true');
      
      // Auto-start tutorial for first-time users after a brief delay
      if (!tutorialCompleted) {
        setTimeout(() => setShowTutorial(true), 1000);
      }
    }
  }, []);

  const startTutorial = () => {
    setShowTutorial(true);
  };

  const closeTutorial = () => {
    setShowTutorial(false);
  };

  return (
    <>
      <button
        onClick={startTutorial}
        className="fixed bottom-6 right-6 z-30 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
        title="Start Dashboard Tutorial"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {isFirstVisit && !showTutorial && (
        <div className="fixed bottom-20 right-6 z-30 bg-blue-500 text-white p-3 rounded-lg shadow-lg max-w-xs animate-bounce">
          <p className="text-sm mb-2">👋 Welcome! Take a quick tour to learn about your dashboard features.</p>
          <button
            onClick={startTutorial}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm font-medium"
          >
            Start Tour
          </button>
        </div>
      )}

      <DashboardTutorial isOpen={showTutorial} onClose={closeTutorial} />
    </>
  );
}