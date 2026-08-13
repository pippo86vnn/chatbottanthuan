import React, { useState, useEffect } from 'react';
import { Download, AlertCircle, Search, PlusCircle, X, Save, Loader2, CheckCircle2, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FormItem {
  id?: number;
  ma_thu_tuc: string;
  ten_bieu_mau: string;
  link_tai: string;
  dinh_dang: string;
}

const INITIAL_FORM_DATA: FormItem = {
  ma_thu_tuc: '',
  ten_bieu_mau: '',
  link_tai: '',
  dinh_dang: ''
};

export const FormsAdmin: React.FC = () => {
  const [data, setData] = useState<FormItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormItem>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleFetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: rawList, error } = await supabase.from('bieu_mau').select('*').not('ten_bieu_mau', 'is', null).order('id', { ascending: false });
      if (error) throw error;

      if (rawList && rawList.length > 0) {
        setData(rawList as FormItem[]);
      } else {
        setData([]);
      }
    } catch (err: any) {
      console.error("Lỗi khi tải Biểu mẫu:", err);
      setError(err.message || 'Lỗi khi tải dữ liệu Biểu mẫu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleFetchData();
  }, []);

  const filteredData = data.filter(item => 
    item.ten_bieu_mau?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ma_thu_tuc?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setFormData(INITIAL_FORM_DATA);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: FormItem) => {
    setFormData({
      ma_thu_tuc: item.ma_thu_tuc || '',
      ten_bieu_mau: item.ten_bieu_mau || '',
      link_tai: item.link_tai || '',
      dinh_dang: item.dinh_dang || ''
    });
    setEditingId(item.id || null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ten_bieu_mau.trim()) {
      setFormMessage({ type: 'error', text: 'Tên biểu mẫu không được để trống.' });
      return;
    }

    setIsSubmitting(true);
    setFormMessage(null);

    try {
      let payload: any = {
        ma_thu_tuc: formData.ma_thu_tuc.trim() || null,
        ten_bieu_mau: formData.ten_bieu_mau.trim(),
        link_tai: formData.link_tai.trim() || null,
        dinh_dang: formData.dinh_dang.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase.from('bieu_mau').update(payload).eq('id', editingId);
        if (error) throw error;
        setFormMessage({ type: 'success', text: 'Cập nhật thành công!' });
      } else {
        const { error } = await supabase.from('bieu_mau').insert([payload]);
        if (error) throw error;
        setFormMessage({ type: 'success', text: 'Thêm mới thành công!' });
      }

      setTimeout(() => {
        setIsModalOpen(false);
        setFormMessage(null);
        handleFetchData();
      }, 1500);

    } catch (error: any) {
      console.error('Error saving Form:', error);
      setFormMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra khi lưu dữ liệu.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-6rem)]">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Quản lý Biểu mẫu</h2>
          <p className="text-sm text-slate-500">Danh sách biểu mẫu tải về</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm biểu mẫu, thủ tục..."
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
              <th className="p-4 font-medium w-32">Mã TTHC</th>
              <th className="p-4 font-medium">Tên biểu mẫu</th>
              <th className="p-4 font-medium w-32">Định dạng</th>
              <th className="p-4 font-medium w-48">Link tải File</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 bg-white">
                  {isLoading ? 'Đang tải dữ liệu...' : data.length === 0 ? 'Chưa có dữ liệu. Bấm "Tải dữ liệu" để đồng bộ.' : 'Không tìm thấy biểu mẫu phù hợp.'}
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/80 transition-colors text-sm bg-white group">
                  <td className="p-4 align-top text-center">
                    <button 
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors inline-flex items-center justify-center shadow-sm"
                      title="Sửa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="p-4 font-medium text-slate-800 align-top">{item.ma_thu_tuc}</td>
                  <td className="p-4 text-slate-800 font-semibold align-top whitespace-normal break-words leading-relaxed">{item.ten_bieu_mau}</td>
                  <td className="p-4 text-slate-600 align-top">{item.dinh_dang}</td>
                  <td className="p-4 text-blue-600 align-top whitespace-normal break-words hover:underline text-xs">
                    {item.link_tai ? <a href={item.link_tai} target="_blank" rel="noreferrer">Download</a> : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${editingId ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {editingId ? <Edit2 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {editingId ? 'Cập nhật Biểu mẫu' : 'Thêm Biểu mẫu mới'}
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
                  <label className="text-sm font-semibold text-slate-700">Mã thủ tục liên kết (Tùy chọn)</label>
                  <input
                    type="text"
                    name="ma_thu_tuc"
                    value={formData.ma_thu_tuc}
                    onChange={handleFormChange}
                    placeholder="Ví dụ: 1.001.612"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Tên tài liệu / biểu mẫu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="ten_bieu_mau"
                    value={formData.ten_bieu_mau}
                    onChange={handleFormChange}
                    required
                    placeholder="Ví dụ: Tờ khai đăng ký kinh doanh"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Định dạng file</label>
                  <input
                    type="text"
                    name="dinh_dang"
                    value={formData.dinh_dang}
                    onChange={handleFormChange}
                    placeholder="Ví dụ: DOCX, PDF"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Link tải File</label>
                  <input
                    type="url"
                    name="link_tai"
                    value={formData.link_tai}
                    onChange={handleFormChange}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
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
                    {editingId ? 'Cập nhật' : 'Lưu Biểu mẫu'}
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
