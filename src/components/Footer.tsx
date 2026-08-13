import React from 'react';
import { Clock, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-admin-950 text-admin-200 border-t border-admin-900 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-admin-300">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Số 7, đường Tân Phú, Phường Tân Mỹ, TP. Hồ Chí Minh</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Giờ làm việc: 07:00-11:30 | 13:00-17:00</span>
            </div>
          </div>
          <p className="text-center md:text-right text-admin-400">
            © 2026 Trung tâm Phục vụ Hành chính công Phường Tân Mỹ
          </p>
        </div>
      </div>
    </footer>
  );
};

