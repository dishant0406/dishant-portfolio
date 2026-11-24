"use client";

import { HeroFluidDither } from "./hero-fluid-dither";
import styles from "./profile-banner.module.css";

export function ProfileBanner() {
  return (
    <div className="relative">
      <div
        className={styles.waveStage}
        role="img"
        aria-label="Animated fluid dithered wave header"
      >
        <HeroFluidDither className={styles.waveCanvas} />
      </div>
    </div>
  );
}
