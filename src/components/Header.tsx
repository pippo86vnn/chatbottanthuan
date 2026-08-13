import React, { useState, useEffect } from 'react';
import { Bot, ShieldCheck, PhoneCall, Clock as ClockIcon } from 'lucide-react';
import { TabType } from '../types';
import { NewsTicker } from './NewsTicker';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-admin-950 text-white shadow-lg sticky top-0 z-50 border-b border-admin-900">
      {/* Top Banner Info with NewsTicker */}
      <div className="bg-admin-900 border-b border-admin-800 text-xs text-admin-200">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between min-h-[36px] gap-2">
          <div className="flex-1 min-w-0 w-full">
            <NewsTicker />
          </div>
          <div className="hidden sm:flex items-center space-x-3 shrink-0">
            <div className="flex items-center gap-2 border-r border-admin-700 pr-3">
              <span>Giao diện:</span>
              <button onClick={() => document.documentElement.setAttribute('data-theme', 'blue')} className="w-3.5 h-3.5 rounded-full bg-blue-800 border border-admin-300 hover:scale-110 transition-transform" title="Xanh dương"></button>
              <button onClick={() => document.documentElement.setAttribute('data-theme', 'red')} className="w-3.5 h-3.5 rounded-full bg-red-800 border border-admin-300 hover:scale-110 transition-transform" title="Đỏ"></button>
            </div>
            <span className="flex items-center gap-1 font-medium text-amber-300 text-xs">
              <PhoneCall className="w-3.5 h-3.5" /> Hotline: 02837850949
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 py-1.5 sm:py-2 flex flex-col md:flex-row justify-between items-center gap-0 sm:gap-1 md:gap-3">
        {/* Logo and Title */}
        <div className="flex items-center space-x-2.5 w-full md:w-auto overflow-hidden">
          <div className="bg-white p-1 rounded-xl shadow-md flex items-center justify-center shrink-0 overflow-hidden h-10 w-10 sm:h-12 sm:w-12">
            <img 
              src="https://i.postimg.cc/21pt1tmH/LOGO-TRUNG-TAM.png" 
              alt="LOGO-TRUNG-TAM" 
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-admin-950 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG
              </span>
            </div>
            <h1 className="text-xs sm:text-sm md:text-lg lg:text-xl font-bold tracking-tight text-white mt-1 truncate whitespace-nowrap">
              PHƯỜNG TÂN MỸ- TP. HỒ CHÍ MINH
            </h1>
          </div>
        </div>

        {/* Tab Switcher and Clock */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="text-admin-200 flex flex-col justify-center items-end shrink-0 hidden sm:flex">
             <span className="font-bold text-amber-400 text-xs sm:text-sm">{currentTime.toLocaleTimeString('vi-VN')}</span>
             <span className="text-[10px] text-admin-300">{currentTime.toLocaleDateString('vi-VN')}</span>
          </div>
          
          <div className="flex items-center gap-2 sm:hidden text-admin-200 shrink-0">
            <ClockIcon className="w-3 h-3 text-amber-400" />
            <span className="font-bold text-amber-400 text-xs">{currentTime.toLocaleTimeString('vi-VN')}</span>
          </div>

          <div className="flex bg-admin-900/80 p-1 rounded-lg border border-admin-800 shadow-inner shrink-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                activeTab === 'chat'
                  ? 'bg-amber-500 text-admin-950 shadow-md font-bold'
                  : 'text-admin-100 hover:text-white hover:bg-admin-800/60'
              }`}
            >
              <Bot className="w-3.5 h-3.5 shrink-0" />
              <span>Trợ lý AI</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center justify-center p-1.5 sm:p-2 rounded transition-all duration-200 ${
                activeTab === 'admin'
                  ? 'bg-amber-500 text-admin-950 shadow-md'
                  : 'text-admin-100 hover:text-white hover:bg-admin-800/60'
              }`}
              title="Admin Panel"
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
