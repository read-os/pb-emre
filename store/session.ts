import { create } from "zustand";
import { Frame } from "@/lib/frames";

type SessionStatus = "idle" | "waiting" | "countdown" | "capturing" | "processing" | "done";

interface SessionStore {
  // Session
  sessionId: string | null;
  status: SessionStatus;
  connectedPhones: number;

  // Photos
  photos: string[];
  currentPhotoIndex: number;
  stripData: string | null;

  // Frame
  selectedFrame: Frame | null;

  // UI
  countdownValue: number | null;
  showFlash: boolean;
  skzUnlocked: boolean;

  // Actions
  setSessionId: (id: string) => void;
  setStatus: (status: SessionStatus) => void;
  setConnectedPhones: (count: number) => void;
  addPhoto: (photo: string, index: number) => void;
  setStripData: (data: string) => void;
  setSelectedFrame: (frame: Frame | null) => void;
  setCountdownValue: (val: number | null) => void;
  setShowFlash: (show: boolean) => void;
  setSkzUnlocked: (unlocked: boolean) => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  status: "idle",
  connectedPhones: 0,
  photos: [],
  currentPhotoIndex: 0,
  stripData: null,
  selectedFrame: null,
  countdownValue: null,
  showFlash: false,
  skzUnlocked: false,

  setSessionId: (id) => set({ sessionId: id }),
  setStatus: (status) => set({ status }),
  setConnectedPhones: (count) => set({ connectedPhones: count }),
  addPhoto: (photo, index) =>
    set((state) => {
      const photos = [...state.photos];
      photos[index] = photo;
      return { photos, currentPhotoIndex: index + 1 };
    }),
  setStripData: (data) => set({ stripData: data }),
  setSelectedFrame: (frame) => set({ selectedFrame: frame }),
  setCountdownValue: (val) => set({ countdownValue: val }),
  setShowFlash: (show) => set({ showFlash: show }),
  setSkzUnlocked: (unlocked) => set({ skzUnlocked: unlocked }),
  resetSession: () =>
    set({
      photos: [],
      currentPhotoIndex: 0,
      stripData: null,
      status: "waiting",
      countdownValue: null,
      showFlash: false,
    }),
}));
