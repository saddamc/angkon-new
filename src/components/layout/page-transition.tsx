"use client";

import { motion } from "framer-motion";
import type { PropsWithChildren } from "react";

export function PageTransition({ children }: PropsWithChildren) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative"
      style={{ position: "relative" }}
    >
      {children}
    </motion.div>
  );
}
