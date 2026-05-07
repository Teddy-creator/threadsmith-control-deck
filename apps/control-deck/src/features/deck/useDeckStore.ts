import { create } from "zustand";
import type { ActionRecommendation } from "@threadsmith/runtime";

export type DrawerId =
  | "objects"
  | "events"
  | "projects"
  | "acceptance"
  | null;

interface DeckStore {
  drawer: DrawerId;
  previewAction: ActionRecommendation | null;
  openDrawer: (drawer: Exclude<DrawerId, null>) => void;
  closeDrawer: () => void;
  openPreview: (action: ActionRecommendation) => void;
  closePreview: () => void;
}

export const useDeckStore = create<DeckStore>((set) => ({
  drawer: null,
  previewAction: null,
  openDrawer: (drawer) => set({ drawer }),
  closeDrawer: () => set({ drawer: null }),
  openPreview: (previewAction) => set({ previewAction }),
  closePreview: () => set({ previewAction: null })
}));
