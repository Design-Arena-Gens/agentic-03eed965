"use client";

import type { ClipSuggestion, PlannerInsights } from "../types/editor";
import styles from "./AiPlanPanel.module.css";

type Props = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  loading: boolean;
  plan: ClipSuggestion[];
  insights?: PlannerInsights;
  disabled?: boolean;
};

export default function AiPlanPanel({
  prompt,
  onPromptChange,
  onGenerate,
  loading,
  plan,
  insights,
  disabled
}: Props) {
  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div>
          <h3>AI Cut Designer</h3>
          <p>
            Describe the vibe. The model shapes pacing, selects highlights, and
            recommends transitions tuned for a 60-second story.
          </p>
        </div>
        <button
          type="button"
          className={styles.generateBtn}
          onClick={onGenerate}
          disabled={loading || disabled || !prompt.trim()}
        >
          {loading ? "Analyzing..." : "Generate Plan"}
        </button>
      </header>

      <textarea
        className={styles.prompt}
        placeholder="Example: high-energy travel montage with fast cuts, neon overlays, and powerful bass drop"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        rows={3}
        disabled={loading || disabled}
      />

      {insights && (
        <div className={styles.insights}>
          <div>
            <span>Energy</span>
            <strong>{Math.round(insights.energyScore * 100)}%</strong>
          </div>
          <div>
            <span>Narrative Arc</span>
            <strong>{insights.narrativeArc}</strong>
          </div>
          <div>
            <span>Soundtrack Mood</span>
            <strong>{insights.soundtrackMood}</strong>
          </div>
          <div>
            <span>AI Keywords</span>
            <strong>{insights.keywords.join(", ") || "auto-inferred"}</strong>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {plan.map((clip) => (
          <div key={clip.id} className={styles.card}>
            <header>
              <span>{clip.label}</span>
              <strong>{clip.duration.toFixed(1)}s</strong>
            </header>
            <ul>
              <li>
                Start at <strong>{clip.start.toFixed(1)}s</strong>
              </li>
              <li>
                Effect <strong>{clip.effect}</strong>
              </li>
              <li>
                Transition <strong>{clip.transition}</strong>
              </li>
              <li>
                Pace <strong>{clip.paceTag}</strong>
              </li>
            </ul>
            <footer>
              Confidence&nbsp;
              <strong>{Math.round(clip.confidence * 100)}%</strong>
            </footer>
          </div>
        ))}
        {!plan.length && (
          <div className={styles.placeholder}>
            <p>
              Feed the model a creative direction to generate a pacing blueprint
              for your one-minute cut.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
