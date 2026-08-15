"use client";

import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "@/lib/motionTokens";

const orbs = [
  { x: "12%", y: "18%", size: 420, color: "rgba(56, 189, 248, 0.14)" },
  { x: "78%", y: "22%", size: 360, color: "rgba(251, 191, 36, 0.1)" },
  { x: "62%", y: "72%", size: 480, color: "rgba(255, 69, 0, 0.08)" },
  { x: "28%", y: "68%", size: 320, color: "rgba(167, 139, 250, 0.09)" },
];

export default function AmbientBackground() {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.04),_transparent_55%)]" />
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            background: orb.color,
            transform: "translate(-50%, -50%)",
          }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={
            reduce
              ? { opacity: 1, scale: 1 }
              : {
                  opacity: [0.55, 0.85, 0.55],
                  scale: [1, 1.08, 1],
                  x: [0, i % 2 === 0 ? 18 : -14, 0],
                  y: [0, i % 2 === 0 ? -12 : 16, 0],
                }
          }
          transition={{
            duration: 8 + i * 1.5,
            repeat: reduce ? 0 : Infinity,
            ease: motionTokens.easing.smooth,
            delay: i * 0.4,
          }}
        />
      ))}
    </div>
  );
}
