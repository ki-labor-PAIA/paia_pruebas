const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function createNote(data) {
  const res = await fetch(BASE + '/api/notes/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
}

export async function searchNotes(data) {
  const res = await fetch(BASE + '/api/notes/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
}

export async function categorizeText(data) {
  const res = await fetch(BASE + '/api/notes/categorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
}
