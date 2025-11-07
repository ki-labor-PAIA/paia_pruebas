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
  zIndex: 10000,
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
  zIndex: 10001,
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

export default function SpotlightTour({ steps = [] }) {
  const t = useTutorial(steps);
  const [rect, setRect] = useState(null);
  const targetRef = useRef(null);

  // 🧭 Buscar el elemento a resaltar
  useLayoutEffect(() => {
    if (!t.open) return;
    const sel = t.step?.selector;
    const el = sel ? document.querySelector(sel) : null;
    targetRef.current = el || null;

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      const update = () => setRect(getRect(el));
      update();
      const ro = new ResizeObserver(update);
      ro.observe(el);
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
      return () => {
        ro.disconnect();
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
      };
    } else {
      setRect(null);
    }
  }, [t.open, t.index, t.step]);

  // ⌨️ Navegación con teclado
  useEffect(() => {
    if (!t.open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') t.finish();
      if (e.key === 'ArrowRight') t.next();
      if (e.key === 'ArrowLeft') t.prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [t]);

  if (!t.open) return null;

  const noTarget = !t.step?.selector || !rect;
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

  const tip = placeTooltip(rect, t.step?.placement || 'bottom');

  return (
    <>
      {/* 🔲 Capa oscura */}
      <div
        style={{ ...overlayS, WebkitClipPath: clip, clipPath: clip }}
        onClick={() => t.finish()}
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
              border: '3px solid #667eea',
              borderRadius: 12,
              boxShadow: '0 0 0 4px rgba(102, 126, 234, 0.2), 0 0 20px rgba(102, 126, 234, 0.4)',
              pointerEvents: 'none',
              zIndex: 10000,
              animation: 'pulse 2s ease-in-out infinite'
            }}
          />
          <style>{`
            @keyframes pulse {
              0%, 100% { box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2), 0 0 20px rgba(102, 126, 234, 0.4); }
              50% { box-shadow: 0 0 0 8px rgba(102, 126, 234, 0.3), 0 0 30px rgba(102, 126, 234, 0.6); }
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
          <div style={{ fontWeight: 700, fontSize: 18 }}>{t.step?.title}</div>
        </div>
        <div style={{ marginBottom: 4, opacity: 0.95 }}>{t.step?.description}</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
          Paso {t.index + 1} de {steps.length}
        </div>

        <div style={btnRow}>
          <button
            onClick={t.prev}
            disabled={t.index === 0}
            style={{
              ...btnStyle,
              opacity: t.index === 0 ? 0.5 : 1,
              cursor: t.index === 0 ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => { if (t.index !== 0) e.target.style.background = 'rgba(255,255,255,0.3)' }}
            onMouseLeave={(e) => { if (t.index !== 0) e.target.style.background = 'rgba(255,255,255,0.2)' }}
          >
            ← Anterior
          </button>
          {t.index < steps.length - 1 ? (
            <button
              onClick={t.next}
              style={btnPrimaryStyle}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={t.finish}
              style={btnPrimaryStyle}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              ✓ Finalizar
            </button>
          )}
          <button
            onClick={t.finish}
            style={{ ...btnStyle, marginLeft: 'auto', padding: '10px 14px' }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.3)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
          >
            Saltar
          </button>
        </div>
      </div>

      {/* ⚪ Indicadores inferiores */}
      <div style={dotBar}>
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => t.goTo(i)}
            style={{
              width: i === t.index ? 24 : 10,
              height: 10,
              borderRadius: 5,
              background: i === t.index
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(255,255,255,0.4)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              padding: 0
            }}
            onMouseEnter={(e) => {
              if (i !== t.index) e.target.style.background = 'rgba(255,255,255,0.6)';
            }}
            onMouseLeave={(e) => {
              if (i !== t.index) e.target.style.background = 'rgba(255,255,255,0.4)';
            }}
          />
        ))}
      </div>
    </>
  );
}
