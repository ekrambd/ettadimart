import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';

export interface BentoCardProps {
  className?: string;
  children: React.ReactNode;
  borderBeamColor?: string;
}

/**
 * Single Bento Card with:
 * - 3D perspective tilt (max 8 deg) based on cursor position
 * - Continuous SVG border beam on hover
 * - GPU-accelerated transform & opacity
 */
export const BentoCard: React.FC<BentoCardProps> = ({
  className = '',
  children,
  borderBeamColor = '#F37022'
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Max 8 degrees subtle 3D tilt
    const rotX = -((y - centerY) / centerY) * 8;
    const rotY = ((x - centerX) / centerX) * 8;

    setRotateX(rotX);
    setRotateY(rotY);
  }, []);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX,
        rotateY,
        scale: isHovered ? 1.01 : 1
      }}
      transition={{
        type: 'spring',
        stiffness: 250,
        damping: 20
      }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000
      }}
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            type: 'spring',
            stiffness: 140,
            damping: 18
          }
        }
      }}
      className={`relative rounded-[6px] border border-slate-200/90 bg-white p-6 shadow-xs overflow-hidden transition-colors hover:border-slate-300 ${className}`}
    >
      {/* SVG Border Beam Animation */}
      {isHovered && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full rounded-[6px]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="1"
            y="1"
            width="calc(100% - 2px)"
            height="calc(100% - 2px)"
            rx="6"
            fill="none"
            stroke={borderBeamColor}
            strokeWidth="2"
            strokeDasharray="90 320"
            className="animate-border-beam"
          />
        </svg>
      )}

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between">
        {children}
      </div>
    </motion.div>
  );
};

export interface BentoGridProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Modern Apple-style Asymmetrical Bento Grid
 * Grid structure: 4 asymmetrical cards (2x2 hero, two 1x1 stat, 2x1 wide)
 * Upward spring staggerChildren: 0.08s
 */
export const BentoGrid: React.FC<BentoGridProps> = ({ children, className = '' }) => {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08
          }
        }
      }}
      className={`grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[220px] ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default BentoGrid;
