import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, ChevronDown, Search, Loader2, AlertCircle, X, PlayCircle, Video, Play, Pause, Maximize2, Minimize2, FileText, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface FaqItem {
  cau_hoi_goc: string;
  cau_tra_loi_can_bo: string;
  ma_linh_vuc?: string;
}

export interface VideoItem {
  ma_thu_tuc?: string;
  ten_bieu_mau?: string;
  link_tai?: string;
  dinh_dang?: string;
  link_video?: string;
  tieu_de_video?: string;
}

export interface FormItem {
  ma_thu_tuc?: string;
  ten_bieu_mau?: string;
  link_tai?: string;
  dinh_dang?: string;
  linh_vuc?: string;
}

interface FaqListProps {
  isDrawer?: boolean;
  onClose?: () => void;
}

const LINH_VUC_MAP: Record<string, string> = {
  HO_TICH: 'Hộ tịch',
  CHUNG_THUC: 'Chứng thực',
  DAT_DAI: 'Đất đai - Xây dựng',
  BAO_HIEM: 'Bảo hiểm xã hội',
  HO_KHAU: 'Hộ khẩu - Cư trú',
  DOANH_NGHIEP: 'Doanh nghiệp - Kinh doanh',
  KINH_DOANH: 'Doanh nghiệp - Kinh doanh',
  AN_SINH: 'An sinh xã hội',
  KHAC: 'Khác'
};

const VIDEO_GROUP_KEY = 'VIDEO_HUONG_DAN';

