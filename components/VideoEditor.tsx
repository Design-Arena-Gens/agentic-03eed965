"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import UploadZone from "./UploadZone";
import TimelineSlider from "./TimelineSlider";
import AiPlanPanel from "./AiPlanPanel";
import ExportPanel from "./ExportPanel";
import { generateTimelinePlan } from "../lib/aiPlanner";
import { formatSeconds } from "../lib/time";
import type { ClipSuggestion, ExportStatus, PlannerInsights } from "../types/editor";
import styles from "./VideoEditor.module.css";

type VideoMetadata = {
  duration: number;
  width: number;
  height: number;
};

const MAX_MINUTE = 60;

type FFmpegInstance = {
  load: (config?: unknown) => Promise<unknown>;
  writeFile: (path: string, data: Uint8Array | string) => Promise<unknown>;
  readFile: (path: string) => Promise<Uint8Array>;
  deleteFile: (path: string) => Promise<unknown>;
  exec: (command: string[]) => Promise<number>;
};

const useFFmpeg = () => {
  const ffmpegRef = useRef<FFmpegInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const instance = new FFmpeg();
      await instance.load({
        coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
        wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm",
        workerURL:
          "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.worker.js"
      });
      ffmpegRef.current = instance as FFmpegInstance;
      setReady(true);
      return instance as FFmpegInstance;
    } catch (err) {
      console.error(err);
      setError("FFmpeg failed to load. Try reloading the page.");
      throw err;
    }
  }, []);

  return { load, ready, error };
};

