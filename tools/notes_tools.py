"""
Notes tools for PAIA agents.
Provides functions to save and search personal notes.
"""
import os
import json
import uuid
from typing import List
from datetime import datetime
from langchain_core.tools import tool


# Notes file path
NOTES_FILE = "./mcp-notes/data/notes.jsonl"


def _get_notes() -> List[dict]:
    """
    Internal helper to load all notes from file.

    Returns:
        List of note dictionaries
    """
    if not os.path.exists(NOTES_FILE):
        os.makedirs(os.path.dirname(NOTES_FILE), exist_ok=True)
        return []
    with open(NOTES_FILE, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def _save_notes(notes: List[dict]) -> None:
    """
    Internal helper to save all notes to file.

    Args:
        notes: List of note dictionaries to save
    """
    with open(NOTES_FILE, "w", encoding="utf-8") as f:
        for note in notes:
            f.write(json.dumps(note) + "\n")


def create_notes_tools():
    """
    Create notes management tools.

    Returns:
        List of notes tool functions
    """

    @tool
    def save_note(title: str, content: str, tags: List[str] = None) -> str:
        """
        Save a new personal note. Useful for remembering information.

        Args:
            title: Note title
            content: Note content
            tags: Optional list of tags for categorization

        Returns:
            Confirmation message with note ID
        """
        try:
            notes = _get_notes()
            new_note = {
                "id": str(uuid.uuid4())[:8],
                "title": title,
                "content": content,
                "tags": tags or [],
                "created_at": datetime.now().isoformat(),
            }
            notes.append(new_note)
            _save_notes(notes)
            return f"✅ Nota guardada con éxito. ID: {new_note['id']}"
        except Exception as e:
            return f"❌ Error al guardar la nota: {e}"

    @tool
    def search_notes(query: str) -> str:
        """
        Search all your personal notes.

        Args:
            query: Search query to match in title or content

        Returns:
            List of matching notes or message if none found
        """
        notes = _get_notes()
        results = [
            note for note in notes
            if query.lower() in note["title"].lower() or query.lower() in note["content"].lower()
        ]
        if not results:
            return "No se encontraron notas con ese criterio."

        formatted_results = []
        for r in results:
            tags = ", ".join(r.get('tags', []))
            formatted_results.append(f"- ID: {r['id']}, Título: {r['title']}, Etiquetas: {tags}")
        return "Notas encontradas:\n" + "\n".join(formatted_results)

    return [save_note, search_notes]
