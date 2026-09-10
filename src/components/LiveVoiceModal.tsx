import React from 'react';
import { Mic, X, Activity } from 'lucide-react';
import { useLiveVoice } from '../hooks/useLiveVoice';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose }) => {
  const { isConnected, status, talkTime, startCall, endCall } = useLiveVoice();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!isOpen) return null;

  const handleClose = () => {
    if (isConnected) {
      endCall();
    }
    onClose();
  };

  const toggleCall = () => {
    if (isConnected) {
      endCall();
    } else {
      startCall();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-slate-50 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-300">
        
        {/* Background Watermark */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none" 
          style={{
            backgroundImage: "url('https://i.postimg.cc/XYX6zMP6/LOGO-PHUONG.png')",
            backgroundRepeat: "no-repeat", 
            backgroundPosition: "center", 
            backgroundSize: "250px", 
            opacity: 0.05
          }}
        />

        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-slate-200/50 hover:bg-slate-200 text-slate-600 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-6 pt-10 pb-6 flex flex-col items-center flex-grow relative z-10">
            
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Voice Assistant
            </h2>
            <p className="text-sm text-slate-500">Trò chuyện trực tiếp với Trợ lý AI Tân Mỹ</p>
          </div>

          {/* Metrics Dashboard */}
          <div className="grid grid-cols-2 gap-4 w-full mb-10 text-sm">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
              <span className="text-slate-400 mb-1 text-xs">Trạng thái</span>
              <span className={`font-bold text-center ${status.colorClass}`}>{status.status}</span>
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
              <span className="text-slate-400 mb-1 text-xs">Thời gian gọi</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                {isConnected ? formatTime(talkTime) : '00:00'}
              </span>
            </div>
          </div>

          {/* Center Mic Button */}
          <div className="flex-grow flex items-center justify-center mb-8">
            <button 
              onClick={toggleCall}
              className={`relative group w-36 h-36 sm:w-44 sm:h-44 rounded-full shadow-xl flex flex-col items-center justify-center transition-all duration-300 outline-none
                ${isConnected 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white animate-[ripple_1.5s_linear_infinite] scale-105' 
                  : 'bg-slate-800 hover:bg-slate-900 text-white hover:scale-105'
                }
              `}
            >
              <Mic className="w-12 h-12 sm:w-16 sm:h-16 mb-2" />
              <span className="font-medium text-sm">
                {isConnected ? "Chạm để Dừng" : "Chạm để Hỏi"}
              </span>
            </button>
          </div>
          
          <p className="text-xs text-slate-400 text-center px-4">
            AI có thể nghe hiểu câu hỏi tự nhiên. Hãy nói "Tôi muốn làm giấy khai sinh" để bắt đầu.
          </p>

        </div>
      </div>

      <style>{`
        @keyframes ripple {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4), 0 0 0 10px rgba(16, 185, 129, 0.1); }
            100% { box-shadow: 0 0 0 20px rgba(16, 185, 129, 0), 0 0 0 40px rgba(16, 185, 129, 0); }
        }
      `}</style>
    </div>
  );
};
