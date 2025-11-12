"use client";

import clsx from "clsx";
import type { ClipSuggestion } from "../types/editor";
import { formatSeconds } from "../lib/time";
import styles from "./TimelineSlider.module.css";

type Props = {
  duration: number;
  start: number;
  end: number;
  onChange: (cursor: { start: number; end: number }) => void;
  suggestions: ClipSuggestion[];
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const MAX_DURATION = 60;

export default function TimelineSlider({
  duration,
  start,
  end,
  onChange,
  suggestions
}: Props) {
  const safeDuration = Math.min(duration, MAX_DURATION || duration);

  return (
    <div className={styles.wrapper}>
      <div className={styles.heading}>
        <h3>Timeline</h3>
        <p>
          {formatSeconds(start)} → {formatSeconds(end)} ·{" "}
          {(end - start).toFixed(1)}s
        </p>
      </div>
      <div className={styles.sliderRow}>
        <input
          type="range"
          min={0}
          max={safeDuration}
          step={0.1}
          value={start}
          className={styles.slider}
          onChange={(event) => {
            const nextStart = Number(event.target.value);
            const clampedStart = Math.min(nextStart, end - 1);
            onChange({
              start: clamp(clampedStart, 0, safeDuration - 1),
              end
            });
          }}
        />
        <input
          type="range"
          min={0}
          max={safeDuration}
          step={0.1}
          value={end}
          className={styles.slider}
          onChange={(event) => {
            const nextEnd = Number(event.target.value);
            const clampedEnd = Math.max(nextEnd, start + 1);
            onChange({
              start,
              end: clamp(clampedEnd, start + 1, safeDuration)
            });
          }}
        />
        <div className={styles.track}>
          <div
            className={styles.selection}
            style={{
              left: `${(start / safeDuration) * 100}%`,
              width: `${((end - start) / safeDuration) * 100}%`
            }}
          />
          {suggestions.map((clip) => (
            <button
              key={clip.id}
              type="button"
              className={clsx(styles.marker, styles[clip.effect])}
              style={{
                left: `${(clip.start / safeDuration) * 100}%`,
                width: `${(clip.duration / safeDuration) * 100}%`
              }}
              title={`${clip.label} · ${clip.effect}`}
              onClick={() =>
                onChange({
                  start: clip.start,
                  end: clamp(clip.start + clip.duration, clip.start + 1, safeDuration)
                })
              }
            >
              <span>{clip.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
