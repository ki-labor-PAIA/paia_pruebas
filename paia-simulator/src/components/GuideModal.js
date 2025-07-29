export default function GuideModal({ onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Guía Rápida</h3>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ 
              background: 'var(--primary-color)', 
              color: 'white', 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0 
            }}>
              1
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1em', color: 'var(--text-primary)' }}>
                Añade actores
              </h4>
              <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                Crea actores humanos o de IA para tu escenario.
              </p>
            </div>
          </div>
          
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ 
              background: 'var(--primary-color)', 
              color: 'white', 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0 
            }}>
              2
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1em', color: 'var(--text-primary)' }}>
                Conéctalos
              </h4>
              <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                Arrastra desde un actor a otro para definir las interacciones.
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ 
              background: 'var(--primary-color)', 
              color: 'white', 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0 
            }}>
              3
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1em', color: 'var(--text-primary)' }}>
                Simula el escenario
              </h4>
              <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                Observa la dinámica de las interacciones en tiempo real.
              </p>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-primary">
            Comenzar
          </button>
        </div>
      </div>
    </div>
  );
}