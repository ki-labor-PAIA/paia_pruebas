import { useState, useEffect } from 'react';

// Mock data para simular notas existentes
const mockNotes = [
  { id: 1, title: 'Idea de Proyecto', content: 'Crear un sistema de agentes IA con Next.js y Python.', tags: ['ia', 'python', 'nextjs'] },
  { id: 2, title: 'Recordatorio', content: 'Configurar el servidor de base de datos PostgreSQL en Docker.', tags: ['docker', 'db'] },
  { id: 3, title: 'Lista de Tareas', content: `- Crear componente NotesPanel
- Crear componente NoteNode
- Integrar en la UI principal`, tags: ['frontend', 'react'] },
];

export default function NotesPanel({ onClose }) {
  const [notes, setNotes] = useState([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    // Simular la carga de notas
    setLoading(true);
    setTimeout(() => {
      setNotes(mockNotes);
      setLoading(false);
    }, 500);
  }, []);

  const handleCreateNote = () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      setStatus('❌ El título y el contenido no pueden estar vacíos.');
      return;
    }

    setLoading(true);
    setStatus('Creando nota...');
    setTimeout(() => {
      const newNote = {
        id: notes.length + 1,
        title: newNoteTitle,
        content: newNoteContent,
        tags: ['nueva'],
      };
      setNotes([...notes, newNote]);
      setNewNoteTitle('');
      setNewNoteContent('');
      setLoading(false);
      setStatus('✅ Nota creada exitosamente!');
    }, 500);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '10px',
        padding: '30px',
        maxWidth: '700px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '15px'
        }}>
          <h2 style={{ margin: 0, color: '#333' }}>📝 Gestor de Notas del Agente</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {/* Sección para crear nueva nota */}
        <div style={{ marginBottom: '25px', border: '1px solid #e5e7eb', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ color: '#4f46e5', marginBottom: '15px' }}>Crear Nueva Nota</h3>
          <input
            type="text"
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
            placeholder="Título de la nota"
            style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginBottom: '10px' }}
          />
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Contenido de la nota..."
            rows={4}
            style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px',
            fontSize: '14px', resize: 'vertical', marginBottom: '15px' }}
          />
          <button
            onClick={handleCreateNote}
            disabled={loading}
            style={{
              background: '#6366f1',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Guardando...' : '💾 Guardar Nota'}
          </button>
          {status && <p style={{ marginTop: '15px', fontSize: '14px', color: status.includes('❌') ? 'red' : 'green' }}>{status}</p>}
        </div>

        {/* Sección para mostrar notas existentes */}
        <div>
          <h3 style={{ color: '#333', marginBottom: '15px' }}>Notas Guardadas</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '10px' }}>
            {loading && notes.length === 0 ? <p>Cargando notas...</p> : 
              notes.map(note => (
                <div key={note.id} style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#4f46e5' }}>{note.title}</h4>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>{note.content}</p>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    <strong>Tags:</strong> {note.tags.join(', ')}
                  </div>
                </div>
              ))
            }
            {notes.length === 0 && !loading && <p>No hay notas guardadas.</p>}
          </div>
        </div>

      </div>
    </div>
  );
}
