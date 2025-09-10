import { create } from "zustand";
import { nanoid } from "nanoid";

export const useEditorStore = create((set, get) => ({
  name: "",
  type: "escpos",
  blocks: [],
  selectedId: null,
  selectedId: null,
  select: (id) => set({ selectedId: id }),
  setInitial: ({ name, type, blocks }) => set({ name, type, blocks }),
  addBlock: (type) =>
    set((s) => ({
      blocks: [
        ...s.blocks,
        {
          id: nanoid(6),
          type,
          x: 40,
          y: 40,
          w: 200,
          h: 24,
          text: type === "text" ? "Sample Text" : "",
          value: type === "barcode" || type === "qr" ? "" : undefined,
          align: "left",
          fontSize: 16,
          hri: 0,
        },
      ],
      selectedId: null,
    })),
  updateBlock: (id, patch) =>
    set((s) => ({
      blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })),
  removeBlock: (id) =>
    set((s) => ({
      blocks: s.blocks.filter((b) => b.id !== id),
      selectedId: null,
    })),
  select: (id) => set({ selectedId: id }),
}));
