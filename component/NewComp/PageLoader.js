"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STAGES = [
  { label: "Getting the data", duration: 1200 },
  { label: "Arranging it", duration: 1200 },
  { label: "Finishing up", duration: 900 },
];

export default function PageLoader({ children }) {
  const [stage, setStage] = useState(0);
  const done = stage >= STAGES.length;

  // Advance through stages
  useEffect(() => {
    if (done) return;

    const timer = setTimeout(() => {
      setStage((s) => s + 1);
    }, STAGES[stage].duration);

    return () => clearTimeout(timer);
  }, [stage, done]);

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-white">
      <AnimatePresence>
        {!done && (
          <motion.div
            key="loader"
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 bg-white text-black"
            initial={{ opacity: 1, scale: 1 }}
            exit={{
              scale: 1.8,
              opacity: 0,
              transition: {
                duration: 0.9,
                ease: [0.76, 0, 0.24, 1],
              },
            }}
          >
            {/* Spinner */}
            <div className="relative h-20 w-20">
              {/* Static track */}
              <div className="absolute inset-0 rounded-full border-4 border-black/10" />

              {/* Fast spinning arc */}
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-black"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />

              {/* Slow reverse inner arc */}
              <motion.div
                className="absolute inset-3 rounded-full border-4 border-transparent border-b-black/40"
                animate={{ rotate: -360 }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </div>

            {/* Stage label */}
            <div className="h-8 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={stage}
                  className="text-xl font-medium tracking-wide text-black"
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -24, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {STAGES[Math.min(stage, STAGES.length - 1)].label}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Segmented progress bar */}
            <div className="flex w-64 gap-2">
              {STAGES.map((s, i) => (
                <div
                  key={s.label}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-black/10"
                >
                  <motion.div
                    className="h-full bg-black"
                    initial={{ width: "0%" }}
                    animate={{
                      width: i <= stage ? "100%" : "0%",
                    }}
                    transition={{
                      duration: i === stage ? s.duration / 1000 : 0.2,
                      ease: "linear",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Progress count */}
            <p className="text-sm text-black/50">
              {Math.min(stage + 1, STAGES.length)} / {STAGES.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page content */}
      <motion.div
        initial={{ scale: 1.08 }}
        animate={{ scale: done ? 1 : 1.08 }}
        transition={{
          duration: 0.9,
          ease: [0.76, 0, 0.24, 1],
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}