export default function VideoEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [prompt, setPrompt] = useState(
    "kinetic product teaser with fast punchy cuts, neon glow accents, and bass-driven soundtrack"
  );
  const [trim, setTrim] = useState<{ start: number; end: number }>({
    start: 0,
    end: 60
  });
  const [plan, setPlan] = useState<ClipSuggestion[]>([]);
  const [insights, setInsights] = useState<PlannerInsights | undefined>();
  const [planLoading, setPlanLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportError, setExportError] = useState<string | undefined>();
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { load: loadFFmpeg, ready: ffmpegReady, error: ffmpegError } = useFFmpeg();

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [videoUrl, downloadUrl]);

  const handleFile = useCallback(async (nextFile: File) => {
    setFile(nextFile);
    setPlan([]);
    setInsights(undefined);
    setExportStatus("idle");
    setExportError(undefined);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(undefined);
    }
    const objectUrl = URL.createObjectURL(nextFile);
    setVideoUrl(objectUrl);

    const probeVideo = document.createElement("video");
    probeVideo.preload = "metadata";
    probeVideo.src = objectUrl;
    probeVideo.onloadedmetadata = () => {
      const duration = probeVideo.duration;
      setMetadata({
        duration,
        width: probeVideo.videoWidth,
        height: probeVideo.videoHeight
      });
      const bounded = Math.min(duration, MAX_MINUTE);
      setTrim({
        start: 0,
        end: Number(bounded.toFixed(2))
      });
      probeVideo.remove();
    };
  }, [downloadUrl]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.onloadedmetadata = () => {
      if (!videoRef.current) return;
      videoRef.current.currentTime = trim.start;
    };
  }, [trim.start]);

  const onGeneratePlan = useCallback(() => {
    if (!metadata) return;
    setPlanLoading(true);
    try {
      const result = generateTimelinePlan(prompt, Math.min(metadata.duration, MAX_MINUTE));
      setPlan(result.clips);
      setInsights(result.insights);
      if (result.clips[0]) {
        const first = result.clips[0];
        setTrim({
          start: first.start,
          end: Math.min(first.start + first.duration, first.start + MAX_MINUTE, metadata.duration)
        });
      }
    } finally {
      setPlanLoading(false);
    }
  }, [metadata, prompt]);

  const onRender = useCallback(async () => {
    if (!file || !metadata) return;
    setExportError(undefined);
    setExportStatus("preparing");
    try {
      const ffmpeg = await loadFFmpeg();
      setExportStatus("rendering");
      const { fetchFile } = await import("@ffmpeg/util");
      const inputData = await fetchFile(file);
      await ffmpeg.writeFile("input.mp4", inputData);
      const safeStart = Math.max(0, trim.start);
      const safeDuration = Math.min(trim.end - trim.start, MAX_MINUTE);
      const args = [
        "-i",
        "input.mp4",
        "-ss",
        safeStart.toFixed(2),
        "-t",
        safeDuration.toFixed(2),
        "-vf",
        "scale='min(1080,iw)':-2,format=yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "faststart",
        "output.mp4"
      ];
      const exitCode = await ffmpeg.exec(args);
      if (exitCode !== 0) {
        throw new Error(`FFmpeg exited with code ${exitCode}`);
      }
      const data = await ffmpeg.readFile("output.mp4");
      const buffer = data.buffer as ArrayBuffer;
      const sliced = buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      );
      const blob = new Blob([sliced], { type: "video/mp4" });
      try {
        await ffmpeg.deleteFile("input.mp4");
        await ffmpeg.deleteFile("output.mp4");
      } catch {
        // best effort cleanup inside WASM FS
      }
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setExportStatus("ready");
    } catch (error) {
      console.error(error);
      setExportStatus("error");
      setExportError(
        "Rendering failed. Try reducing file size or reloading the editor."
      );
    }
  }, [downloadUrl, file, loadFFmpeg, metadata, trim.end, trim.start]);

  const heading = useMemo(() => {
    if (!metadata) {
      return "Upload a clip to kickstart the AI-assisted cut.";
    }
    return `Source: ${formatSeconds(metadata.duration)} · ${metadata.width}×${metadata.height}px`;
  }, [metadata]);

  useEffect(() => {
    if (!metadata) return;
    loadFFmpeg().catch(() => {
      // handled inside hook
    });
  }, [loadFFmpeg, metadata]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        <div className={styles.leftColumn}>
          <div className={styles.panel}>
            <header>
              <h2>Cut Workspace</h2>
              <p>{heading}</p>
            </header>
            <UploadZone
              onUpload={handleFile}
              disabled={planLoading}
              videoName={file?.name}
              duration={metadata?.duration}
            />
            {videoUrl && (
              <div className={styles.previewShell}>
                <video
                  ref={videoRef}
                  key={videoUrl}
                  src={videoUrl}
                  controls
                  className={styles.video}
                />
              </div>
            )}
          </div>
          {metadata && (
            <TimelineSlider
              duration={metadata.duration}
              start={trim.start}
              end={trim.end}
              onChange={(next) => {
                const clampedStart = Math.max(0, Math.min(next.start, metadata.duration - 1));
                const maxEnd = Math.min(metadata.duration, clampedStart + MAX_MINUTE);
                const clampedEnd = Math.min(
                  maxEnd,
                  Math.max(next.end, clampedStart + 1)
                );
                setTrim({
                  start: Number(clampedStart.toFixed(2)),
                  end: Number(clampedEnd.toFixed(2))
                });
                if (videoRef.current) {
                  videoRef.current.currentTime = clampedStart;
                }
              }}
              suggestions={plan}
            />
          )}
          <ExportPanel
            disabled={!file || !ffmpegReady || !metadata}
            status={ffmpegError ? "error" : exportStatus}
            onRender={onRender}
            downloadUrl={downloadUrl}
            clipLength={Math.max(0, trim.end - trim.start)}
            error={exportError || ffmpegError}
          />
        </div>
        <div className={styles.rightColumn}>
          <AiPlanPanel
            prompt={prompt}
            onPromptChange={setPrompt}
            onGenerate={onGeneratePlan}
            loading={planLoading}
            plan={plan}
            insights={insights}
            disabled={!metadata}
          />
          <div className={styles.notes}>
            <h4>Workflow Tips</h4>
            <ul>
              <li>Trim handles enforce the 60s cap for social-friendly exports.</li>
              <li>
                Regenerate the AI plan to explore alternate pacing and shot grouping.
              </li>
              <li>
                Rendered files are optimized with H.264 video and AAC audio for broad
                device support.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
