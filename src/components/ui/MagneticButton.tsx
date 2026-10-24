import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useSpring, useMotionValue } from 'motion/react';

export interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  magneticRadius?: number; // Distance in px to trigger magnetic pull (default: 50)
  glowColor?: string; // e.g. "rgba(244, 63, 94, 0.4)"
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Interactive Cursor Magnetic Button (Framer Motion + React)
 * Physics:
 * - Spring: stiffness: 150, damping: 15, mass: 0.1
 * - Inner label: Shifts independently at 1.5x button translation speed for optical depth
 * - Glow effect: Radial gradient border highlight that tracks (x, y) coordinates
 * - 60-120fps smooth performance via MotionValues and Springs (zero re-render stutter)
 */
export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  magneticRadius = 50,
  glowColor = 'rgba(243, 112, 34, 0.35)',
  className = '',
  onClick,
  ...props
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for button position
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Motion values for mouse coordinates across surface (for glow)
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);

  // Spring physics: stiffness: 150, damping: 15, mass: 0.1
  const springConfig = { stiffness: 150, damping: 15, mass: 0.1 };
  const btnX = useSpring(mouseX, springConfig);
  const btnY = useSpring(mouseY, springConfig);

  // Inner text shifts independently at 1.5x button translation speed for optical 3D parallax
  const textX = useSpring(useMotionValue(0), springConfig);
  const textY = useSpring(useMotionValue(0), springConfig);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      const threshold = rect.width / 2 + magneticRadius;

      if (dist < threshold) {
        setIsHovered(true);
        // Pull button towards cursor
        const pullX = (e.clientX - centerX) * 0.35;
        const pullY = (e.clientY - centerY) * 0.35;
        mouseX.set(pullX);
        mouseY.set(pullY);

        // 1.5x optical depth shift for inner content
        textX.set(pullX * 1.5);
        textY.set(pullY * 1.5);

        // Surface coordinates for dynamic radial glow
        glowX.set(e.clientX - rect.left);
        glowY.set(e.clientY - rect.top);
      } else if (isHovered) {
        // Snap back cleanly when cursor leaves radius
        setIsHovered(false);
        mouseX.set(0);
        mouseY.set(0);
        textX.set(0);
        textY.set(0);
      }
    },
    [magneticRadius, isHovered, mouseX, mouseY, textX, textY, glowX, glowY]
  );

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
    textX.set(0);
    textY.set(0);
  }, [mouseX, mouseY, textX, textY]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  return (
    <motion.button
      ref={btnRef}
      style={{ x: btnX, y: btnY }}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-[6px] cursor-pointer select-none ${className}`}
      {...(props as any)}
    >
      {/* Dynamic Cursor Radial Glow Highlight */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 80px at ${glowX.get()}px ${glowY.get()}px, ${glowColor}, transparent 70%)`
        }}
      />

      {/* Optical Parallax Inner Text (1.5x displacement) */}
      <motion.span
        style={{ x: textX, y: textY }}
        className="relative z-10 inline-flex items-center justify-center gap-2 pointer-events-none"
      >
        {children}
      </motion.span>
    </motion.button>
  );
};

export default MagneticButton;
