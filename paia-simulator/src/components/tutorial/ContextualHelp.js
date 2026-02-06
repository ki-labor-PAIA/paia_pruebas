import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import librarySteps from './librarySteps';
import canvasSteps from './canvasSteps';

const STORAGE_KEY_PREFIX = 'paia_contextual_help_shown_';
const TUTORIAL_COMPLETED_KEY = 'paia_tutorial_completed_';

// Tooltip styles
const tooltipStyle = {
  position: 'fixed',
  maxWidth: 320,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
  padding: '12px 16px',
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
  zIndex: 10003,
  fontSize: 13,
  lineHeight: 1.5,
  pointerEvents: 'auto',
  animation: 'contextualFadeIn 0.3s ease-in-out'
};

const buttonStyle = {
  marginTop: 10,
  padding: '6px 12px',
  borderRadius: 6,
  border: 'none',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  background: 'white',
  color: '#667eea',
  transition: 'transform 0.2s ease'
};

/**
 * ContextualHelp - Shows tooltips for tutorial elements that were skipped
 * Monitors the DOM for data-tutorial elements after tutorial completion
 */
export default function ContextualHelp() {
  const router = useRouter();
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const observerRef = useRef(null);
  const shownElementsRef = useRef(new Set());
  const currentPhase = router.pathname === '/canvas' ? 'canvas' : 'library';

  useEffect(() => {
    // Check if tutorial was completed for this phase
    const tutorialCompleted = localStorage.getItem(TUTORIAL_COMPLETED_KEY + currentPhase);
    if (!tutorialCompleted) {
      return; // Tutorial not completed yet, don't show contextual help
    }

    // Load already shown contextual help elements
    const shownElements = JSON.parse(localStorage.getItem(STORAGE_KEY_PREFIX + currentPhase) || '[]');
    shownElementsRef.current = new Set(shownElements);

    // Get tutorial steps for current phase
    const steps = currentPhase === 'canvas' ? canvasSteps : librarySteps;

    // Create a map of selector -> step info
    const stepMap = new Map();
    steps.forEach(step => {
      if (step.selector) {
        stepMap.set(step.selector, {
          title: step.title,
          description: step.description,
          selector: step.selector
        });
      }
    });

    // Function to check if an element needs contextual help
    const checkElement = (element) => {
      const selector = element.getAttribute('data-tutorial');
      if (!selector) return;

      const fullSelector = `[data-tutorial="${selector}"]`;

      // Check if this element was already shown
      if (shownElementsRef.current.has(selector)) return;

      // Check if we have step info for this selector
      const stepInfo = stepMap.get(fullSelector);
      if (!stepInfo) return;

      // Calculate position
      const rect = element.getBoundingClientRect();
      const tooltipWidth = 320;
      const tooltipHeight = 120;

      // Position below the element
      let top = rect.bottom + 8;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;

      // Adjust if off-screen
      if (left < 16) left = 16;
      if (left + tooltipWidth > window.innerWidth - 16) {
        left = window.innerWidth - tooltipWidth - 16;
      }
      if (top + tooltipHeight > window.innerHeight - 16) {
        top = rect.top - tooltipHeight - 8;
      }

      // Show tooltip
      setActiveTooltip({
        ...stepInfo,
        selector
      });
      setPosition({ top, left });

      console.log(`📌 Showing contextual help for: ${selector}`);
    };

    // Scan existing elements
    const scanExistingElements = () => {
      const elements = document.querySelectorAll('[data-tutorial]');
      elements.forEach(element => {
        // Only show one tooltip at a time
        if (!activeTooltip) {
          checkElement(element);
        }
      });
    };

    // Initial scan after a delay (let the page settle and user explore)
    const initialScanTimeout = setTimeout(() => {
      scanExistingElements();
    }, 5000);

    // Set up MutationObserver to detect new elements
    observerRef.current = new MutationObserver((mutations) => {
      if (activeTooltip) return; // Don't show multiple tooltips at once

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check the node itself
            if (node.hasAttribute && node.hasAttribute('data-tutorial')) {
              checkElement(node);
            }
            // Check child nodes
            const children = node.querySelectorAll ? node.querySelectorAll('[data-tutorial]') : [];
            children.forEach(child => checkElement(child));
          }
        });
      });
    });

    // Start observing
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Cleanup
    return () => {
      clearTimeout(initialScanTimeout);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [currentPhase, activeTooltip]);

  const handleGotIt = () => {
    if (activeTooltip) {
      // Mark as shown
      shownElementsRef.current.add(activeTooltip.selector);

      // Save to localStorage
      const shownArray = Array.from(shownElementsRef.current);
      localStorage.setItem(STORAGE_KEY_PREFIX + currentPhase, JSON.stringify(shownArray));

      console.log(`✅ Contextual help marked as shown for: ${activeTooltip.selector}`);
    }

    setActiveTooltip(null);
  };

  const handleDismiss = () => {
    // Mark as shown so it doesn't appear again
    if (activeTooltip) {
      shownElementsRef.current.add(activeTooltip.selector);
      const shownArray = Array.from(shownElementsRef.current);
      localStorage.setItem(STORAGE_KEY_PREFIX + currentPhase, JSON.stringify(shownArray));
      console.log(`🚫 Contextual help dismissed and hidden for: ${activeTooltip.selector}`);
    }
    setActiveTooltip(null);
  };

  if (!activeTooltip) return null;

  return (
    <>
      <style>{`
        @keyframes contextualFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        style={{
          ...tooltipStyle,
          top: position.top,
          left: position.left
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>💡</span>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{activeTooltip.title}</div>
        </div>

        <div style={{ marginBottom: 8, opacity: 0.95, fontSize: 12 }}>
          {activeTooltip.description}
        </div>

        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10, fontStyle: 'italic' }}>
          This feature was skipped in your tutorial
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleGotIt}
            style={buttonStyle}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            Got it! ✓
          </button>
          <button
            onClick={handleDismiss}
            style={{
              ...buttonStyle,
              background: 'transparent',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.1)';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.transform = 'scale(1)';
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </>
  );
}
