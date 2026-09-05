import React from 'react';

interface AuthLoadingScreenProps {
  message?: string;
}

export const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({
  message = 'Verifying cryptographic session...',
}) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground z-50 select-none">
      {/* Background subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[90px] animate-pulse" />
      </div>

      <div className="relative flex flex-col items-center gap-4 z-10">
        {/* Branded Logo Container with Pure CSS Pulse */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-blue-500/10 border border-blue-500/20 animate-ping opacity-25" style={{ animationDuration: '3s' }} />
          <div className="relative w-14 h-14 rounded-2xl bg-background/80 backdrop-blur-sm border border-foreground/10 flex items-center justify-center shadow-lg p-2">
            <img
              src="/logo-128.webp"
              alt="MindVault Logo"
              width={40}
              height={40}
              className="w-10 h-10 object-contain"
              loading="eager"
            />
          </div>
        </div>

        {/* Brand Text */}
        <div className="flex flex-col items-center text-center mt-1">
          <span className="font-display font-bold text-lg text-foreground tracking-tight">
            MindVault AI
          </span>
          <div className="flex items-center gap-2 mt-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-xs text-muted-foreground font-medium tracking-wide">
              {message}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLoadingScreen;
