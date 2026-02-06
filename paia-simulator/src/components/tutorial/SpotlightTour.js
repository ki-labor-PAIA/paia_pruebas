import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import useTutorial from './useTutorial';

// 🎯 Capa oscura que resalta el elemento actual
const overlayS = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.5)',
  zIndex: 9999,
  pointerEvents: 'auto',
  transition: 'clip-path 0.25s ease'
};

// 💬 Tooltip (texto del tutorial)
const tooltipS = {
  position: 'fixed',
  maxWidth: 380,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
  padding: 20,
  borderRadius: 16,
  boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(255,255,255,0.1)',
  zIndex: 10002,
  fontSize: 14,
  lineHeight: 1.6,
  backdropFilter: 'blur(10px)'
};

// 🔘 Botones y controles
const btnRow = { display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' };
const btnStyle = {
  padding: '10px 18px',
  borderRadius: 8,
  border: 'none',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  background: 'rgba(255,255,255,0.2)',
  color: 'white',
  backdropFilter: 'blur(10px)'
};
const btnPrimaryStyle = {
  ...btnStyle,
  background: 'white',
  color: '#667eea'
};
const dotBar = {
  position: 'fixed',
  left: '50%',
  transform: 'translateX(-50%)',
  bottom: 24,
  display: 'flex',
  gap: 10,
  zIndex: 10002,
  background: 'rgba(0,0,0,0.5)',
  padding: '10px 16px',
  borderRadius: 20,
  backdropFilter: 'blur(10px)'
};

function getRect(target) {
  if (!target) return null;
  const r = target.getBoundingClientRect();
  const pad = 6;
  return {
    x: r.left - pad,
    y: r.top - pad,
    w: r.width + pad * 2,
    h: r.height + pad * 2,
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
  };
}

function placeTooltip(rect, placement = 'bottom', gap = 16) {
  if (!rect) return { top: 100, left: 100 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tooltipWidth = 380;
  const tooltipHeight = 180;
  const t = {};

  switch (placement) {
    case 'top':
      t.top = Math.max(16, rect.y - tooltipHeight - gap);
      t.left = Math.max(16, Math.min(vw - tooltipWidth - 16, rect.cx - tooltipWidth / 2));
      // Si no cabe arriba, mover abajo
      if (t.top < 16) {
        t.top = rect.y + rect.h + gap;
      }
      break;
    case 'right':
      t.left = Math.min(vw - tooltipWidth - 16, rect.x + rect.w + gap);
      t.top = Math.max(16, Math.min(vh - tooltipHeight - 16, rect.cy - tooltipHeight / 2));
      // Si no cabe a la derecha, mover a la izquierda
      if (t.left + tooltipWidth > vw - 16) {
        t.left = Math.max(16, rect.x - tooltipWidth - gap);
      }
      break;
    case 'left':
      t.left = Math.max(16, rect.x - tooltipWidth - gap);
      t.top = Math.max(16, Math.min(vh - tooltipHeight - 16, rect.cy - tooltipHeight / 2));
      // Si no cabe a la izquierda, mover a la derecha
      if (t.left < 16) {
        t.left = rect.x + rect.w + gap;
      }
      break;
    default:
      // bottom
      t.top = Math.min(vh - tooltipHeight - 16, rect.y + rect.h + gap);
      t.left = Math.max(16, Math.min(vw - tooltipWidth - 16, rect.cx - tooltipWidth / 2));
      // Si no cabe abajo, mover arriba
      if (t.top + tooltipHeight > vh - 16) {
        t.top = Math.max(16, rect.y - tooltipHeight - gap);
      }
  }
  return t;
}

export default function SpotlightTour({ steps = [], forceOpen = false, onClose, phase = 'library', onStepAction }) {
  // Estado local en lugar de usar el hook cuando forceOpen está activo
  const [open, setOpen] = useState(forceOpen);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [waitingForClick, setWaitingForClick] = useState(false);
  const [actionsExecuted, setActionsExecuted] = useState(new Set());
  const [displayedSteps, setDisplayedSteps] = useState(new Set([0])); // Track displayed step indices
  const targetRef = useRef(null);

  const step = steps[index];

  // Calculate continuous step number (excluding skipped steps)
  const displayedStepNumber = Array.from(displayedSteps).filter(i => i <= index).length;
  const totalDisplayedSteps = displayedSteps.size;

  const next = () => {
    if (index < steps.length - 1) {
      setIndex(i => i + 1);
      setWaitingForClick(false);
    } else {
      finish();
    }
  };

  const prev = () => setIndex(i => Math.max(i - 1, 0));
  const goTo = (i) => setIndex(Math.max(0, Math.min(i, steps.length - 1)));

  const finish = () => {
    setOpen(false);
    setIndex(0);
    setWaitingForClick(false);
    if (onClose) onClose();
  };

  // 🧭 Buscar el elemento a resaltar (con skip si no existe)
  useLayoutEffect(() => {
    if (!open) return;
    const sel = step?.selector;
    const el = sel ? document.querySelector(sel) : null;
    targetRef.current = el || null;

    // Si el elemento no existe y debe saltar, avanzar automáticamente
    if (!el && step?.skipIfNotFound) {
      console.log(`⏭️ Skipping step ${index}: element not found`);
      setTimeout(() => next(), 100);
      return;
    }

    // Mark this step as displayed (element found or no selector)
    if (el || !sel) {
      setDisplayedSteps(prev => new Set([...prev, index]));
    }

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      const update = () => setRect(getRect(el));
      update();
      const ro = new ResizeObserver(update);
      ro.observe(el);
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);

      // Si requiere click, establecer estado de espera
      if (step?.requireClick) {
        setWaitingForClick(true);
      }

      return () => {
        ro.disconnect();
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
      };
    } else {
      setRect(null);
    }
  }, [open, index, step]);

  // 🎬 Ejecutar acciones del paso (crear nodos de ejemplo, etc.)
  useEffect(() => {
    if (!open || !step?.action || !onStepAction) return;

    // Evitar ejecutar la misma acción múltiples veces
    const actionKey = `${index}-${step.action}`;
    if (actionsExecuted.has(actionKey)) return;

    console.log(`🎬 Executing tutorial action: ${step.action}`);
    onStepAction(step.action, step);

    setActionsExecuted(prev => new Set([...prev, actionKey]));
  }, [open, index, step, onStepAction, actionsExecuted]);

  // ⌨️ Navegación con teclado
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
      // Deshabilitar flechas si espera click
      if (!waitingForClick) {
        if (e.key === 'ArrowRight') next();
        if (e.key === 'ArrowLeft') prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, waitingForClick]);

  // 🖱️ Detectar click en elemento destacado
  useEffect(() => {
    if (!open || !waitingForClick || !targetRef.current) return;

    const handleClick = (e) => {
      // Si es un click requerido, avanzar automáticamente
      if (step?.requireClick && step?.action === 'required-click') {
        console.log('✅ Required element clicked, advancing...');
        setTimeout(() => next(), 300); // Pequeño delay para feedback visual
      } else if (step?.requireClick && step?.action === 'click-to-continue') {
        // Solo avanzar si hace click en el elemento específico
        console.log('✅ Element clicked');
        setWaitingForClick(false);
      }
    };

    const element = targetRef.current;
    element.addEventListener('click', handleClick, { capture: true });

    return () => {
      element.removeEventListener('click', handleClick, { capture: true });
    };
  }, [open, waitingForClick, step]);

  if (!open) return null;

  const noTarget = !step?.selector || !rect;
  const r = rect;

  // ✂️ Hueco alrededor del objetivo
  const radius = 10;
  const clip = noTarget
    ? 'none'
    : `path('
        M0,0 H${window.innerWidth} V${window.innerHeight} H0 Z
        M${r.x},${r.y + radius}
        Q${r.x},${r.y} ${r.x + radius},${r.y}
        H${r.x + r.w - radius}
        Q${r.x + r.w},${r.y} ${r.x + r.w},${r.y + radius}
        V${r.y + r.h - radius}
        Q${r.x + r.w},${r.y + r.h} ${r.x + r.w - radius},${r.y + r.h}
        H${r.x + radius}
        Q${r.x},${r.y + r.h} ${r.x},${r.y + r.h - radius}
        Z
      ')`;

  const tip = placeTooltip(rect, step?.placement || 'bottom');

  // Bloquear clics si el step lo requiere
  const shouldBlockClicks = step?.blockOtherClicks && waitingForClick;

  return (
    <>
      {/* 🔲 Capa oscura */}
      <div
        style={{
          ...overlayS,
          WebkitClipPath: clip,
          clipPath: clip,
          pointerEvents: shouldBlockClicks ? 'all' : 'auto',
          cursor: shouldBlockClicks ? 'not-allowed' : 'pointer'
        }}
        onClick={(e) => {
          if (shouldBlockClicks) {
            e.stopPropagation();
            e.preventDefault();
            // Mostrar feedback visual de que está bloqueado
            console.log('⚠️ Please click on the highlighted element');
          } else {
            finish();
          }
        }}
      />

      {/* 🔵 Halo alrededor del elemento */}
      {!noTarget && (
        <>
          <div
            style={{
              position: 'fixed',
              left: r.x,
              top: r.y,
              width: r.w,
              height: r.h,
              border: step?.highlightPulse ? '4px solid #667eea' : '3px solid #667eea',
              borderRadius: 12,
              boxShadow: step?.highlightPulse
                ? '0 0 0 8px rgba(102, 126, 234, 0.3), 0 0 40px rgba(102, 126, 234, 0.6)'
                : '0 0 0 4px rgba(102, 126, 234, 0.2), 0 0 20px rgba(102, 126, 234, 0.4)',
              pointerEvents: 'none',
              zIndex: 10002,
              animation: step?.highlightPulse ? 'strongPulse 1.5s ease-in-out infinite' : 'pulse 2s ease-in-out infinite'
            }}
          />
          <style>{`
            @keyframes pulse {
              0%, 100% { box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2), 0 0 20px rgba(102, 126, 234, 0.4); }
              50% { box-shadow: 0 0 0 8px rgba(102, 126, 234, 0.3), 0 0 30px rgba(102, 126, 234, 0.6); }
            }
            @keyframes strongPulse {
              0%, 100% {
                box-shadow: 0 0 0 8px rgba(102, 126, 234, 0.3), 0 0 40px rgba(102, 126, 234, 0.6);
                transform: scale(1);
              }
              50% {
                box-shadow: 0 0 0 12px rgba(102, 126, 234, 0.4), 0 0 60px rgba(102, 126, 234, 0.8);
                transform: scale(1.02);
              }
            }
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </>
      )}

      {/* 💬 Tooltip con descripción */}
      <div style={{
        ...tooltipS,
        top: tip.top,
        left: tip.left,
        minHeight: 'auto',
        animation: 'fadeIn 0.3s ease-in-out'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 24 }}>🎓</span>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{step?.title}</div>
        </div>
        <div style={{ marginBottom: 4, opacity: 0.95 }}>{step?.description}</div>

        {/* Mensaje de click requerido */}
        {waitingForClick && step?.action === 'required-click' && (
          <div style={{
            marginTop: 12,
            marginBottom: 12,
            padding: '8px 12px',
            background: 'rgba(255, 193, 7, 0.2)',
            borderRadius: 8,
            border: '1px solid rgba(255, 193, 7, 0.4)',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span style={{ fontSize: 18 }}>👆</span>
            Click on the highlighted element to continue
          </div>
        )}

        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
          Step {displayedStepNumber} of {steps.length}
        </div>

        {/* Botones de limpieza para el paso final */}
        {step?.showCleanupOptions ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            <button
              onClick={() => {
                // Limpiar según la fase (library o canvas)
                const cleanupAction = phase === 'library' ? 'cleanupTutorialFlows' : 'cleanupTutorialNodes';
                if (onStepAction) onStepAction(cleanupAction);
                finish();
              }}
              style={{
                ...btnPrimaryStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              🧹 Start Fresh {phase === 'library' ? '(Remove Examples)' : '(Clear Canvas)'}
            </button>
            <button
              onClick={finish}
              style={{
                ...btnStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
            >
              💾 Keep Examples
            </button>
          </div>
        ) : (
          <div style={btnRow}>
            <button
              onClick={prev}
              disabled={index === 0 || waitingForClick}
              style={{
                ...btnStyle,
                opacity: (index === 0 || waitingForClick) ? 0.5 : 1,
                cursor: (index === 0 || waitingForClick) ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => { if (index !== 0 && !waitingForClick) e.target.style.background = 'rgba(255,255,255,0.3)' }}
              onMouseLeave={(e) => { if (index !== 0 && !waitingForClick) e.target.style.background = 'rgba(255,255,255,0.2)' }}
            >
              ← Previous
            </button>
            {index < steps.length - 1 ? (
              <button
                onClick={next}
                disabled={waitingForClick}
                style={{
                  ...btnPrimaryStyle,
                  opacity: waitingForClick ? 0.5 : 1,
                  cursor: waitingForClick ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => { if (!waitingForClick) e.target.style.transform = 'scale(1.05)' }}
                onMouseLeave={(e) => { if (!waitingForClick) e.target.style.transform = 'scale(1)' }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={finish}
                style={btnPrimaryStyle}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                ✓ Finish
              </button>
            )}
            <button
              onClick={finish}
              style={{ ...btnStyle, marginLeft: 'auto', padding: '10px 14px' }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
            >
              Skip
            </button>
          </div>
        )}
      </div>

      {/* ⚪ Indicadores inferiores */}
      <div style={dotBar}>
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === index ? 24 : 10,
              height: 10,
              borderRadius: 5,
              background: i === index
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(255,255,255,0.4)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              padding: 0
            }}
            onMouseEnter={(e) => {
              if (i !== index) e.target.style.background = 'rgba(255,255,255,0.6)';
            }}
            onMouseLeave={(e) => {
              if (i !== index) e.target.style.background = 'rgba(255,255,255,0.4)';
            }}
          />
        ))}
      </div>
    </>
  );
}