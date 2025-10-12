import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import advancedSchema from '../../advanced-controls.schema.json';

export interface AdvancedControl {
  section: string;
  id: string;
  label: string;
  type: 'slider' | 'switch' | 'select' | 'textarea' | 'text' | 'number' | 'multiselect';
  min?: number;
  max?: number;
  step?: number;
  default: any;
  options?: Array<{ value: string; label: string }>;
  help?: string;
  dependsOn?: string | null;
}

interface AdvancedState {
  enabled: boolean;
  values: Record<string, any>;
  presets: Record<string, Record<string, any>>;
  panelWidth: number;
  toggleEnabled: () => void;
  setValue: (id: string, value: any) => void;
  resetToDefaults: () => void;
  savePreset: (name: string) => void;
  loadPreset: (name: string) => void;
  deletePreset: (name: string) => void;
  setPanelWidth: (width: number) => void;
}

const getDefaultValues = (): Record<string, any> => {
  const defaults: Record<string, any> = {};
  (advancedSchema as AdvancedControl[]).forEach((control) => {
    defaults[control.id] = control.default;
  });
  return defaults;
};

export const useAdvancedStore = create<AdvancedState>()(
  persist(
    (set, get) => ({
      enabled: false,
      values: getDefaultValues(),
      presets: {
        'Creative': {
          temperature: 1.2,
          topP: 0.95,
          frequencyPenalty: 0.5,
          presencePenalty: 0.5,
        },
        'Precise': {
          temperature: 0.3,
          topP: 0.8,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        'Balanced': getDefaultValues(),
      },
      panelWidth: 380,
      
      toggleEnabled: () => set((state) => ({ enabled: !state.enabled })),
      
      setValue: (id: string, value: any) =>
        set((state) => ({
          values: { ...state.values, [id]: value },
        })),
      
      resetToDefaults: () => set({ values: getDefaultValues() }),
      
      savePreset: (name: string) =>
        set((state) => ({
          presets: { ...state.presets, [name]: { ...state.values } },
        })),
      
      loadPreset: (name: string) =>
        set((state) => ({
          values: { ...state.presets[name] },
        })),
      
      deletePreset: (name: string) =>
        set((state) => {
          const { [name]: _, ...rest } = state.presets;
          return { presets: rest };
        }),
      
      setPanelWidth: (width: number) => set({ panelWidth: width }),
    }),
    {
      name: 'chat.advanced',
    }
  )
);
