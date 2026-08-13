import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export const TrainingDataAdmin: React.FC = () => {
  const [data, setData] = useState<any[][]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // Thử lấy dữ liệu thủ tục làm dữ liệu học RAG
      const { data: rawThuTuc, error } = await supabase.from('thu_tuc').select('*');
      if (error) throw error;
      
      if (rawThuTuc && rawThuTuc.length > 0) {
        const headers = ['Mã TTHC', 'Tên thủ tục hành chính', 'Trạng thái học', 'Lĩnh vực', 'syncStatus', 'errorMessage'];
        const rows = rawThuTuc.map((item: any, idx: number) => [
          item.ma_thu_tuc || `TTHC-${idx + 1}`,
          item.ten_thu_tuc || 'Thủ tục hành chính',
          'Đã đồng bộ AI',
          item.linh_vuc || 'Dịch vụ công',
          'success',
          ''
        ]);
        setData([headers, ...rows]);
        setLoading(false);
        return;
      }
      setData([]);
    } catch (e) {
      console.error("Lỗi tải dữ liệu học:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>;

  const headers = data[0] || [];
  const rows = data.slice(1);

  const syncStatusIndex = headers.indexOf('syncStatus');
  const errorIndex = headers.indexOf('errorMessage');

  let total = rows.length;
  let loadingCount = 0;
  let successCount = 0;
  let errorCount = 0;
  let lastSyncStatus = 'success';
  let lastErrorMsg = '';

  if (syncStatusIndex !== -1) {
    rows.forEach(r => {
      const st = r[syncStatusIndex];
      if (st === 'loading') loadingCount++;
      if (st === 'success') successCount++;
      if (st === 'error') errorCount++;
    });

    if (loadingCount > 0) lastSyncStatus = 'loading';
    else if (errorCount > 0) {
      lastSyncStatus = 'error';
      const firstErrorRow = rows.find(r => r[syncStatusIndex] === 'error');
      if (firstErrorRow && errorIndex !== -1) {
        lastErrorMsg = firstErrorRow[errorIndex];
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Quản lý Dữ liệu Học Chatbot</h2>
        <button onClick={loadData} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 border border-slate-200 rounded shadow-sm">
          <RefreshCw className="w-4 h-4" /> Làm mới
        </button>
      </div>

      {lastSyncStatus === 'loading' && (
        <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg flex items-center gap-3 border border-yellow-200">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">Trợ lý đang đồng bộ dữ liệu pháp lý mới nhất...</span>
        </div>
      )}
      {lastSyncStatus === 'success' && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-3 border border-green-200">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Đã đồng bộ thành công {successCount} thủ tục hành chính.</span>
        </div>
      )}
      {lastSyncStatus === 'error' && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3 border border-red-200">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Không thể kết nối với Cơ sở dữ liệu nguồn. Vui lòng kiểm tra lại cấu hình Supabase.</p>
            {lastErrorMsg && <p className="text-sm mt-1 opacity-80">{lastErrorMsg}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Tổng bản ghi</div>
          <div className="text-2xl font-bold text-slate-800">{total}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Đang học</div>
          <div className="text-2xl font-bold text-yellow-600">{loadingCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Đã học xong</div>
          <div className="text-2xl font-bold text-green-600">{successCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Lỗi</div>
          <div className="text-2xl font-bold text-red-600">{errorCount}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Câu hỏi</th>
                <th className="px-4 py-3 font-semibold">Danh mục</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{r[0]}</td>
                  <td className="px-4 py-3 font-medium truncate max-w-xs">{r[1]}</td>
                  <td className="px-4 py-3">{r[3]}</td>
                  <td className="px-4 py-3">
                    {r[syncStatusIndex] === 'success' ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Thành công</span>
                    ) : r[syncStatusIndex] === 'error' ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Lỗi</span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Đang tải</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
