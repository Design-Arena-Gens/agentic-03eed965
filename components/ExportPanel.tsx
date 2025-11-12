"use client";

import type { ExportStatus } from "../types/editor";
import styles from "./ExportPanel.module.css";

type Props = {
  disabled: boolean;
  status: ExportStatus;
  onRender: () => void;
  downloadUrl?: string;
  clipLength: number;
  error?: string;
};

export default function ExportPanel({
  disabled,
  status,
  onRender,
  downloadUrl,
  clipLength,
  error
}: Props) {
  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <h3>Render Output</h3>
        <p>
          PulseCut compiles a 60s MP4 optimized for social. Export includes smart
          trimming and timeline pacing baked in.
        </p>
      </header>
      <div className={styles.meta}>
        <div>
          <span>Clip Length</span>
          <strong>{clipLength.toFixed(1)} seconds</strong>
        </div>
        <div>
          <span>Status</span>
          <strong className={styles[status]}>
            {status === "idle" && "Idle"}
            {status === "preparing" && "Preparing files…"}
            {status === "rendering" && "Encoding…"}
            {status === "ready" && "Ready"}
            {status === "error" && "Error"}
          </strong>
        </div>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          onClick={onRender}
          disabled={disabled || status === "rendering" || status === "preparing"}
        >
          {status === "rendering" || status === "preparing"
            ? "Rendering…"
            : "Render 60s Cut"}
        </button>
        {downloadUrl && status === "ready" && (
          <a href={downloadUrl} download="pulsecut-60s.mp4">
            Download MP4
          </a>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
