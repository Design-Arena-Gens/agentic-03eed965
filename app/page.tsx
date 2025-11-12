"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import styles from "./page.module.css";

const VideoEditor = dynamic(() => import("../components/VideoEditor"), {
  ssr: false,
  loading: () => (
    <div className={styles.loadingShell}>
      <div className={styles.spinner} />
      <p>Booting the creative engine…</p>
    </div>
  )
});

export default function Home() {
  const stats = useMemo(
    () => [
      { label: "Optimized Cuts", value: "AI pacing graph" },
      { label: "Max Duration", value: "60s render" },
      { label: "Workflow Speedup", value: "x4 faster edits" }
    ],
    []
  );

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.badge}>PulseCut Studio · AI-driven 60s editor</div>
        <h1>
          Craft scroll-stopping <span>one-minute stories</span> with AI-assisted
          precision.
        </h1>
        <p className={styles.subtitle}>
          Upload raw footage, describe the vibe, and PulseCut sculpts a punchy
          60-second edit with smart cuts, adaptive pacing, and cinematic polish.
        </p>
        <div className={styles.statsRow}>
          {stats.map((stat) => (
            <div className={styles.stat} key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>
      <section className={styles.editorShell}>
        <VideoEditor />
      </section>
    </main>
  );
}
