import React from 'react';
import { cn } from '../../lib/utils';

export const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Layer 1: Primary deep glow (Top Left) */}
      <div 
        className={cn(
          "absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full opacity-[0.2] dark:opacity-[0.25] blur-[100px] md:blur-[140px] will-change-transform",
          "bg-blue-400 dark:bg-blue-900",
          "animate-float-1"
        )} 
      />
      
      {/* Layer 2: Secondary violet glow (Bottom Right) */}
      <div 
        className={cn(
          "absolute top-[30%] -right-[10%] w-[60%] h-[80%] rounded-full opacity-[0.15] dark:opacity-[0.2] blur-[120px] md:blur-[150px] will-change-transform",
          "bg-indigo-400 dark:bg-violet-900",
          "animate-float-2"
        )} 
      />

      {/* Layer 3: Tertiary soft indigo glow (Bottom Left) */}
      <div 
        className={cn(
          "absolute -bottom-[20%] left-[10%] w-[50%] h-[60%] rounded-full opacity-[0.12] dark:opacity-[0.15] blur-[100px] md:blur-[130px] will-change-transform",
          "bg-violet-400 dark:bg-indigo-900",
          "animate-float-3"
        )} 
      />
    </div>
  );
};
