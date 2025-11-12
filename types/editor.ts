export type ClipSuggestion = {
  id: string;
  start: number;
  duration: number;
  label: string;
  effect: "cinematic" | "flash-cut" | "story-beat" | "slow-pan";
  confidence: number;
  transition: "cut" | "crossfade" | "glitch" | "zoom";
  paceTag: "calm" | "dynamic" | "aggressive";
};

export type ExportStatus = "idle" | "preparing" | "rendering" | "ready" | "error";

export type EditorClip = {
  id: string;
  start: number;
  end: number;
};

export type PlannerInsights = {
  energyScore: number;
  narrativeArc: "rise" | "burst" | "wave";
  soundtrackMood: "uplifting" | "driving" | "moody";
  keywords: string[];
};
