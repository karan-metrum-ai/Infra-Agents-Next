"use client";

import { Children, cloneElement, isValidElement, useState, type ReactElement } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import styles from "./NavHoverEffect.module.css";
import type { NavHoverEffectProps } from "./NavHoverEffect.types";

/**
 * Adds a smooth hover background effect to navigation items. Wraps
 * navigation buttons/links and provides an animated background that
 * follows the hovered item.
 */
export function NavHoverEffect({
  children,
  className = "",
  activeIndex = -1,
}: NavHoverEffectProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const childArray = Children.toArray(children).filter(isValidElement);

  return (
    <div className={cn(styles.navContainer, className)}>
      {childArray.map((child, idx) => {
        const showHoverBg = hoveredIndex === idx && idx !== activeIndex;
        const typedChild = child as ReactElement<{ className?: string }>;

        return (
          <div
            key={typedChild.key ?? idx}
            className={styles.navItemWrapper}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <AnimatePresence>
              {showHoverBg && (
                <motion.span
                  className={styles.hoverBackground}
                  layoutId="navHoverBackground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.15 } }}
                  exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
                />
              )}
            </AnimatePresence>
            {cloneElement(typedChild, {
              className: cn(typedChild.props.className, styles.navItem),
            })}
          </div>
        );
      })}
    </div>
  );
}
