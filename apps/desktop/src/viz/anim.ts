//! Shared Framer Motion variants for the card renderers. Animation is used to
//! CLARIFY (top-down reveal, sequential steps, spring-in emphasis) — not decorate.

import type { Variants } from "framer-motion";

/** Card root: stagger children top-down. */
export const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

/** A block/row: fade + small slide up. */
export const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
};

/** Emphasis element (chips, option cards): spring in. */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 320, damping: 22 } },
};
