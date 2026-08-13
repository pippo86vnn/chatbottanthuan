import React, { useState, useEffect } from 'react';
import { Download, AlertCircle, Search, PlusCircle, X, Save, Loader2, CheckCircle2, Edit2, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FaqItem {
  id?: number;
  ma_linh_vuc: string;
  cau_hoi_goc: string;
  cau_tra_loi_can_bo: string;
}

const INITIAL_FORM_DATA: FaqItem = {
  ma_linh_vuc: '',
  cau_hoi_goc: '',
  cau_tra_loi_can_bo: ''
};

export const FaqAdmin: React.FC = () => {
  const [data, setData] = useState<FaqItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLinhVuc, setSelectedLinhVuc] = useState<string>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FaqItem>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleFetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: rawList, error } = await supabase.from('faq').select('*').order('id', { ascending: false });
      if (error) throw error;

      if (rawList && rawList.length > 0) {
        setData(rawList as FaqItem[]);
      } else {
        setData([]);
      }
    } catch (err: any) {
      console.error("Lỗi khi tải FAQ:", err);
      setError(err.message || 'Lỗi khi tải dữ liệu FAQ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleFetchData();
  }, []);

  const uniqueLinhVuc = Array.from(new Set(data.map(item => item.ma_linh_vuc).filter(Boolean)));

  const filteredData = data.filter(item => {
    const matchesSearch = item.cau_hoi_goc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.cau_tra_loi_can_bo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLinhVuc = selectedLinhVuc === 'all' || item.ma_linh_vuc === selectedLinhVuc;
    return matchesSearch && matchesLinhVuc;
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setFormData(INITIAL_FORM_DATA);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: FaqItem) => {
    setFormData({
      ma_linh_vuc: item.ma_linh_vuc || '',
      cau_hoi_goc: item.cau_hoi_goc || '',
      cau_tra_loi_can_bo: item.cau_tra_loi_can_bo || ''
    });
    setEditingId(item.id || null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cau_hoi_goc.trim()) {
      setFormMessage({ type: 'error', text: 'Câu hỏi không được để trống.' });
      return;
    }

    setIsSubmitting(true);
    setFormMessage(null);

    try {
      const payload = {
        ma_linh_vuc: formData.ma_linh_vuc.trim() || 'KHAC',
        cau_hoi_goc: formData.cau_hoi_goc.trim(),
        cau_tra_loi_can_bo: formData.cau_tra_loi_can_bo.trim()
      };

      if (editingId) {
        const { error } = await supabase.from('faq').update(payload).eq('id', editingId);
        if (error) throw error;
        setFormMessage({ type: 'success', text: 'Cập nhật FAQ thành công!' });
      } else {
        const { error } = await supabase.from('faq').insert([payload]);
        if (error) throw error;
        setFormMessage({ type: 'success', text: 'Thêm FAQ thành công!' });
      }

      setTimeout(() => {
        setIsModalOpen(false);
        setFormMessage(null);
        handleFetchData();
      }, 1500);

    } catch (error: any) {
      console.error('Error saving FAQ:', error);
      setFormMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra khi lưu dữ liệu.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-6rem)]">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Quản lý Hỏi đáp (FAQ)</h2>
          <p className="text-sm text-slate-500">Danh sách câu hỏi thường gặp trong ngăn kéo</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={selectedLinhVuc}
              onChange={(e) => setSelectedLinhVuc(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white appearance-none cursor-pointer hover:border-slate-400 transition-colors"
            >
              <option value="all">Tất cả lĩnh vực</option>
              {uniqueLinhVuc.map((lv, idx) => (
                <option key={idx} value={lv}>{lv}</option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm câu hỏi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            Thêm mới
          </button>
          
          <button
            onClick={handleFetchData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
            ) : (
              <Download className="w-4 h-4 shrink-0" />
            )}
            Tải dữ liệu
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 m-4 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2 shrink-0">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
            <tr className="border-b border-slate-200 text-slate-500 text-sm">
              <th className="p-4 font-medium w-16 text-center">Sửa</th>
              <th className="p-4 font-medium w-40">Lĩnh vực</th>
              <th className="p-4 font-medium w-[400px]">Câu hỏi</th>
              <th className="p-4 font-medium">Câu trả lời</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500 bg-white">
                  {isLoading ? 'Đang tải dữ liệu...' : data.length === 0 ? 'Chưa có dữ liệu. Bấm "Tải dữ liệu" để đồng bộ.' : 'Không tìm thấy câu hỏi phù hợp.'}
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/80 transition-colors text-sm bg-white group">
                  <td className="p-4 align-top text-center">
                    <button 
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors inline-flex items-center justify-center shadow-sm"
                      title="Sửa FAQ"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="p-4 text-slate-600 align-top whitespace-normal break-words">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50/80 text-blue-700 text-[11px] font-medium border border-blue-100">
                      {item.ma_linh_vuc}
                    </span>
                  </td>
                  <td className="p-4 text-slate-800 font-semibold align-top whitespace-normal break-words leading-relaxed">{item.cau_hoi_goc}</td>
                  <td className="p-4 text-slate-600 align-top whitespace-pre-wrap break-words leading-relaxed">{item.cau_tra_loi_can_bo}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${editingId ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {editingId ? <Edit2 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {editingId ? 'Cập nhật Câu hỏi (FAQ)' : 'Thêm Câu hỏi mới'}
                  </h2>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto">
              {formMessage && (
                <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 border ${
                  formMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {formMessage.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  )}
                  <p className="font-medium text-sm">{formMessage.text}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Lĩnh vực <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="ma_linh_vuc"
                    value={formData.ma_linh_vuc}
                    onChange={handleFormChange}
                    required
                    placeholder="Ví dụ: HỘ TỊCH"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Câu hỏi <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="cau_hoi_goc"
                    value={formData.cau_hoi_goc}
                    onChange={handleFormChange}
                    required
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Câu trả lời <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="cau_tra_loi_can_bo"
                    value={formData.cau_tra_loi_can_bo}
                    onChange={handleFormChange}
                    required
                    rows={6}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex items-center gap-2 px-6 py-2.5 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {editingId ? 'Cập nhật' : 'Lưu FAQ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
