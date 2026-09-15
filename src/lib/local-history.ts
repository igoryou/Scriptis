import { generationSchema, type Generation } from "./domain";
export const HISTORY_KEY = "scriptis.history.v1";
type Reader = Pick<Storage, "getItem">;

export function upsertHistory(
  history: Generation[],
  generation: Generation,
): Generation[] {
  return [generation, ...history.filter((item) => item.id !== generation.id)]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 50);
}

export function writeLocalHistory(
  storage: Pick<Storage, "setItem">,
  history: Generation[],
): string | null {
  try {
    storage.setItem(
      HISTORY_KEY,
      JSON.stringify(
        history.slice(0, 50).map((item) => generationSchema.parse(item)),
      ),
    );
    return null;
  } catch {
    return "Não foi possível salvar neste navegador. Copie seus textos antes de sair.";
  }
}

export function readLocalHistory(storage: Reader): {
  generations: Generation[];
  error: string | null;
} {
  try {
    const raw = storage.getItem(HISTORY_KEY);
    if (!raw) return { generations: [], error: null };
    if (raw.length > 2_000_000) throw new Error("Histórico excedido");
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error("Histórico inválido");
    const parsed = value.map((item) => generationSchema.safeParse(item));
    return {
      generations: parsed
        .flatMap((item) => (item.success ? [item.data] : []))
        .slice(0, 50),
      error: parsed.some((item) => !item.success)
        ? "Alguns registros do histórico estão inválidos e não puderam ser abertos."
        : null,
    };
  } catch {
    return {
      generations: [],
      error: "Não foi possível ler o histórico deste navegador.",
    };
  }
}