// Extract YouTube Video ID from various link formats
const getYouTubeId = (url?: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Cache dữ liệu tĩnh ở cấp độ Module để tránh gọi lại API khi mở/đóng Drawer trên Mobile
let cachedFaqs: FaqItem[] | null = null;
let cachedVideos: VideoItem[] | null = null;
let cachedForms: FormItem[] | null = null;

export const FaqList: React.FC<FaqListProps> = ({ isDrawer = false, onClose }) => {
  // Lấy dữ liệu ngay từ cache (nếu có) để giao diện hiện lên ngay lập tức mà không có độ trễ
  const [faqs, setFaqs] = useState<FaqItem[]>(cachedFaqs || []);
  const [videos, setVideos] = useState<VideoItem[]>(cachedVideos || []);
  const [forms, setForms] = useState<FormItem[]>(cachedForms || []);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedFaqs);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);

  // Expanded groups state: default VIDEO_GROUP_KEY = true (open), FAQ groups = false (collapsed)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    [VIDEO_GROUP_KEY]: true
  });

  // Modal Video State (z-index 99999 popup modal)
  const [activeModalVideo, setActiveModalVideo] = useState<{ video: VideoItem; youtubeId: string } | null>(null);
  const [isModalFullscreen, setIsModalFullscreen] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleOpenVideoModal = (video: VideoItem, youtubeId: string) => {
    setActiveModalVideo({ video, youtubeId });
    setIsModalFullscreen(false);
    setIsPaused(false);
  };

  const handleCloseModal = () => {
    setActiveModalVideo(null);
    setIsModalFullscreen(false);
    setIsPaused(false);
  };

  const handlePauseVideo = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
        '*'
      );
      setIsPaused(true);
    }
  };

  const handlePlayVideo = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
        '*'
      );
      setIsPaused(false);
    }
  };

  // Toggle 'is-video-playing' class on body to hide chat messages & input wrapper when modal is active
  useEffect(() => {
    if (activeModalVideo) {
      document.body.classList.add('is-video-playing');
    } else {
      document.body.classList.remove('is-video-playing');
    }
    return () => {
      document.body.classList.remove('is-video-playing');
    };
  }, [activeModalVideo]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (cachedFaqs && cachedVideos && cachedForms) {
        // Nếu đã có cache, không cần gọi API nữa
        setFaqs(cachedFaqs);
        setVideos(cachedVideos);
        setForms(cachedForms);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const [faqRes, bieuMauRes, thuTucRes] = await Promise.all([
          supabase.from('faq').select('*'),
          supabase.from('bieu_mau').select('*'),
          supabase.from('thu_tuc').select('ma_thu_tuc, linh_vuc').limit(10000)
        ]);

        if (!isMounted) return;

        // Process FAQ data
        if (faqRes.data && Array.isArray(faqRes.data)) {
          const formattedFaqs: FaqItem[] = faqRes.data
            .map((item: any) => ({
              cau_hoi_goc: String(item.cau_hoi_goc || '').trim(),
              cau_tra_loi_can_bo: String(item.cau_tra_loi_can_bo || '').trim(),
              ma_linh_vuc: String(item.ma_linh_vuc || 'KHAC').trim()
            }))
            .filter(item => item.cau_hoi_goc.length > 0);

          cachedFaqs = formattedFaqs;
          setFaqs(formattedFaqs);
        } else {
          console.warn('FAQ response error:', faqRes.error);
        }

        // Prepare thutuc map
        const thuTucMap: Record<string, string> = {};
        if (thuTucRes.data) {
          thuTucRes.data.forEach((tt: any) => {
            if (tt.ma_thu_tuc) {
              thuTucMap[tt.ma_thu_tuc.trim()] = String(tt.linh_vuc || 'KHAC').trim();
            }
          });
        }

        // Process Video and Form data from bieu_mau
        if (bieuMauRes.data && Array.isArray(bieuMauRes.data)) {
          const allBieuMau = bieuMauRes.data.map((item: any) => {
            const maThuTuc = String(item.ma_thu_tuc || '').trim();
            return {
              ma_thu_tuc: maThuTuc,
              ten_bieu_mau: String(item.ten_bieu_mau || '').trim(),
              link_tai: String(item.link_tai || '').trim(),
              dinh_dang: String(item.dinh_dang || '').trim(),
              link_video: String(item.link_video || '').trim(),
              tieu_de_video: String(item.tieu_de_video || item.ten_bieu_mau || '').trim(),
              linh_vuc: maThuTuc && thuTucMap[maThuTuc] ? thuTucMap[maThuTuc] : 'KHAC'
            };
          });

          const formattedVideos = allBieuMau.filter(item => item.link_video.length > 0);
          const formattedForms = allBieuMau.filter(item => !item.link_video && item.ten_bieu_mau.length > 0);

          cachedVideos = formattedVideos;
          cachedForms = formattedForms;
          setVideos(formattedVideos);
          setForms(formattedForms);
        } else {
          console.warn('Biểu mẫu response error:', bieuMauRes.error);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error fetching FAQ and Video data:', err);
        setError('Có lỗi kết nối máy chủ. Vui lòng kiểm tra lại.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleAccordion = (key: string) => {
    setOpenItemKey(prev => (prev === key ? null : key));
  };

  const isGroupOpen = (groupKey: string): boolean => {
    if (expandedGroups[groupKey] !== undefined) {
      return expandedGroups[groupKey];
    }
    // Default: Video is expanded, FAQ groups are collapsed
    return groupKey === VIDEO_GROUP_KEY;
  };

  const handleToggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !isGroupOpen(groupKey)
    }));
  };

  const getDomainLabel = (code?: string): string => {
    if (!code) return 'Khác';
    const normalizedCode = code.toUpperCase().trim();
    return LINH_VUC_MAP[normalizedCode] || code;
  };

  // Filter FAQs by search term
  const filteredFaqs = faqs.filter(faq => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      faq.cau_hoi_goc.toLowerCase().includes(term) ||
      faq.cau_tra_loi_can_bo.toLowerCase().includes(term)
    );
  });

  // Filter Videos by search term
  const filteredVideos = videos.filter(video => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (video.tieu_de_video && video.tieu_de_video.toLowerCase().includes(term)) ||
      (video.ten_bieu_mau && video.ten_bieu_mau.toLowerCase().includes(term))
    );
  });

  // Filter Forms by search term
  const filteredForms = forms.filter(form => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (form.ten_bieu_mau && form.ten_bieu_mau.toLowerCase().includes(term))
    );
  });

  // Group FAQs by ma_linh_vuc
  const groupedFaqs = filteredFaqs.reduce<Record<string, { label: string; items: { faq: FaqItem; globalIndex: number }[], forms: FormItem[] }>>((acc, faq, index) => {
    const rawDomain = (faq.ma_linh_vuc && faq.ma_linh_vuc.trim() ? faq.ma_linh_vuc.trim() : 'KHAC').toUpperCase();
    const domainLabel = getDomainLabel(rawDomain);

    if (!acc[rawDomain]) {
      acc[rawDomain] = {
        label: domainLabel,
        items: [],
        forms: []
      };
    }
    acc[rawDomain].items.push({ faq, globalIndex: index });
    return acc;
  }, {});

  // Add forms to their respective groups
  filteredForms.forEach(form => {
    const rawDomain = (form.linh_vuc && form.linh_vuc.trim() ? form.linh_vuc.trim() : 'KHAC').toUpperCase();
    const domainLabel = getDomainLabel(rawDomain);
    
    if (!groupedFaqs[rawDomain]) {
      groupedFaqs[rawDomain] = {
        label: domainLabel,
        items: [],
        forms: []
      };
    }
    groupedFaqs[rawDomain].forms.push(form);
  });

  const groupKeys = Object.keys(groupedFaqs);
  const totalResultsCount = filteredFaqs.length + filteredVideos.length + filteredForms.length;

  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-admin-100 flex flex-col overflow-hidden ${
      isDrawer ? 'h-full w-full' : 'h-[82vh] sm:h-[75vh] w-full'
    }`}>
      {/* Header section */}
      <div className="bg-admin-900 px-4 py-3 text-white flex items-center justify-between border-b border-admin-800 shrink-0">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <h2 className="font-bold text-sm sm:text-base leading-tight">
            Câu Hỏi Thường Gặp & Video
          </h2>
        </div>
        {isDrawer && onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-admin-800 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm câu hỏi, câu trả lời, video..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-admin-600 focus:border-transparent transition shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-slate-50/50">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
            <Loader2 className="w-8 h-8 text-admin-800 animate-spin" />
            <span className="text-xs sm:text-sm font-medium">Đang tải danh sách câu hỏi & video...</span>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Lỗi tải dữ liệu</p>
              <p className="mt-0.5 text-xs text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && totalResultsCount === 0 && (
          <div className="text-center py-12 px-4 text-slate-500">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">
              {searchTerm ? 'Không tìm thấy nội dung phù hợp' : 'Chưa có câu hỏi hoặc video nào'}
            </p>
            {searchTerm && (
              <p className="text-xs text-slate-400 mt-1">
                Thử thay đổi từ khóa tìm kiếm
              </p>
            )}
          </div>
        )}

        {/* Content List */}
        {!isLoading && !error && totalResultsCount > 0 && (
          <div className="space-y-4">
            {/* FAQ Groups */}
            {groupKeys.map((groupKey) => {
              const group = groupedFaqs[groupKey];
              const isGroupExpanded = isGroupOpen(groupKey);

              return (
                <div key={groupKey} className="space-y-2">
                  {/* Collapsible Group Header Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleGroup(groupKey)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-200/60 transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-admin-900 group-hover:text-amber-600 transition">
                        {group.label}
                      </h3>
                      <span className="text-[10px] bg-slate-200 text-slate-600 font-semibold px-1.5 py-0.2 rounded-full">
                        {group.items.length + group.forms.length}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 group-hover:text-admin-900 transition-transform duration-300 ${
                        isGroupExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Group Content Items */}
                  {isGroupExpanded && (
                    <div className="space-y-2 pl-1 animate-fadeIn">
                      {group.items.map(({ faq, globalIndex }) => {
                        const itemKey = `${groupKey}-${globalIndex}`;
                        const isOpen = openItemKey === itemKey;

                        return (
                          <div
                            key={itemKey}
                            className="bg-white border border-slate-200 hover:border-admin-300 rounded-xl shadow-sm transition overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleAccordion(itemKey)}
                              className="w-full text-left p-3 flex items-start justify-between gap-2.5 transition hover:bg-slate-50 cursor-pointer"
                            >
                              <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                                {faq.cau_hoi_goc}
                              </span>
                              <ChevronDown
                                className={`w-4 h-4 text-slate-400 shrink-0 mt-0.5 transition-transform duration-300 ${
                                  isOpen ? 'rotate-180 text-admin-900' : ''
                                }`}
                              />
                            </button>

                            {isOpen && (
                              <div className="px-3 pb-3.5 pt-1 text-xs sm:text-sm text-slate-700 border-t border-slate-100 bg-slate-50/70 whitespace-pre-wrap leading-relaxed animate-fadeIn">
                                {faq.cau_tra_loi_can_bo}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Render Forms for this group */}
                      {group.forms.length > 0 && (
                        <div className="mt-4 border-t border-slate-200 pt-3 space-y-2">
                           <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                             Biểu mẫu tải về
                           </div>
                           {group.forms.map((form, fIdx) => (
                             <div key={`form-${fIdx}`} className="bg-white border border-slate-200 hover:border-admin-300 rounded-xl shadow-sm p-3 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                               <div className="flex items-start gap-2.5 min-w-0">
                                 <FileText className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                 <div>
                                   <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug break-words">
                                     {form.ten_bieu_mau}
                                   </p>
                                   {form.dinh_dang && (
                                     <span className="inline-flex mt-1 items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                       {form.dinh_dang}
                                     </span>
                                   )}
                                 </div>
                               </div>
                               {form.link_tai && (
                                 <a 
                                   href={form.link_tai} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors border border-blue-200 self-start sm:self-auto"
                                 >
                                   <Download className="w-3.5 h-3.5" />
                                   Tải xuống
                                 </a>
                               )}
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Video Hướng Dẫn Section */}
            {filteredVideos.length > 0 && (() => {
              const isVideoGroupExpanded = isGroupOpen(VIDEO_GROUP_KEY);

              return (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  {/* Collapsible Video Group Header */}
                  <button
                    type="button"
                    onClick={() => handleToggleGroup(VIDEO_GROUP_KEY)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-200/60 transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-red-600 shrink-0" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-admin-900 group-hover:text-red-600 transition">
                        🎬 VIDEO HƯỚNG DẪN
                      </h3>
                      <span className="text-[10px] bg-red-100 text-red-700 font-semibold px-1.5 py-0.2 rounded-full">
                        {filteredVideos.length}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 group-hover:text-admin-900 transition-transform duration-300 ${
                        isVideoGroupExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Video List Items */}
                  {isVideoGroupExpanded && (
                    <div className="space-y-3 pl-1 animate-fadeIn">
                      {filteredVideos.map((video, vIndex) => {
                        const youtubeId = getYouTubeId(video.link_video);

                        return (
                          <div
                            key={`video-${vIndex}`}
                            className="bg-white border border-slate-200 hover:border-red-300 rounded-xl p-3 shadow-sm transition overflow-hidden space-y-2.5"
                          >
                            {/* Video Title Header */}
                            <div className="flex items-start justify-between gap-2.5">
                              <div
                                onClick={() => youtubeId && handleOpenVideoModal(video, youtubeId)}
                                className={`flex items-start gap-2 min-w-0 ${youtubeId ? 'cursor-pointer group/title' : ''}`}
                              >
                                <PlayCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5 group-hover/title:scale-110 transition-transform" />
                                <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug group-hover/title:text-red-700 transition">
                                  {video.tieu_de_video || video.ten_bieu_mau || 'Video hướng dẫn'}
                                </p>
                              </div>
                            </div>

                            {/* Player / Thumbnail Box */}
                            {youtubeId ? (
                              /* YouTube Thumbnail with Play Button Overlay - Clicking opens high z-index modal */
                              <div
                                onClick={() => handleOpenVideoModal(video, youtubeId)}
                                className="relative w-full aspect-video rounded-lg overflow-hidden cursor-pointer group/thumb border border-slate-200 shadow-sm bg-slate-900"
                              >
                                <img
                                  src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                                  alt={video.tieu_de_video || 'Thumbnail video'}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                                />
                                {/* Dark Gradient Overlay */}
                                <div className="absolute inset-0 bg-black/25 group-hover/thumb:bg-black/10 transition-colors flex items-center justify-center" />
                                
                                {/* Center Play Button Badge */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-red-600/90 group-hover/thumb:bg-red-600 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-all duration-300">
                                    <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white translate-x-0.5" />
                                  </div>
                                </div>

                                {/* Bottom Label overlay */}
                                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[11px] font-medium text-white drop-shadow-md">
                                  <span className="bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[10px]">
                                    Bấm để xem video
                                  </span>
                                </div>
                              </div>
                            ) : (
                              /* Fallback if link is not standard youtube */
                              <a
                                href={video.link_video}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium"
                              >
                                <PlayCircle className="w-4 h-4" />
                                <span>Mở link video</span>
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* High Z-Index Video Modal Overlay (Bounded between Header and Footer) */}
      {activeModalVideo && (
        <div className="fixed top-[76px] sm:top-[84px] md:top-[88px] bottom-[48px] inset-x-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          {/* Modal Container */}
          <div
            className={`bg-slate-900 text-white shadow-2xl flex flex-col overflow-hidden transition-all duration-300 border border-slate-700/80 ${
              isModalFullscreen
                ? 'w-full h-full rounded-none'
                : 'relative w-full max-w-4xl rounded-2xl max-h-full'
            }`}
          >
            {/* Top Control Bar with 4 Action Buttons */}
            <div className="bg-slate-800/95 border-b border-slate-700/80 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 shrink-0">
              {/* Title */}
              <div className="flex items-center gap-2 min-w-0">
                <Video className="w-5 h-5 text-red-500 shrink-0" />
                <h3 className="font-semibold text-xs sm:text-sm text-slate-100 truncate">
                  {activeModalVideo.video.tieu_de_video || activeModalVideo.video.ten_bieu_mau || 'Video hướng dẫn'}
                </h3>
              </div>

              {/* 4 Control Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* 1. Phóng to (Expand) */}
                {!isModalFullscreen && (
                  <button
                    type="button"
                    onClick={() => setIsModalFullscreen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition text-xs font-medium cursor-pointer"
                    title="Phóng to toàn màn hình"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                    <span className="hidden sm:inline">Phóng to</span>
                  </button>
                )}

                {/* 2. Thu nhỏ (Collapse) */}
                {isModalFullscreen && (
                  <button
                    type="button"
                    onClick={() => setIsModalFullscreen(false)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition text-xs font-medium cursor-pointer"
                    title="Thu nhỏ khung"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
                    <span className="hidden sm:inline">Thu nhỏ</span>
                  </button>
                )}

                {/* 3. Dừng / Tạm dừng (Pause / Play) */}
                {isPaused ? (
                  <button
                    type="button"
                    onClick={handlePlayVideo}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white transition text-xs font-medium cursor-pointer"
                    title="Tiếp tục phát video"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span className="hidden sm:inline">Tiếp tục</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePauseVideo}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-600 text-white transition text-xs font-medium cursor-pointer"
                    title="Dừng video (Tạm dừng)"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Dừng</span>
                  </button>
                )}

                {/* 4. Đóng (Close) */}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white transition text-xs font-medium cursor-pointer"
                  title="Đóng video"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đóng</span>
                </button>
              </div>
            </div>

            {/* Video Player Frame */}
            <div className={`relative bg-black w-full ${isModalFullscreen ? 'flex-1 h-full' : 'aspect-video'}`}>
              <iframe
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${activeModalVideo.youtubeId}?autoplay=1&enablejsapi=1`}
                title={activeModalVideo.video.tieu_de_video || 'Video hướng dẫn'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


