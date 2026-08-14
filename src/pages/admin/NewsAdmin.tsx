import React, { useState, useEffect } from 'react';
import { Download, AlertCircle, Search, PlusCircle, X, Save, Loader2, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface NewsItem {
  id?: number;
  tieu_de: string;
  noi_dung: string;
  ngay_dang: string;
  hien_thi_ticker: boolean;
  link_ngoai: string;
}

interface NewsFormData {
  tieu_de: string;
  noi_dung: string;
  ngay_dang: string;
  hien_thi_ticker: boolean;
  link_ngoai: string;
}

const INITIAL_FORM_DATA: NewsFormData = {
  tieu_de: '',
  noi_dung: '',
  ngay_dang: new Date().toISOString().split('T')[0],
  hien_thi_ticker: true,
  link_ngoai: ''
};

export const NewsAdmin: React.FC = () => {
  const [data, setData] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<NewsFormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleFetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: rawList, error } = await supabase.from('tin_tuc').select('*').order('id', { ascending: false });
      if (error) throw error;

      if (rawList && rawList.length > 0) {
        const mappedData: NewsItem[] = rawList.map((item: any) => ({
          id: item.id,
          tieu_de: item.tieu_de || '',
          noi_dung: item.noi_dung || '',
          ngay_dang: item.ngay_dang || '',
          hien_thi_ticker: item.hien_thi_ticker !== false && item.hien_thi_ticker !== 'false' && item.hien_thi_ticker !== 0,
          link_ngoai: item.link_ngoai || ''
        }));
        setData(mappedData);
      } else {
        setData([]);
      }
    } catch (err: any) {
      console.error("Lỗi khi tải tin tức:", err);
      setError(err.message || 'Lỗi khi tải dữ liệu tin tức. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleFetchData();
  }, []);

  const filteredData = data.filter(item => 
    item.tieu_de?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.noi_dung?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const openAddModal = () => {
    setFormData(INITIAL_FORM_DATA);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: NewsItem) => {
    setFormData({
      tieu_de: item.tieu_de,
      noi_dung: item.noi_dung,
      ngay_dang: item.ngay_dang,
      hien_thi_ticker: item.hien_thi_ticker,
      link_ngoai: item.link_ngoai
    });
    setEditingId(item.id || null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tieu_de.trim()) {
      setFormMessage({ type: 'error', text: 'Tiêu đề không được để trống.' });
      return;
    }

    setIsSubmitting(true);
    setFormMessage(null);

    try {
      const payload = {
        tieu_de: formData.tieu_de.trim(),
        noi_dung: formData.noi_dung.trim() || null,
        ngay_dang: formData.ngay_dang.trim() || null,
        hien_thi_ticker: formData.hien_thi_ticker,
        link_ngoai: formData.link_ngoai.trim() || null
      };

      if (editingId) {
        const { error } = await supabase.from('tin_tuc').update(payload).eq('id', editingId);
        if (error) throw error;
        setFormMessage({ type: 'success', text: 'Cập nhật tin tức thành công!' });
      } else {
        const { error } = await supabase.from('tin_tuc').insert([payload]);
        if (error) throw error;
        setFormMessage({ type: 'success', text: 'Thêm tin tức thành công!' });
      }

      setTimeout(() => {
        setIsModalOpen(false);
        setFormMessage(null);
        handleFetchData();
      }, 1500);

    } catch (error: any) {
      console.error('Error saving news:', error);
      setFormMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra khi lưu dữ liệu.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tin tức này?')) return;
    
    try {
      const { error } = await supabase.from('tin_tuc').delete().eq('id', id);
      if (error) throw error;
      handleFetchData();
    } catch (error: any) {
      console.error('Error deleting news:', error);
      alert('Có lỗi xảy ra khi xóa: ' + error.message);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-6rem)]">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Quản lý Tin tức (Ticker)</h2>
          <p className="text-sm text-slate-500">Dải chữ chạy trên đầu trang</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm tin tức..."
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
              <th className="p-4 font-medium w-24 text-center">Thao tác</th>
              <th className="p-4 font-medium w-64">Tiêu đề</th>
              <th className="p-4 font-medium w-32">Ngày đăng</th>
              <th className="p-4 font-medium w-32">Trạng thái Ticker</th>
              <th className="p-4 font-medium w-48">Link liên kết</th>
              <th className="p-4 font-medium w-64">Nội dung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 bg-white">
                  {isLoading ? 'Đang tải dữ liệu...' : data.length === 0 ? 'Chưa có dữ liệu. Bấm "Tải dữ liệu" để đồng bộ.' : 'Không tìm thấy tin tức phù hợp.'}
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/80 transition-colors text-sm bg-white group">
                  <td className="p-4 align-top text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors inline-flex items-center justify-center shadow-sm"
                        title="Sửa tin tức"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => item.id && handleDelete(item.id)}
                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors inline-flex items-center justify-center shadow-sm"
                        title="Xóa tin tức"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-slate-800 font-semibold align-top whitespace-normal break-words leading-relaxed">{item.tieu_de}</td>
                  <td className="p-4 text-slate-600 align-top whitespace-nowrap">{item.ngay_dang}</td>
                  <td className="p-4 align-top">
                    {item.hien_thi_ticker ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">Đang bật</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">Đã tắt</span>
                    )}
                  </td>
                  <td className="p-4 text-blue-600 align-top whitespace-normal break-words hover:underline text-xs">
                    {item.link_ngoai ? <a href={item.link_ngoai} target="_blank" rel="noreferrer">{item.link_ngoai}</a> : ''}
                  </td>
                  <td className="p-4 text-slate-600 align-top whitespace-pre-wrap break-words leading-relaxed">{item.noi_dung}</td>
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
                    {editingId ? 'Cập nhật Tin tức' : 'Thêm Tin tức mới'}
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
                    Tiêu đề <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="tieu_de"
                    value={formData.tieu_de}
                    onChange={handleFormChange}
                    required
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Ngày đăng</label>
                    <input
                      type="date"
                      name="ngay_dang"
                      value={formData.ngay_dang}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  <div className="flex items-center h-full pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="hien_thi_ticker"
                        checked={formData.hien_thi_ticker}
                        onChange={handleFormChange}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Hiển thị trên Ticker (dòng chữ chạy)</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Link liên kết (URL)</label>
                  <input
                    type="url"
                    name="link_ngoai"
                    value={formData.link_ngoai}
                    onChange={handleFormChange}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Nội dung chi tiết (Tùy chọn)</label>
                  <textarea
                    name="noi_dung"
                    value={formData.noi_dung}
                    onChange={handleFormChange}
                    rows={4}
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
                    {editingId ? 'Cập nhật' : 'Lưu Tin tức'}
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
