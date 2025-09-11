import fs from "fs";
import path from "path";

export type Note = {
  id: string;
  titulo?: string;
  texto: string;
  etiquetas?: string[];
  createdAt: string;
};

const ensureDir = (p: string) => {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
};

export class NotesStore {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    ensureDir(path.dirname(filePath));
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, "", "utf-8");
    }
  }

  async add(note: Note) {
    fs.appendFileSync(this.filePath, JSON.stringify(note) + "\n", "utf-8");
    return note;
  }

  async all(): Promise<Note[]> {
    const raw = fs.readFileSync(this.filePath, "utf-8");
    if (!raw.trim()) return [];
    return raw
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l)) as Note[];
  }
}
