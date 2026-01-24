import { useState } from 'react';
import TutorialModal from '@/components/tutorial/TutorialModal';
import SpotlightTour from '@/components/tutorial/SpotlightTour';

export default function TestTutorial() {
  const [showModal, setShowModal] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);

  const modalSteps = [
    {
      title: 'Paso 1: Bienvenida',
      description: 'Este es el primer paso del tutorial modal. Deberías ver esto en un modal centrado.',
    },
    {
      title: 'Paso 2: Explicación',
      description: 'Este es el segundo paso. Puedes navegar con las flechas del teclado o los botones.',
    },
    {
      title: 'Paso 3: Final',
      description: '¡Tutorial completado! Haz clic en Finish para cerrar.',
    },
  ];

  const spotlightSteps = [
    {
      title: 'Botón Modal',
      description: 'Este es el botón que abre el tutorial modal.',
      selector: '[data-tour="btn-modal"]',
      placement: 'bottom',
    },
    {
      title: 'Botón Spotlight',
      description: 'Este es el botón que abre el tutorial spotlight.',
      selector: '[data-tour="btn-spotlight"]',
      placement: 'bottom',
    },
    {
      title: 'Título de la página',
      description: 'Este es el título de la página de prueba.',
      selector: '[data-tour="title"]',
      placement: 'bottom',
    },
  ];

  return (
    <div style={{ padding: '40px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <h1 data-tour="title" style={{ marginBottom: '30px', color: '#333' }}>
        🧪 Página de Prueba de Tutorial
      </h1>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <button
          data-tour="btn-modal"
          onClick={() => setShowModal(true)}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          🎓 Abrir Tutorial Modal
        </button>

        <button
          data-tour="btn-spotlight"
          onClick={() => setShowSpotlight(true)}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: '#764ba2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          💡 Abrir Tutorial Spotlight
        </button>

        <button
          onClick={() => {
            localStorage.removeItem('paia_tutorial_seen_v1');
            alert('LocalStorage limpiado. Recarga la página.');
          }}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          🗑️ Limpiar LocalStorage
        </button>
      </div>

      <div
        style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ marginBottom: '15px' }}>Instrucciones:</h2>
        <ol style={{ lineHeight: '2' }}>
          <li>Haz clic en "Abrir Tutorial Modal" para ver el tutorial tipo modal</li>
          <li>Haz clic en "Abrir Tutorial Spotlight" para ver el tutorial con resaltado</li>
          <li>Si no se abre, haz clic en "Limpiar LocalStorage" y vuelve a intentar</li>
          <li>Usa las flechas del teclado para navegar (← →)</li>
          <li>Presiona ESC para cerrar</li>
        </ol>

        <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Estado:</h3>
        <ul>
          <li>Modal abierto: {showModal ? '✅ Sí' : '❌ No'}</li>
          <li>Spotlight abierto: {showSpotlight ? '✅ Sí' : '❌ No'}</li>
        </ul>
      </div>

      {/* Tutorial Modal */}
      {showModal && (
        <TutorialModal
          steps={modalSteps}
          forceOpen={true}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Tutorial Spotlight */}
      {showSpotlight && <SpotlightTour steps={spotlightSteps} />}
    </div>
  );
}
