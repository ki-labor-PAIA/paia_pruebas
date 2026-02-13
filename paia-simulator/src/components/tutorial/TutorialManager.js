import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SpotlightTour from './SpotlightTour';
import librarySteps from './librarySteps';
import canvasSteps from './canvasSteps';

/**
 * TutorialManager - Manages the complete tutorial flow
 * - Detects current page (Library or Canvas)
 * - Loads appropriate steps
 * - Handles persistence (localStorage)
 * - Manages transitions between phases
 */
export default function TutorialManager({ forceStart = false, onComplete, onTutorialAction }) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(null); // 'library' or 'canvas'
  const [hasCompletedLibrary, setHasCompletedLibrary] = useState(false);
  const [hasCompletedCanvas, setHasCompletedCanvas] = useState(false);

  // Detect current page
  useEffect(() => {
    const path = router.pathname;

    if (path === '/library' || path === '/') {
      setCurrentPhase('library');
    } else if (path === '/create' || path.includes('/simulate')) {
      setCurrentPhase('canvas');
    } else {
      setCurrentPhase(null);
    }
  }, [router.pathname]);

  // Load completion status from localStorage
  useEffect(() => {
    try {
      const tutorialData = localStorage.getItem('paia_tutorial_progress');
      if (tutorialData) {
        const data = JSON.parse(tutorialData);
        setHasCompletedLibrary(data.completedLibrary || false);
        setHasCompletedCanvas(data.completedCanvas || false);
      }
    } catch (error) {
      console.error('Error loading tutorial progress:', error);
    }

    // Listen for restart tutorial event
    const handleRestartTutorial = () => {
      console.log('🔄 Restarting tutorial without page reload');
      setHasCompletedLibrary(false);
      setHasCompletedCanvas(false);
      setIsActive(true);
    };

    window.addEventListener('restartTutorial', handleRestartTutorial);

    return () => {
      window.removeEventListener('restartTutorial', handleRestartTutorial);
    };
  }, []);

  // Auto-start tutorial for first-time users
  useEffect(() => {
    if (forceStart) {
      setIsActive(true);
      return;
    }

    // If user hasn't completed library tutorial and is on library page
    if (currentPhase === 'library' && !hasCompletedLibrary) {
      setIsActive(true);
    }

    // If user is on canvas and hasn't completed canvas tutorial
    // (regardless of library completion - allows direct canvas tutorial access)
    if (currentPhase === 'canvas' && !hasCompletedCanvas) {
      setIsActive(true);
    }
  }, [currentPhase, hasCompletedLibrary, hasCompletedCanvas, forceStart]);

  // Save progress when phase completes
  const handlePhaseComplete = () => {
    try {
      const tutorialData = {
        completedLibrary: currentPhase === 'library' ? true : hasCompletedLibrary,
        completedCanvas: currentPhase === 'canvas' ? true : hasCompletedCanvas,
        lastCompleted: new Date().toISOString()
      };

      localStorage.setItem('paia_tutorial_progress', JSON.stringify(tutorialData));

      // Also set individual completion keys for ContextualHelp
      if (currentPhase) {
        localStorage.setItem(`paia_tutorial_completed_${currentPhase}`, 'true');
        console.log(`✅ Tutorial completed for phase: ${currentPhase}`);
      }

      if (currentPhase === 'library') {
        setHasCompletedLibrary(true);
      } else if (currentPhase === 'canvas') {
        setHasCompletedCanvas(true);
      }

      setIsActive(false);

      if (onComplete) {
        onComplete(currentPhase);
      }
    } catch (error) {
      console.error('Error saving tutorial progress:', error);
    }
  };

  // Reset tutorial progress (for testing or user request)
  const resetTutorial = () => {
    try {
      localStorage.removeItem('paia_tutorial_progress');
      localStorage.removeItem('paia_first_visit');
      setHasCompletedLibrary(false);
      setHasCompletedCanvas(false);
      setIsActive(true);
    } catch (error) {
      console.error('Error resetting tutorial:', error);
    }
  };

  // Handle tutorial actions (create nodes, cleanup, etc.)
  const handleTutorialAction = (action, step) => {
    console.log(`🎬 TutorialManager handling action: ${action}`);

    // Emit custom event for PAIASimulator to listen
    window.dispatchEvent(new CustomEvent('tutorialAction', {
      detail: { action, step, phase: currentPhase }
    }));

    if (onTutorialAction) {
      onTutorialAction(action, step, currentPhase);
    }
  };

  // Get steps for current phase
  const getCurrentSteps = () => {
    if (currentPhase === 'library') {
      return librarySteps;
    } else if (currentPhase === 'canvas') {
      return canvasSteps;
    }
    return [];
  };

  // Don't render if no active phase or tutorial not active
  if (!currentPhase || !isActive) {
    return null;
  }

  const steps = getCurrentSteps();

  return (
    <SpotlightTour
      steps={steps}
      forceOpen={isActive}
      onClose={handlePhaseComplete}
      phase={currentPhase}
      onStepAction={handleTutorialAction}
    />
  );
}

// Export reset function for use in settings/debug
export const resetPAIATutorial = () => {
  try {
    localStorage.removeItem('paia_tutorial_progress');
    console.log('✅ Tutorial progress reset');
    return true;
  } catch (error) {
    console.error('❌ Error resetting tutorial:', error);
    return false;
  }
};

// Export function to restart tutorial (use from Tutorial button)
export const restartTutorial = () => {
  try {
    // Reset tutorial progress
    localStorage.removeItem('paia_tutorial_progress');
    localStorage.removeItem('paia_tutorial_completed_library');
    localStorage.removeItem('paia_tutorial_completed_canvas');
    localStorage.removeItem('paia_contextual_help_shown_library');
    localStorage.removeItem('paia_contextual_help_shown_canvas');

    console.log('✅ Tutorial and contextual help data reset');

    // Dispatch event to restart tutorial without page reload
    window.dispatchEvent(new CustomEvent('restartTutorial'));

    return true;
  } catch (error) {
    console.error('❌ Error restarting tutorial:', error);
    return false;
  }
};