/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ChatAssistant } from './components/ChatAssistant';
import { FaqList } from './components/FaqList';
import { AdminPanel } from './pages/AdminPanel';
import { Screensaver } from './components/Screensaver';
import { TabType } from './types';
import { HelpCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [isFaqDrawerOpen, setIsFaqDrawerOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-admin-900 selection:text-white relative">
      <Screensaver />
      {/* Header Navigation */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content View */}
      <main className="flex-1 pb-12 relative">
        {activeTab === 'chat' && (
          <div className="max-w-[1440px] mx-auto px-2 sm:px-4 flex gap-4 md:gap-6 items-start relative">
            {/* Cột trái: FAQ Sidebar cố định cho màn hình md trở lên */}
            <div className="w-80 shrink-0 hidden md:block py-2 sm:py-6 sticky top-2">
              <FaqList />
            </div>

            {/* Cột phải: Chat Assistant chiếm phần còn lại */}
            <div className="flex-1 min-w-0">
              <ChatAssistant />
            </div>
          </div>
        )}

        {activeTab === 'admin' && <AdminPanel />}
      </main>

      {/* Floating Action Buttons cho Mobile & Desktop */}
      <div className="fixed bottom-14 right-3 md:bottom-8 md:right-8 z-40 flex items-center gap-2">
        {/* FAB Hỏi đáp FAQ - chỉ hiển thị ở Mobile khi ở tab Chat */}
        {activeTab === 'chat' && (
          <button
            onClick={() => setIsFaqDrawerOpen(true)}
            className="md:hidden bg-admin-900 hover:bg-admin-800 text-white px-3 py-2 rounded-full shadow-2xl flex items-center gap-1.5 border border-amber-400/50 active:scale-95 transition"
            title="Mở danh sách câu hỏi thường gặp"
          >
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-bold pr-0.5 whitespace-nowrap">Hỏi đáp FAQ</span>
          </button>
        )}

        {/* FAB Zalo OA - Nằm bên phải, cân bằng ngang hàng với Hỏi đáp FAQ */}
        <a
          href="https://zalo.me/4060033006235308567"
          target="_blank"
          rel="noopener noreferrer"
          title="Kết nối Zalo OA Phường Tân Mỹ"
          className="relative group flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shrink-0"
        >
          <span className="absolute inset-0 rounded-full bg-blue-500/40 animate-ping pointer-events-none" />
          <img
            src="https://i.postimg.cc/cv78twCL/Icon-of-Zalo-svg.webp"
            alt="Zalo OA"
            referrerPolicy="no-referrer"
            className="w-10 h-10 md:w-14 md:h-14 rounded-full shadow-2xl relative z-10 border-2 border-white object-cover"
          />
        </a>
      </div>

      {/* Drawer FAQ cho Mobile */}
      {isFaqDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
          <div className="h-[90vh] w-full bg-white rounded-t-2xl overflow-hidden shadow-2xl flex flex-col">
            <FaqList isDrawer onClose={() => setIsFaqDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}


