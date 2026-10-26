import React, { useState, useEffect, useRef } from 'react';

export const Screensaver: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set timeout to 1 minute (60000 ms)
  const IDLE_TIMEOUT = 120000;

  const resetTimer = () => {
    setIsActive(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsActive(true);
    }, IDLE_TIMEOUT);
  };

  useEffect(() => {
    // Initial timer start
    resetTimer();

    // Event listeners for user activity
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  if (!isActive) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer transition-opacity duration-500 overflow-hidden select-none"
      onClick={resetTimer}
      style={{
        background: 'linear-gradient(-45deg, #091e42, #1e3a8a, #854d0e, #991b1b, #0f172a)',
        backgroundSize: '400% 400%',
        animation: 'screensaverBg 10s ease infinite'
      }}
    >
      <style>{`
        @keyframes screensaverBg {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* Background Video if present */}
      <video 
        src="/screensaver.mp4" 
        autoPlay 
        loop 
        muted 
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay pointer-events-none"
        onError={(e) => {
          // Hide video element if video src fails to load
          e.currentTarget.style.display = 'none';
        }}
      />

      {/* Decorative center content */}
      <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto space-y-6">
        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/95 p-3 rounded-full shadow-2xl flex items-center justify-center border-4 border-amber-400/80 animate-bounce">
          <img 
            src="https://i.postimg.cc/21pt1tmH/LOGO-TRUNG-TAM.png" 
            alt="Logo Tân Thuận" 
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-amber-300 text-sm sm:text-base font-bold uppercase tracking-widest drop-shadow">
            Trung tâm phục vụ hành chính công Phường Tân Thuận
          </h2>
          <p className="text-white/80 text-xs sm:text-sm font-medium">
            Trợ lý AI Hành chính công thông minh
          </p>
        </div>

        {/* Main Instruction Text in Pure White */}
        <div className="pt-4">
          <p className="text-white text-2xl sm:text-4xl md:text-5xl font-extrabold animate-pulse drop-shadow-2xl tracking-wide">
            Chạm vào màn hình để bắt đầu
          </p>
        </div>
      </div>
    </div>
  );
};

