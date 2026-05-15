"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface HeroTextSliderProps {
  texts: string[];
  locale?: string;
}

const swipeConfidenceThreshold = 1000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export function HeroTextSlider({ texts, locale }: HeroTextSliderProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isActive, setIsActive] =   useState(true);

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      paginate(1);
    }, 4000);
    return () => clearInterval(timer);
  }, [index, isActive, texts.length]);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setIndex((prevIndex) => (prevIndex + newDirection + texts.length) % texts.length);
  };

  /**
   * GONIA SEMANTIC VARIABLE MAPPING
   * Using variables defined in profiles.css/classic.css
   */
  const gradients = [
    "linear-gradient(90deg, var(--gonia-primary), var(--gonia-accent), var(--gonia-primary))",
    "linear-gradient(90deg, var(--gonia-secondary), var(--gonia-primary), var(--gonia-secondary))",
    "linear-gradient(90deg, var(--gonia-primary), var(--gonia-secondary), var(--gonia-primary))",
    "linear-gradient(90deg, var(--gonia-accent), var(--gonia-primary), var(--gonia-accent))",
    "linear-gradient(90deg, var(--gonia-accent), var(--gonia-secondary), var(--gonia-accent))",
    "linear-gradient(90deg, var(--gonia-secondary), var(--gonia-accent), var(--gonia-secondary))",
    "linear-gradient(90deg, var(--gonia-primary), var(--gonia-accent), var(--gonia-primary))",
  ];

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
    }),
    center: {
      zIndex: 1,
      x: 0,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? "100%" : "-100%",
    })
  };

  return (
    <div 
      className="min-h-[160px] md:min-h-[220px] lg:min-h-[280px] relative flex items-center justify-center w-full select-none cursor-grab active:cursor-grabbing overflow-hidden"
      onMouseEnter={() => setIsActive(false)}
      onMouseLeave={() => setIsActive(true)}
      onTouchStart={() => setIsActive(false)}
      onTouchEnd={() => setIsActive(true)}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={index}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "tween", ease: [0.4, 0, 0.2, 1], duration: 0.8 }
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.5}
          onDragEnd={(e, { offset, velocity }) => {
            const swipe = swipePower(offset.x, velocity.x);
            if (swipe < -swipeConfidenceThreshold) {
              paginate(1);
            } else if (swipe > swipeConfidenceThreshold) {
              paginate(-1);
            }
          }}
          className="absolute w-full flex items-center justify-center py-4 px-4"
        >
          <motion.h1
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            style={{ 
                backgroundImage: gradients[index] || gradients[0],
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
            }}
            className={cn(
              "font-black tracking-tight uppercase text-center max-w-full leading-[0.95] drop-shadow-sm",
              locale !== 'bn' && "text-4xl sm:text-6xl md:text-7xl lg:text-8xl",
              locale === 'bn' && "font-bengali text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] leading-[1.3] pt-4"
            )}
          >
            {texts[index]}
          </motion.h1>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}