import type { Note } from "./store";

/** Tokenización muy simple */
const tokenize = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);

/** Construye TF-IDF por documento */
export function buildTfidf(notes: Note[]) {
  const docs = notes.map((n) => tokenize(`${n.titulo ?? ""} ${n.texto} ${(n.etiquetas ?? []).join(" ")}`));
  const df = new Map<string, number>();
  for (const tokens of docs) {
    const unique = new Set(tokens);
    for (const t of unique) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const N = docs.length || 1;
  const idf = new Map<string, number>();
  for (const [t, c] of df) idf.set(t, Math.log((N + 1) / (c + 1)) + 1);

  const tfidf = docs.map((tokens) => {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const vec = new Map<string, number>();
    for (const [t, f] of tf) vec.set(t, (f / tokens.length) * (idf.get(t) ?? 0));
    return vec;
  });

  function vectorize(text: string) {
    const tokens = tokenize(text);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const vec = new Map<string, number>();
    for (const [t, f] of tf) vec.set(t, (f / tokens.length) * (idf.get(t) ?? 0));
    return vec;
  }

  function cosine(a: Map<string, number>, b: Map<string, number>) {
    let dot = 0, na = 0, nb = 0;
    for (const [, v] of a) na += v * v;
    for (const [, v] of b) nb += v * v;
    const keys = new Set([...a.keys(), ...b.keys()]);
    for (const k of keys) dot += (a.get(k) ?? 0) * (b.get(k) ?? 0);
    if (!na || !nb) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  function search(query: string, topK = 5) {
    const qv = vectorize(query);
    const scored = tfidf.map((vec, i) => ({ i, score: cosine(qv, vec) }));
    scored.sort((x, y) => y.score - x.score);
    return scored.slice(0, topK);
  }

  return { search };
}
