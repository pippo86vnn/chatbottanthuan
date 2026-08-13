import React, { useState } from 'react';
import { 
  LayoutDashboard,
  FileText, 
  MessageSquareText, 
  LogOut,
  Megaphone,
  HelpCircle,
  FileDown,
  Video
} from 'lucide-react';
import { DashboardAdmin } from './DashboardAdmin';
import { ProceduresAdmin } from './ProceduresAdmin';
import { ChatLogsAdmin } from './ChatLogsAdmin';
import { NewsAdmin } from './NewsAdmin';
import { FaqAdmin } from './FaqAdmin';
import { FormsAdmin } from './FormsAdmin';
import { VideosAdmin } from './VideosAdmin';

interface AdminLayoutProps {
  onLogout: () => void;
}

type AdminTab = 'dashboard' | 'procedures' | 'news' | 'faq' | 'forms' | 'videos' | 'chatlogs';

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'procedures', label: 'Quản lý Thủ tục', icon: FileText },
    { id: 'news', label: 'Quản lý Tin tức', icon: Megaphone },
    { id: 'faq', label: 'Quản lý FAQ', icon: HelpCircle },
    { id: 'forms', label: 'Quản lý Biểu mẫu', icon: FileDown },
    { id: 'videos', label: 'Video Hướng dẫn', icon: Video },
    { id: 'chatlogs', label: 'Nhật ký Chatbot', icon: MessageSquareText },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-140px)] bg-slate-50">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 shrink-0 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-admin-900 flex items-center justify-center text-white font-bold">
              A
            </div>
            <div>
              <p className="font-bold text-slate-800">Admin</p>
              <p className="text-xs text-slate-500">Quản trị viên</p>
            </div>
          </div>
        </div>
        
        <nav className="p-3 space-y-1 flex-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as AdminTab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-amber-50 text-amber-700' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            )
          })}
        </nav>
        
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
        {activeTab === 'dashboard' && <DashboardAdmin />}
        {activeTab === 'procedures' && <ProceduresAdmin />}
        {activeTab === 'news' && <NewsAdmin />}
        {activeTab === 'faq' && <FaqAdmin />}
        {activeTab === 'forms' && <FormsAdmin />}
        {activeTab === 'videos' && <VideosAdmin />}
        {activeTab === 'chatlogs' && <ChatLogsAdmin />}
      </main>
    </div>
  );
};
