"use client";

import { ModelCanvas } from "./model-canvas";
import styles from "./profile-banner.module.css";

// "landscape forest & mountains" by dasy444 (CC BY 4.0). The camera sits inside
// the model's sky dome, low, so the grass and trees show under the sky.
export function ProfileBanner() {
  return (
    <div className="relative">
      <div
        className={styles.waveStage}
        role="img"
        aria-label="A 3D landscape of grass hills, a pine forest and snowy mountains at sunset"
      >
        <ModelCanvas
          url="/models/scenery.glb"
          className={styles.waveCanvas}
          cameraPosition={[0, 3, 14]}
          cameraTarget={[0, 9, -30]}
          swayAngle={0.1}
        />
      </div>
    </div>
  );
}
