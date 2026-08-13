import React, { useState, useEffect, useCallback } from 'react';
import { Download, AlertCircle, ThumbsDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';

import { supabase } from '../../lib/supabase';

interface ChatLog {
  thoiGian: string;
  cauHoi: string;
  aiTraLoi: string;
  danhGia: 'like' | 'dislike' | 'none';
  ghiChu: string;
}

const PAGE_SIZE = 50;

export const ChatLogsAdmin: React.FC = () => {
  const [nhatKyData, setNhatKyData] = useState<ChatLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [showDislikesOnly, setShowDislikesOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dùng debounce thủ công cho việc tìm kiếm
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset về trang 1 khi search thay đổi
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleFetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Bắt đầu query với tính năng đếm tổng số dòng
      let query = supabase
        .from('nhat_ky_chat')
        .select('*', { count: 'exact' });

      // Lọc theo từ khóa tìm kiếm (Server-side search)
      if (debouncedSearch) {
        query = query.or(`cau_hoi.ilike.%${debouncedSearch}%,ai_tra_loi.ilike.%${debouncedSearch}%`);
      }
      
      // Lọc theo dislike
      if (showDislikesOnly) {
        query = query.or('danh_gia.ilike.%dislike%,danh_gia.ilike.%tích đỏ%');
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Phân trang
      const { data: rawList, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      setTotalCount(count || 0);
      
      if (rawList && rawList.length > 0) {
        const mappedData = rawList.map((item: any) => {
          const rawRating = String(item.danh_gia || '').toLowerCase();
          const danhGiaStatus: 'like' | 'dislike' | 'none' = rawRating.includes('dislike') || rawRating.includes('tích đỏ')
            ? 'dislike'
            : rawRating.includes('like')
            ? 'like'
            : 'none';

          return {
            thoiGian: String(item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : ''),
            cauHoi: String(item.cau_hoi || ''),
            aiTraLoi: String(item.ai_tra_loi || ''),
            danhGia: danhGiaStatus,
            ghiChu: String(item.ghi_chu || '')
          };
        });
        setNhatKyData(mappedData);
      } else {
        setNhatKyData([]);
      }
    } catch (err: any) {
      console.error("Lỗi khi tải nhật ký:", err);
      setError(err.message || 'Lỗi khi tải dữ liệu nhật ký');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, showDislikesOnly, currentPage]);

  useEffect(() => {
    handleFetchData();
  }, [handleFetchData]);

  const handleFilterDislikes = () => {
    setShowDislikesOnly(!showDislikesOnly);
    setCurrentPage(1); // Reset trang khi đổi filter
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-140px)]">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Nhật ký Chatbot</h2>
          <p className="text-sm text-slate-500">Theo dõi các phiên hỏi đáp của người dân (Phân trang trên Server)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <button
            onClick={handleFilterDislikes}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showDislikesOnly 
                ? 'bg-red-50 border-red-200 text-red-700' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ThumbsDown className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Chỉ hiện các câu trả lời bị Dislike (Tích đỏ)</span>
            <span className="sm:hidden">Dislike</span>
          </button>
          <button
            onClick={() => handleFetchData()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-slate-500/30 border-t-slate-500 rounded-full animate-spin shrink-0" />
            ) : (
              <Download className="w-4 h-4 shrink-0" />
            )}
            Tải lại
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mx-4 mt-4 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2 shrink-0">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
            <tr className="border-b border-slate-200 text-slate-500 text-sm">
              <th className="p-4 font-medium whitespace-nowrap">Thời gian</th>
              <th className="p-4 font-medium min-w-[250px]">Câu hỏi của dân</th>
              <th className="p-4 font-medium min-w-[300px]">AI trả lời</th>
              <th className="p-4 font-medium whitespace-nowrap">Đánh giá</th>
              <th className="p-4 font-medium">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {nhatKyData.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  {isLoading ? 'Đang tải dữ liệu...' : 'Không tìm thấy nhật ký phù hợp.'}
                </td>
              </tr>
            ) : (
              nhatKyData.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors text-sm">
                  <td className="p-4 text-slate-500 whitespace-nowrap">{item.thoiGian}</td>
                  <td className="p-4 text-slate-800 font-medium">{item.cauHoi}</td>
                  <td className="p-4 text-slate-600 line-clamp-3 leading-relaxed" title={item.aiTraLoi}>{item.aiTraLoi}</td>
                  <td className="p-4">
                     {item.danhGia === 'dislike' ? (
                       <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                         <ThumbsDown className="w-3 h-3" /> Dislike
                       </span>
                     ) : item.danhGia === 'like' ? (
                       <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                         Like
                       </span>
                     ) : (
                       <span className="text-slate-400 text-xs">Chưa đánh giá</span>
                     )}
                  </td>
                  <td className="p-4 text-slate-500 text-xs italic">{item.ghiChu || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white">
        <span className="text-sm text-slate-500 text-center sm:text-left">
          Hiển thị <b>{totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}</b> - <b>{Math.min(currentPage * PAGE_SIZE, totalCount)}</b> trong số <b>{totalCount}</b> kết quả
        </span>
        <div className="flex items-center justify-center gap-2">
          <button 
             disabled={currentPage <= 1 || isLoading}
             onClick={() => setCurrentPage(p => p - 1)}
             className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
             <ChevronLeft className="w-4 h-4" /> Trước
          </button>
          <span className="text-sm font-medium px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700">
            {currentPage} / {totalPages}
          </span>
          <button 
             disabled={currentPage >= totalPages || isLoading}
             onClick={() => setCurrentPage(p => p + 1)}
             className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
             Sau <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
