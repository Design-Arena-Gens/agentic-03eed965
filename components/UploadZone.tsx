"use client";

import { useCallback, useRef, useState } from "react";
import styles from "./UploadZone.module.css";

type Props = {
  onUpload: (file: File) => void;
  disabled?: boolean;
  videoName?: string;
  duration?: number;
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
};

export default function UploadZone({
  onUpload,
  disabled,
  videoName,
  duration
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (files: FileList | null) => {
      if (!files?.[0]) return;
      onUpload(files[0]);
    },
    [onUpload]
  );

  return (
    <div
      className={`${styles.zone} ${
        isDragging ? styles.dragging : ""
      } gradient-border`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (disabled) return;
        setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (disabled) return;
        setDragging(false);
        handleFile(event.dataTransfer.files);
      }}
    >
      <div className={styles.inner}>
        <div className={styles.icon}>🎬</div>
        <p className={styles.title}>Drop footage or browse</p>
        <p className={styles.helper}>
          MP4, MOV, or WebM · Recommended under 500&nbsp;MB
        </p>
        <button
          type="button"
          disabled={disabled}
          className={styles.button}
          onClick={() => inputRef.current?.click()}
        >
          Choose File
        </button>
        <input
          ref={inputRef}
          className={styles.input}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={(event) => handleFile(event.target.files)}
          disabled={disabled}
        />
        {videoName && (
          <div className={styles.summary}>
            <span>{videoName}</span>
            {typeof duration === "number" && (
              <span>{duration.toFixed(1)}s runtime</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
