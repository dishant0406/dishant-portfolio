"use client";

import { Fragment, useRef } from "react";
import { motion, useInView, useReducedMotion, useSpring, type Variants } from "motion/react";
import { ModelCanvas } from "@/components/landing/model-canvas";
import { footerConfig } from "@/config/site";
import { MOTION_EASE } from "@/lib/motion";
import { CoffeeSticker } from "stick-it-up";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: MOTION_EASE },
  },
};
const earthVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.1, ease: MOTION_EASE },
  },
};
const parallaxSpring = { stiffness: 100, damping: 22, mass: 0.8 };
const wordVariants: Variants = {
  hidden: { opacity: 0, y: 6, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.65, ease: MOTION_EASE },
  },
};

export function FooterScene() {
  const reducedMotion = useReducedMotion();
  const earthStageRef = useRef<HTMLDivElement>(null);
  const earthMounted = useInView(earthStageRef, { once: true, margin: "400px" });
  const x = useSpring(0, parallaxSpring);
  const y = useSpring(0, parallaxSpring);
  const rotate = useSpring(0, parallaxSpring);

  const resetEarth = () => {
    x.set(0);
    y.set(0);
    rotate.set(0);
  };

  return (
    <footer
      data-footer-reveal=""
      className="relative w-full overflow-hidden bg-background"
    >
      <noscript>
        <style>{`[data-footer-reveal] [data-reveal] { opacity: 1 !important; transform: none !important; filter: none !important; }`}</style>
      </noscript>
      <motion.div
        className="relative z-10 mx-auto flex max-w-[var(--frame-max-w)] flex-col items-center px-6 pt-14 sm:pt-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5, margin: "0px 0px -120px 0px" }}
        variants={{ visible: { transition: { staggerChildren: 0.16 } } }}
      >
        <figure className="max-w-sm text-center">
          <motion.blockquote
            className="text-balance font-serif text-2xl italic leading-snug text-foreground"
            variants={{ visible: { transition: { staggerChildren: 0.075 } } }}
          >
            <p>
              <span className="sr-only">{footerConfig.quote}</span>
              <span aria-hidden="true">
                {footerConfig.quote.split(" ").map((word, index) => (
                  <Fragment key={`${word}-${index}`}>
                    {index > 0 && " "}
                    <motion.span
                      data-reveal=""
                      className="inline-block"
                      variants={wordVariants}
                    >
                      {word}
                    </motion.span>
                  </Fragment>
                ))}
              </span>
            </p>
          </motion.blockquote>
          <motion.figcaption
            data-reveal=""
            variants={itemVariants}
            className="mt-4 font-mono text-[10px] tracking-[0.12em] text-muted-foreground"
          >
            {footerConfig.attribution}
          </motion.figcaption>
        </figure>

        <motion.div
          data-reveal=""
          variants={itemVariants}
          className="mt-5 flex flex-col items-center gap-1 sm:flex-row sm:gap-6"
        >
          <p className="text-center font-mono text-[11px] leading-relaxed tracking-[0.06em] text-muted-foreground">
            {footerConfig.credit}
            <CoffeeSticker
              size="1.6em"
              className="ml-1.5 align-middle"
              aria-hidden="true"
              focusable="false"
            />
          </p>
        </motion.div>

        <motion.a
          data-reveal=""
          variants={itemVariants}
          href={footerConfig.iconCredit.href}
          target="_blank"
          rel="noopener noreferrer"
          className="micro-transition mt-2 font-mono text-[10px] tracking-[0.06em] text-muted-foreground/70 hover:text-foreground"
        >
          {footerConfig.iconCredit.text}
        </motion.a>

        <motion.a
          data-reveal=""
          variants={itemVariants}
          href={footerConfig.sceneryCredit.href}
          target="_blank"
          rel="noopener noreferrer"
          className="micro-transition mt-1 font-mono text-[10px] tracking-[0.06em] text-muted-foreground/70 hover:text-foreground"
        >
          {footerConfig.sceneryCredit.text}
        </motion.a>

        <motion.a
          data-reveal=""
          variants={itemVariants}
          href={footerConfig.earthCredit.href}
          target="_blank"
          rel="noopener noreferrer"
          className="micro-transition mt-1 font-mono text-[10px] tracking-[0.06em] text-muted-foreground/70 hover:text-foreground"
        >
          {footerConfig.earthCredit.text}
        </motion.a>
      </motion.div>

      <motion.div
        ref={earthStageRef}
        aria-hidden="true"
        data-reveal=""
        variants={earthVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1, margin: "0px 0px -80px 0px" }}
        onPointerMove={(event) => {
          if (reducedMotion || event.pointerType === "touch") return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
          const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
          x.set(horizontal * 16);
          y.set(vertical * 8);
          rotate.set(horizontal * 1.2);
        }}
        onPointerLeave={resetEarth}
        onPointerCancel={resetEarth}
        className="relative mt-2 h-56 select-none overflow-hidden sm:h-64"
      >
        <div className="relative left-1/2 h-full w-[calc(100%+24px)] min-w-180 -translate-x-1/2">
          <motion.div
            className="h-full origin-bottom"
            style={{
              x: reducedMotion ? 0 : x,
              y: reducedMotion ? 0 : y,
              rotate: reducedMotion ? 0 : rotate,
            }}
          >
            {earthMounted ? (
              <ModelCanvas
                url="/models/earth.glb"
                className="block h-full w-full"
                fov={32}
                cameraPosition={[0, 0.6, 9]}
                cameraTarget={[0, -0.9, 0]}
                modelScale={4.3}
                modelPosition={[0, -3.9, 0]}
                spinSpeed={0.12}
                playAnimations
                ambient={3.2}
                sun={{ color: 0xfff4e0, intensity: 2.6, position: [6, 12, 14] }}
              />
            ) : null}
          </motion.div>
        </div>
      </motion.div>
    </footer>
  );
}
