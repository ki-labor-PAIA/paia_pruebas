import "dotenv/config";
import { createServer, Tool } from "@modelcontextprotocol/sdk";
import { NotesStore, Note } from "./store";
import { buildTfidf } from "./search";
import { autoCategories } from "./categorize";

const HOST = process.env.MCP_HOST ?? "127.0.0.1";
const PORT = Number(process.env.MCP_PORT ?? 8974);
const PATH = process.env.NOTES_PATH ?? "./data/notes.jsonl";

const store = new NotesStore(PATH);

const crearNota: Tool = {
  name: "crear_nota",
  description: "Crea una nota {texto, titulo?, etiquetas?}. Devuelve la nota creada.",
  inputSchema: {
    type: "object",
    properties: {
      texto: { type: "string" },
      titulo: { type: "string" },
      etiquetas: { type: "array", items: { type: "string" } }
    },
    required: ["texto"]
  },
  execute: async (args) => {
    const etiquetas = (args.etiquetas as string[] | undefined) ?? autoCategories(String(args.texto));
    const note: Note = {
      id: crypto.randomUUID(),
      titulo: args.titulo as string | undefined,
      texto: String(args.texto),
      etiquetas,
      createdAt: new Date().toISOString()
    };
    await store.add(note);
    return { content: [{ type: "text", text: JSON.stringify(note, null, 2) }] };
  }
};

const buscarNota: Tool = {
  name: "buscar_nota",
  description: "Busca notas por contenido/categoría {consulta, topK?}. Devuelve las mejores coincidencias.",
  inputSchema: {
    type: "object",
    properties: {
      consulta: { type: "string" },
      topK: { type: "number" }
    },
    required: ["consulta"]
  },
  execute: async (args) => {
    const notes = await store.all();
    if (notes.length === 0) return { content: [{ type: "text", text: "[]" }] };
    const tfidf = buildTfidf(notes);
    const results = tfidf.search(String(args.consulta), Number(args.topK ?? 5));
    const payload = results.map(r => ({ score: r.score, note: notes[r.i] }));
    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
  }
};

const categorizarNota: Tool = {
  name: "categorizar_nota",
  description: "Sujerir categorías para un texto dado {texto}.",
  inputSchema: {
    type: "object",
    properties: { texto: { type: "string" } },
    required: ["texto"]
  },
  execute: async (args) => {
    const cats = autoCategories(String(args.texto));
    return { content: [{ type: "text", text: JSON.stringify({ etiquetas: cats }, null, 2) }] };
  }
};

const sincronizarNube: Tool = {
  name: "sincronizar_nube",
  description: "Stub de sincronización con proveedor de nube {provider, opciones?}. (No-op por defecto).",
  inputSchema: {
    type: "object",
    properties: {
      provider: { type: "string", enum: ["s3", "gdrive", "dropbox", "ninguno"] },
      opciones: { type: "object" }
    },
    required: ["provider"]
  },
  execute: async (args) => {
    // Punto de integración: aquí conectar con S3/GDrive/Dropbox
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, provider: args.provider }) }] };
  }
};

async function main() {
  const server = createServer({ name: "mcp-notes", version: "0.1.0" });
  server.useTool(crearNota);
  server.useTool(buscarNota);
  server.useTool(categorizarNota);
  server.useTool(sincronizarNube);
  await server.start({ host: HOST, port: PORT });
  // eslint-disable-next-line no-console
  console.log(`MCP Notes escuchando en http://${HOST}:${PORT}`);
}
main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
