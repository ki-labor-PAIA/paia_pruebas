import React, { useEffect, useState } from 'react';
import { createNote, searchNotes, categorizeText } from '../utils/apiNotes';

export default function NotesModal({ onClose }) {
  const [notas, setNotas] = useState([]);
  const [query, setQuery] = useState("");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [etiquetas, setEtiquetas] = useState("");
  const [editId, setEditId] = useState(null);

  const fetchNotas = async () => {
    const out = await searchNotes({ consulta: query || " " });
    const items = out.result || out || [];
    setNotas(Array.isArray(items) ? items.map(r => r.note || r) : []);
  };

  const handleSave = async () => {
    const data = {
      titulo,
      texto,
      etiquetas: etiquetas.split(',').map(t => t.trim()).filter(Boolean)
    };
    if (!texto) return alert("Write something in the note");
    if (editId) {
      await fetch("/api/notes/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, id: editId })
      });
      setEditId(null);
    } else {
      await createNote(data);
    }
    setTitulo(""); setTexto(""); setEtiquetas("");
    fetchNotas();
  };

  const handleEdit = (n) => {
    setEditId(n.id);
    setTitulo(n.titulo || "");
    setTexto(n.texto || "");
    setEtiquetas((n.etiquetas || []).join(", "));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    await fetch("/api/notes/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    fetchNotas();
  };

  const handleCategorize = async () => {
    if (!texto) return alert("Write something first");
    const out = await categorizeText({ texto });
    setEtiquetas((out.result?.etiquetas || []).join(", "));
  };

  useEffect(() => { fetchNotas(); }, []);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={{ margin: 0 }}>📝 Notes</h2>
          <button onClick={onClose} style={styles.close}>✖</button>
        </div>

        {/* 🔍 Búsqueda */}
        <div style={styles.section}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." style={styles.input} />
          <button onClick={fetchNotas} style={styles.btn}>Search</button>
        </div>

        {/* 📒 Lista de notas */}
        <div style={styles.notesList}>
          {notas.map((n) => (
            <div key={n.id} style={styles.noteCard}>
              <div><b>{n.titulo || "(untitled)"}</b></div>
              <div style={{ fontSize: "0.9em" }}>{n.texto}</div>
              <div style={styles.noteTags}>{(n.etiquetas || []).join(", ")}</div>
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button onClick={() => handleEdit(n)} style={styles.smallBtn}>✏️</button>
                <button onClick={() => handleDelete(n.id)} style={styles.smallBtn}>🗑️</button>
              </div>
            </div>
          ))}
        </div>

        {/* ➕ Crear / Editar nota */}
        <div style={styles.section}>
          <h4>{editId ? "Edit note" : "New note"}</h4>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Title" style={styles.input} />
          <textarea value={texto} onChange={e => setTexto(e.target.value)} placeholder="Text" style={styles.textarea} />
          <input value={etiquetas} onChange={e => setEtiquetas(e.target.value)} placeholder="Tags (comma separated)" style={styles.input} />
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleSave} style={styles.btn}>{editId ? "Update" : "Create"}</button>
            <button onClick={handleCategorize} style={styles.btn}>🏷️ Suggest categories</button>
          </div>
        </div>
      </div>
    </div>
  );
}
const styles = {
  overlay: {
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center"
  },
  modal: {
    background: "var(--card-bg)", color: "var(--text-primary)", padding: "20px",
    borderRadius: "8px", width: "700px", maxHeight: "90vh", overflowY: "auto"
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  close: { background: "transparent", color: "white", border: "none", fontSize: "1.2em", cursor: "pointer" },
  section: { marginBottom: "20px" },
  input: { width: "100%", padding: "8px", marginBottom: "8px", background: "#1e293b", color: "white", border: "1px solid var(--border-color)", borderRadius: "4px" },
  textarea: { width: "100%", height: "80px", padding: "8px", background: "#1e293b", color: "white", border: "1px solid var(--border-color)", borderRadius: "4px", marginBottom: "8px" },
  btn: { padding: "6px 12px", background: "var(--primary-color)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" },
  smallBtn: { padding: "4px 8px", background: "#334155", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" },
  notesList: { maxHeight: "250px", overflowY: "auto", marginBottom: "12px" },
  noteCard: { padding: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "6px", marginBottom: "6px" },
  noteTags: { fontSize: "0.8em", color: "var(--text-secondary)", marginTop: "4px" }
};
