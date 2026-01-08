import React, { useEffect } from 'react';
import useTutorial from './useTutorial';

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 };
const panel   = { width: 'min(920px, 94vw)', maxHeight: '86vh', overflowY: 'auto', background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,.3)' };
const header  = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 };
const titleS  = { fontSize: 18, fontWeight: 700 };
const bodyS   = { fontSize: 14, color: '#111827', lineHeight: 1.45, marginTop: 8 };
const footer  = { display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 8, alignItems: 'center' };

function StepView({ step }) {
  if (!step) return null;
  return (
    <div>
      <h3 style={{ margin: 0 }}>{step.title}</h3>
      <div style={bodyS}>
        <p style={{ marginTop: 8 }}>{step.description}</p>
        {step.image && (
          <div style={{ marginTop: 12 }}>
            <img src={step.image} alt={step.alt || step.title} style={{ maxWidth: '100%', borderRadius: 8 }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function TutorialModal({ steps = [], initialOpen = false, onClose, forceOpen = false }) {
  const t = useTutorial(steps);

  // abrir si el padre lo pide
  useEffect(() => {
    if (initialOpen || forceOpen) {
      t.setOpen(true);
    }
  }, [initialOpen, forceOpen, t]);

  // notificar al padre cuando se cierra
  useEffect(() => {
    if (!t.open && onClose) {
      onClose();
    }
  }, [t.open, onClose]);

  // accesos rápidos de teclado
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

  const isFirst = t.index === 0;
  const isLast  = t.index === steps.length - 1;

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && t.finish()}>
      <div role="dialog" aria-modal="true" style={panel} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <div style={titleS}>Tutorial — {t.step?.title ?? ''}</div>
          <button onClick={t.finish} aria-label="Skip">Skip</button>
        </div>

        <StepView step={t.step} />

        <div style={footer}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => t.goTo(i)}
                aria-label={`Go to step ${i + 1}`}
                style={{
                  width: 10, height: 10, borderRadius: 6,
                  background: i === t.index ? '#2563eb' : '#d1d5db', border: 'none', cursor: 'pointer'
                }}
              />
            ))}
            <span style={{ marginLeft: 10, fontSize: 13, color: '#6b7280' }}>{t.index + 1}/{steps.length}</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={t.prev} disabled={isFirst} style={{ opacity: isFirst ? 0.5 : 1 }}>Prev</button>
            {!isLast ? <button onClick={t.next}>Next</button> : <button onClick={t.finish}>Finish</button>}
          </div>
        </div>
      </div>
    </div>
  );
}