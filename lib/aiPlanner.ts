import type { ClipSuggestion, PlannerInsights } from "../types/editor";

const KEYWORD_MATRIX: Record<
  string,
  {
    energy: number;
    mood: PlannerInsights["soundtrackMood"];
    narrative: PlannerInsights["narrativeArc"];
  }
> = {
  adrenaline: { energy: 0.92, mood: "driving", narrative: "burst" },
  upbeat: { energy: 0.8, mood: "uplifting", narrative: "rise" },
  cinematic: { energy: 0.65, mood: "moody", narrative: "wave" },
  chill: { energy: 0.35, mood: "moody", narrative: "wave" },
  product: { energy: 0.58, mood: "uplifting", narrative: "rise" },
  travel: { energy: 0.66, mood: "uplifting", narrative: "wave" },
  dance: { energy: 0.88, mood: "driving", narrative: "burst" },
  vlog: { energy: 0.54, mood: "uplifting", narrative: "rise" },
  tutorial: { energy: 0.42, mood: "moody", narrative: "rise" },
  dramatic: { energy: 0.72, mood: "moody", narrative: "wave" }
};

const EFFECTS: ClipSuggestion["effect"][] = [
  "cinematic",
  "flash-cut",
  "story-beat",
  "slow-pan"
];

const TRANSITIONS: ClipSuggestion["transition"][] = [
  "cut",
  "crossfade",
  "glitch",
  "zoom"
];

const PACE_TAGS: ClipSuggestion["paceTag"][] = [
  "calm",
  "dynamic",
  "aggressive"
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const createSeed = (input: string) => {
  let hash = 0;
  const normalized = input.trim().toLowerCase();
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 1;
};

const seededRandom = (seed: number) => {
  const modulus = 233280;
  const multiplier = 9301;
  const increment = 49297;
  return () => {
    seed = (seed * multiplier + increment) % modulus;
    return seed / modulus;
  };
};

const analyzePrompt = (prompt: string): PlannerInsights => {
  const words = prompt
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);

  if (!words.length) {
    return {
      energyScore: 0.55,
      narrativeArc: "rise",
      soundtrackMood: "uplifting",
      keywords: []
    };
  }

  const matched = words
    .map((word) => ({ word, data: KEYWORD_MATRIX[word] }))
    .filter((entry) => Boolean(entry.data));

  const energy =
    matched.reduce((sum, entry) => sum + (entry.data?.energy ?? 0), 0) /
      matched.length || 0.58;

  const narrativeVotes = matched.map(
    (entry) => entry.data?.narrative ?? "rise"
  );
  const soundtrackVotes = matched.map(
    (entry) => entry.data?.mood ?? "uplifting"
  );

  const pickMostCommon = <T extends string>(values: T[], fallback: T) => {
    if (!values.length) return fallback;
    const tally = values.reduce<Record<string, number>>((acc, value) => {
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
    return (Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0] as T) ?? fallback;
  };

  return {
    energyScore: clamp(energy, 0.25, 0.95),
    narrativeArc: pickMostCommon(narrativeVotes, "rise"),
    soundtrackMood: pickMostCommon(soundtrackVotes, "uplifting"),
    keywords: matched.map((entry) => entry.word)
  };
};

export type PlanResult = {
  clips: ClipSuggestion[];
  insights: PlannerInsights;
};

export const generateTimelinePlan = (
  prompt: string,
  sourceDuration: number
): PlanResult => {
  const safeDuration = clamp(sourceDuration, 5, 60);
  const insights = analyzePrompt(prompt);
  const seed = createSeed(prompt || "default-seed");
  const random = seededRandom(seed);

  const clipCount = clamp(Math.round(insights.energyScore * 4.5), 3, 6);
  const baseline = safeDuration / clipCount;

  const clips: ClipSuggestion[] = [];
  let cursor = 0;

  for (let i = 0; i < clipCount; i += 1) {
    const variance = (random() - 0.5) * 0.25;
    const duration = clamp(baseline * (1 + variance), 5, safeDuration / 2);
    const effect =
      EFFECTS[Math.floor(random() * EFFECTS.length)] ?? "cinematic";
    const transition =
      TRANSITIONS[Math.floor(random() * TRANSITIONS.length)] ?? "cut";
    const pace =
      PACE_TAGS[
        Math.floor(
          clamp(insights.energyScore * PACE_TAGS.length, 0, PACE_TAGS.length - 1)
        )
      ] ?? "dynamic";

    clips.push({
      id: `clip-${i}`,
      start: Number(cursor.toFixed(2)),
      duration: Number(Math.min(duration, safeDuration - cursor).toFixed(2)),
      label: `Beat ${i + 1}`,
      effect,
      transition,
      paceTag: pace,
      confidence: Number(clamp(0.55 + random() * 0.35, 0.55, 0.94).toFixed(2))
    });

    cursor += duration;
    if (cursor >= safeDuration - 4) {
      break;
    }
  }

  // normalize final durations to avoid overshooting the 60-second bound
  const total = clips.reduce((sum, clip) => sum + clip.duration, 0);
  const scale = total > safeDuration ? safeDuration / total : 1;

  const normalizedClips = clips.map((clip, index) => ({
    ...clip,
    start: Number(
      clips
        .slice(0, index)
        .reduce((sum, current) => sum + current.duration, 0)
        .toFixed(2)
    ),
    duration: Number((clip.duration * scale).toFixed(2))
  }));

  return {
    clips: normalizedClips,
    insights
  };
};
