export function autoCategories(text: string): string[] {
  const t = text.toLowerCase();
  const cats: string[] = [];
  if (/(cliente|prospecto|venta|cotización)/.test(t)) cats.push("ventas");
  if (/(reunión|meeting|minuta|acuerdo)/.test(t)) cats.push("reuniones");
  if (/(proyecto|idea|brainstorm|tarea)/.test(t)) cats.push("proyectos");
  if (/(persona|perfil|biografía|familia)/.test(t)) cats.push("personas");
  if (cats.length === 0) cats.push("general");
  return Array.from(new Set(cats));
}
