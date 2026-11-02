import type {
  ConfiguratorSliceCreator,
  WizardAnswerMap,
  WizardAnswerValue,
  WizardSlice,
} from "../types";

export const createWizardSlice: ConfiguratorSliceCreator<WizardSlice> = (
  set,
) => ({
  wizardAnswers: {},

  updateDynamicState: (key: string, value: WizardAnswerValue) =>
    set((state) => ({
      wizardAnswers: {
        ...state.wizardAnswers,
        [key]: value,
      },
    })),

  setWizardAnswers: (answers: WizardAnswerMap) =>
    set(() => ({
      wizardAnswers: { ...answers },
    })),

  resetWizardState: () =>
    set(() => ({
      wizardAnswers: {},
    })),

  applyWizardToVisualizer: () =>
    set((state) => ({
      electricalPhase:
        state.wizardAnswers.electricalPhase === "3-Phase"
          ? "3-Phase"
          : "1-Phase",
    })),
});
