import React, { useState, useEffect } from 'react';
import { Download, AlertCircle, Search, PlusCircle, X, Save, Loader2, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface VideoItem {
  id?: number;
  ma_thu_tuc: string;
  link_video: string;
  tieu_de_video: string;
}

const INITIAL_VIDEO_DATA: VideoItem = {
  ma_thu_tuc: '',
  link_video: '',
  tieu_de_video: ''
};

export const VideosAdmin: React.FC = () => {
  const [data, setData] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<VideoItem>(INITIAL_VIDEO_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleFetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: rawList, error } = await supabase.from('bieu_mau').select('*').not('tieu_de_video', 'is', null).order('id', { ascending: false });
      if (error) throw error;

      if (rawList && rawList.length > 0) {
        setData(rawList as VideoItem[]);
      } else {
        setData([]);
      }
    } catch (err: any) {
      console.error("Lỗi khi tải Video:", err);
      setError(err.message || 'Lỗi khi tải dữ liệu Video. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleFetchData();
  }, []);

  const filteredData = data.filter(item => 
    item.tieu_de_video?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ma_thu_tuc?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setFormData(INITIAL_VIDEO_DATA);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: VideoItem) => {
    setFormData({
      ma_thu_tuc: item.ma_thu_tuc || '',
      link_video: item.link_video || '',
      tieu_de_video: item.tieu_de_video || ''
    });
    setEditingId(item.id || null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tieu_de_video.trim() || !formData.link_video.trim()) {
      setFormMessage({ type: 'error', text: 'Tiêu đề và Link Video không được để trống.' });
      return;
    }

    setIsSubmitting(true);
    setFormMessage(null);

    try {
      let payload: any = {
        ma_thu_tuc: formData.ma_thu_tuc.trim() || null,
        link_video: formData.link_video.trim(),
        tieu_de_video: formData.tieu_de_video.trim(),
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
      console.error('Error saving Video:', error);
      setFormMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra khi lưu dữ liệu.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa video này?')) return;
    
    try {
      const { error } = await supabase.from('bieu_mau').delete().eq('id', id);
      if (error) throw error;
      handleFetchData();
    } catch (error: any) {
      console.error('Error deleting Video:', error);
      alert('Có lỗi xảy ra khi xóa: ' + error.message);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-6rem)]">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Quản lý Video Hướng dẫn</h2>
          <p className="text-sm text-slate-500">Danh sách video hướng dẫn thủ tục</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm video, thủ tục..."
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
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
            <tr className="border-b border-slate-200 text-slate-500 text-sm">
              <th className="p-4 font-medium w-24 text-center">Thao tác</th>
              <th className="p-4 font-medium w-32">Mã TTHC</th>
              <th className="p-4 font-medium">Tiêu đề Video</th>
              <th className="p-4 font-medium w-64">Link Video</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500 bg-white">
                  {isLoading ? 'Đang tải dữ liệu...' : data.length === 0 ? 'Chưa có dữ liệu. Bấm "Tải dữ liệu" để đồng bộ.' : 'Không tìm thấy video phù hợp.'}
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
                        title="Sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => item.id && handleDelete(item.id)}
                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors inline-flex items-center justify-center shadow-sm"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-slate-800 align-top">{item.ma_thu_tuc}</td>
                  <td className="p-4 text-amber-700 font-semibold align-top whitespace-normal break-words leading-relaxed">{item.tieu_de_video}</td>
                  <td className="p-4 text-blue-600 align-top whitespace-normal break-words hover:underline text-xs">
                    {item.link_video ? <a href={item.link_video} target="_blank" rel="noreferrer">{item.link_video}</a> : ''}
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
                    {editingId ? 'Cập nhật Video' : 'Thêm Video mới'}
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
                    Tiêu đề Video <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="tieu_de_video"
                    value={formData.tieu_de_video}
                    onChange={handleFormChange}
                    required
                    placeholder="Ví dụ: Hướng dẫn nộp hồ sơ trực tuyến..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Link Video Youtube <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    name="link_video"
                    value={formData.link_video}
                    onChange={handleFormChange}
                    required
                    placeholder="https://youtube.com/..."
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
                    {editingId ? 'Cập nhật' : 'Lưu Video'}
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
