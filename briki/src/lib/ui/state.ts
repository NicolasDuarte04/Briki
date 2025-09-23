import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type UIStep = "landing" | "conversation";

export interface CaseBrief {
  businessType?: string;
  employees?: number;
  coverage?: string;
}

interface UIState {
  step: UIStep;
  brief: CaseBrief;
  setStep: (step: UIStep) => void;
  setBrief: (brief: Partial<CaseBrief>) => void;
}

export const useUI = create<UIState>()(
  devtools(
    (set) => ({
      step: "landing",
      brief: {},
      setStep: (step) => set({ step }),
      setBrief: (brief) =>
        set((state) => ({ brief: { ...state.brief, ...brief } })),
    }),
    { name: "ui-store" }
  )
);


