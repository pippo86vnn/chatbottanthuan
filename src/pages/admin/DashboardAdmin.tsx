import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Clock, Database, AlertCircle, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DashboardStats {
  totalChats: number;
  ratedChats: number;
  satisfactionRate: number;
  savedHours: number;
  totalRAG: number;
  topProcedures: { name: string; count: number }[];
  recentDislikes: { thoiGian: string; cauHoi: string; ghiChu: string }[];
}

// Các cột thật sự tồn tại trên Sheet "Nhat_ky" (theo setupDatabase phía backend).
// Không đoán thêm tên field khác — backend chỉ bao giờ trả đúng các key này.
type NhatKyRow = {
  Thoi_gian?: string;
  thoi_gian?: string;
  Session_ID?: string;
  session_id?: string;
  Cau_hoi_Nguoi_dan?: string;
  cau_hoi?: string;
  AI_Tra_loi?: string;
  ai_tra_loi?: string;
  Nguon_Du_Lieu?: string;
  nguon_du_lieu?: string;
  Danh_gia_User?: string;
  Danh_gia_Nguoi_dan?: string;
  danh_gia?: string;
  danhGia?: string;
  Ghi_chu_Admin?: string;
  ghi_chu?: string;
};

type ThuTucRow = Record<string, unknown>;

function normalizeRating(value: unknown): 'like' | 'dislike' | null {
  const raw = (value ?? '').toString().trim().toLowerCase();
  if (raw === 'like' || raw === 'dislike') return raw;
  return null;
}

export const DashboardAdmin: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalChats: 0,
    ratedChats: 0,
    satisfactionRate: 100,
    savedHours: 0,
    totalRAG: 0,
    topProcedures: [],
    recentDislikes: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [nhatKyRes, thuTucRes, totalCountRes] = await Promise.all([
          // Chỉ tải 1000 lượt chat gần nhất để phân tích chi tiết (Top chủ đề, Dislike)
          supabase.from('nhat_ky_chat').select('*').order('created_at', { ascending: false }).limit(1000),
          // Chỉ lấy số lượng RAG
          supabase.from('thu_tuc').select('*', { count: 'exact', head: true }),
          // Lấy tổng số lượng chat trong lịch sử
          supabase.from('nhat_ky_chat').select('*', { count: 'exact', head: true })
        ]);
        
        const nhatKyData = nhatKyRes.data || [];
        const totalChats = totalCountRes.count || 0;

        // Chỉ những dòng đã có đánh giá "like"/"dislike" mới tính vào tỷ lệ hài lòng.
        // Không mặc định các dòng chưa đánh giá là "hài lòng" (trước đây gây sai số liệu).
        const rated = nhatKyData
          .map((item: any) => {
            const rawRatingVal = item.danh_gia;
            return { item, rating: normalizeRating(rawRatingVal) };
          })
          .filter((x) => x.rating !== null);

        const dislikes = rated.filter((x) => x.rating === 'dislike');

        const ratedChats = rated.length;
        const satisfactionRate = ratedChats > 0
          ? Math.round(((ratedChats - dislikes.length) / ratedChats) * 100)
          : 100;

        const savedHours = Math.round((totalChats * 15) / 60);

        const totalRAG = thuTucRes.count || 0;

        // Danh sách các câu hỏi bị đánh giá "dislike" gần đây nhất
        const recentDislikes = dislikes
          .slice()
          .reverse()
          .slice(0, 3)
          .map(({ item }) => ({
            thoiGian: String(item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : ''),
            cauHoi: String(item.cau_hoi || ''),
            ghiChu: String(item.ghi_chu || '')
          }));

        // Top chủ đề quan tâm — nhóm theo nguồn dữ liệu AI đã dùng, hoặc theo câu hỏi
        // nếu chưa có nguồn (Nguon_Du_Lieu hiện có thể để trống tuỳ cách backend/AI ghi).
        const proceduresCount: Record<string, number> = {};
        nhatKyData.forEach((item: any) => {
          const rawVal = item.nguon_du_lieu || item.cau_hoi || '';
          const name = String(rawVal).trim();
          if (name) {
            proceduresCount[name] = (proceduresCount[name] || 0) + 1;
          }
        });

        const topProcedures = Object.entries(proceduresCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setStats({
          totalChats,
          ratedChats,
          satisfactionRate,
          savedHours,
          totalRAG,
          topProcedures,
          recentDislikes
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-180px)] rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 overflow-y-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tổng quan Hệ thống</h2>
          <p className="text-slate-500 text-sm mt-1">Dữ liệu thống kê dựa trên 1000 lượt hỏi đáp gần nhất</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium animate-pulse">Đang tải số liệu...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Tổng lượt chat</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.totalChats}</h3>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ThumbsUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Tỷ lệ hài lòng</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.satisfactionRate}%</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {stats.ratedChats > 0 ? `Trên ${stats.ratedChats} lượt đánh giá` : 'Chưa có lượt đánh giá nào'}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Tiết kiệm (Giờ)</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.savedHours}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Thủ tục RAG</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.totalRAG}</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Procedures */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800">Top 5 Chủ đề quan tâm</h3>
              </div>
              <div className="p-4 flex-1">
                {stats.topProcedures.length > 0 ? (
                  <div className="space-y-4">
                    {stats.topProcedures.map((proc, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-sm text-slate-700 font-medium truncate" title={proc.name}>
                            {proc.name}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full shrink-0">
                          {proc.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Chưa có dữ liệu
                  </div>
                )}
              </div>
            </div>

            {/* Recent Dislikes */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-red-50 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-red-700">Cần chú ý / Cải thiện</h3>
              </div>
              <div className="p-4 flex-1">
                {stats.recentDislikes.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentDislikes.map((item, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs text-slate-500 font-medium">{item.thoiGian}</span>
                        </div>
                        <p className="text-sm text-slate-800 font-medium mb-1 line-clamp-2" title={item.cauHoi}>
                          "{item.cauHoi}"
                        </p>
                        {item.ghiChu && (
                          <p className="text-xs text-red-600 italic mt-1">
                            Lý do: {item.ghiChu}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                    <ThumbsUp className="w-8 h-8 text-slate-200 mb-2" />
                    <p>Không có phản hồi tiêu cực gần đây</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
