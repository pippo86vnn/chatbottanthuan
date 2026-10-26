import React, { useState, useEffect } from 'react';
import { Megaphone, ExternalLink, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface NewsItem {
  tieu_de?: string;
  noi_dung?: string;
  ngay_dang?: string;
  hien_thi_ticker?: boolean | string | number;
  link_ngoai?: string;
  [key: string]: any;
}

const DEFAULT_NEWS: NewsItem[] = [
  { tieu_de: 'Chào mừng Quý bà con và doanh nghiệp đến với Cổng thông tin & Trợ lý AI Hành chính công Phường Tân Thuận' },
  { tieu_de: 'Bộ phận Một cửa Phường Tân Thuận tiếp nhận và giải quyết hồ sơ thủ tục hành chính từ 7h30 - 17h00 các ngày làm việc' },
  { tieu_de: 'Thực hiện nộp hồ sơ dịch vụ công trực tuyến nhanh chóng, công khai, minh bạch và tiết kiệm thời gian' }
];

export const NewsTicker: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>(DEFAULT_NEWS);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadNews = async () => {
      try {
        const { data: rawList, error } = await supabase.from('tin_tuc').select('*');
        if (error) throw error;
        
        if (isMounted && rawList && rawList.length > 0) {
          const filtered = rawList.filter((item: any) => {
            const val = item.hien_thi_ticker;
            if (val === false || val === 0) return false;
            if (typeof val === 'string') {
              const str = val.trim().toLowerCase();
              if (str === 'false' || str === '0' || str === 'no') return false;
            }
            return Boolean(item.tieu_de || item.noi_dung);
          });
          if (filtered.length > 0) {
            setNews(filtered);
          } else {
            setNews(rawList);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải tin tức ticker:', err);
      }
    };

    loadNews();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!isVisible || news.length === 0) {
    return null;
  }

  // Tạo danh sách cơ bản và nhân đôi 2 nửa giống hệt nhau để cuộn lặp từ 0% đến -50% liên tục & chạy ngay khi vừa mở trang
  const baseList = news.length < 3 ? [...news, ...news] : news;
  const displayItems = [...baseList, ...baseList];

  const handleItemClick = (e: React.MouseEvent, link?: string) => {
    if (link && link.trim()) {
      e.preventDefault();
      window.open(link.trim(), '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-transparent text-xs text-admin-100 py-1 flex items-center justify-between gap-2.5 h-8 sm:h-9 select-none overflow-hidden w-full">
      {/* Badge bên trái */}
      <div className="bg-amber-500 text-admin-950 font-extrabold px-2 py-0.5 rounded text-[10px] sm:text-xs uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-sm">
        <Megaphone className="w-3 h-3 animate-pulse text-admin-950" />
        <span>TIN MỚI</span>
      </div>

      {/* Dải chữ chạy Marquee */}
      <div className="relative overflow-hidden flex-1 h-full flex items-center">
        <div 
          className="animate-marquee hover:[animation-play-state:paused] focus:[animation-play-state:paused] active:[animation-play-state:paused] flex items-center gap-6 whitespace-nowrap"
        >
          {displayItems.map((item, index) => {
            const hasLink = Boolean(item.link_ngoai && item.link_ngoai.trim());
            const titleText = item.tieu_de || item.noi_dung || 'Tin tức mới';

            return (
              <React.Fragment key={index}>
                {index > 0 && <span className="text-amber-400 font-bold mx-1">•</span>}
                {hasLink ? (
                  <a
                    href={item.link_ngoai}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => handleItemClick(e, item.link_ngoai)}
                    className="hover:underline hover:text-amber-300 text-white font-medium transition-colors cursor-pointer inline-flex items-center gap-1 group"
                    title={`Mở tin: ${titleText}`}
                  >
                    <span>{titleText}</span>
                    <ExternalLink className="w-3 h-3 text-amber-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                  </a>
                ) : (
                  <span className="font-medium text-slate-100 cursor-default">
                    {titleText}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Nút Tắt dải tin tức */}
      <button
        type="button"
        onClick={() => setIsVisible(false)}
        title="Tắt dải tin tức"
        className="p-1 text-admin-300 hover:text-white hover:bg-admin-800 rounded-full transition-colors shrink-0 focus:outline-none"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
