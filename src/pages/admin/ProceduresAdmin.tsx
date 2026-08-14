import React, { useState, useEffect } from 'react';
import { Download, AlertCircle, Search, PlusCircle, X, Save, Loader2, CheckCircle2, Filter, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Procedure {
  id?: number;
  maThuTuc: string;
  tenThuTuc: string;
  tenThuTucChuan?: string;
  linhVuc: string;
  thoiGian: string;
  lePhi: string;
  tuKhoaTimKiem?: string;
  hoSo?: string;
  canCuPhapLy?: string;
  moTaNgan?: string;
}

interface ProcedureFormData {
  ma_thu_tuc: string;
  ten_thu_tuc: string;
  ten_thu_tuc_chuan: string;
  linh_vuc: string;
  thoi_gian_xu_ly: string;
  le_phi: string;
  tu_khoa_tim_kiem: string;
  cach_thuc_nop: string;
  can_cu_phap_ly: string;
  mo_ta_ngan: string;
}

const INITIAL_FORM_DATA: ProcedureFormData = {
  ma_thu_tuc: '',
  ten_thu_tuc: '',
  ten_thu_tuc_chuan: '',
  linh_vuc: '',
  thoi_gian_xu_ly: '',
  le_phi: '',
  tu_khoa_tim_kiem: '',
  cach_thuc_nop: '',
  can_cu_phap_ly: '',
  mo_ta_ngan: ''
};

export const ProceduresAdmin: React.FC = () => {
  const [data, setData] = useState<Procedure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLinhVuc, setSelectedLinhVuc] = useState<string>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProcedureFormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleFetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: rawList, error } = await supabase.from('thu_tuc').select('*').order('id', { ascending: false });
      if (error) throw error;

      if (rawList && rawList.length > 0) {
        const mappedData: Procedure[] = rawList.map((item: any) => ({
          id: item.id,
          maThuTuc: item.ma_thu_tuc || 'N/A',
          tenThuTuc: item.ten_thu_tuc || '',
          tenThuTucChuan: item.ten_thu_tuc_chuan || '',
          linhVuc: item.linh_vuc || 'Khác',
          thoiGian: item.thoi_gian_xu_ly || 'N/A',
          lePhi: item.le_phi || 'Miễn phí',
          tuKhoaTimKiem: item.tu_khoa_tim_kiem || '',
          hoSo: item.cach_thuc_nop || '',
          canCuPhapLy: item.can_cu_phap_ly || '',
          moTaNgan: item.mo_ta_ngan || ''
        }));
        setData(mappedData);
      } else {
        setData([]);
      }
    } catch (err: any) {
      console.error("Lỗi khi tải thủ tục:", err);
      setError(err.message || 'Lỗi khi tải dữ liệu thủ tục. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleFetchData();
  }, []);

  const uniqueLinhVuc = Array.from(new Set(data.map(item => item.linhVuc).filter(Boolean)));

  const filteredData = data.filter(item => {
    const matchesSearch = item.tenThuTuc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.maThuTuc?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLinhVuc = selectedLinhVuc === 'all' || item.linhVuc === selectedLinhVuc;
    return matchesSearch && matchesLinhVuc;
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setFormData(INITIAL_FORM_DATA);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Procedure) => {
    setFormData({
      ma_thu_tuc: item.maThuTuc !== 'N/A' ? item.maThuTuc : '',
      ten_thu_tuc: item.tenThuTuc,
      ten_thu_tuc_chuan: item.tenThuTucChuan || '',
      linh_vuc: item.linhVuc !== 'Khác' ? item.linhVuc : '',
      thoi_gian_xu_ly: item.thoiGian !== 'N/A' ? item.thoiGian : '',
      le_phi: item.lePhi !== 'Miễn phí' ? item.lePhi : '',
      tu_khoa_tim_kiem: item.tuKhoaTimKiem || '',
      cach_thuc_nop: item.hoSo || '',
      can_cu_phap_ly: item.canCuPhapLy || '',
      mo_ta_ngan: item.moTaNgan || ''
    });
    setEditingId(item.id || null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ten_thu_tuc.trim()) {
      setFormMessage({ type: 'error', text: 'Tên thủ tục không được để trống.' });
      return;
    }

    setIsSubmitting(true);
    setFormMessage(null);

    try {
      const payload = {
        ma_thu_tuc: formData.ma_thu_tuc.trim() || null,
        ten_thu_tuc: formData.ten_thu_tuc.trim(),
        ten_thu_tuc_chuan: formData.ten_thu_tuc_chuan.trim() || formData.ten_thu_tuc.trim(),
        linh_vuc: formData.linh_vuc.trim() || 'Khác',
        thoi_gian_xu_ly: formData.thoi_gian_xu_ly.trim() || null,
        le_phi: formData.le_phi.trim() || null,
        tu_khoa_tim_kiem: formData.tu_khoa_tim_kiem.trim() || null,
        cach_thuc_nop: formData.cach_thuc_nop.trim() || null,
        can_cu_phap_ly: formData.can_cu_phap_ly.trim() || null,
        mo_ta_ngan: formData.mo_ta_ngan.trim() || null
      };

      if (editingId) {
        const { error } = await supabase.from('thu_tuc').update(payload).eq('id', editingId);
        if (error) throw error;
        setFormMessage({ type: 'success', text: 'Cập nhật thủ tục thành công!' });
      } else {
        const { error } = await supabase.from('thu_tuc').insert([payload]);
        if (error) throw error;
        setFormMessage({ type: 'success', text: 'Thêm thủ tục thành công!' });
      }

      setTimeout(() => {
        setIsModalOpen(false);
        setFormMessage(null);
        handleFetchData();
      }, 1500);

    } catch (error: any) {
      console.error('Error saving procedure:', error);
      setFormMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra khi lưu dữ liệu.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thủ tục này?')) return;
    
    try {
      const { error } = await supabase.from('thu_tuc').delete().eq('id', id);
      if (error) throw error;
      handleFetchData();
    } catch (error: any) {
      console.error('Error deleting procedure:', error);
      alert('Có lỗi xảy ra khi xóa: ' + error.message);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-6rem)]">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Quản lý Thủ tục (RAG Data)</h2>
          <p className="text-sm text-slate-500">Nguồn tri thức cho Chatbot tư vấn</p>
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
              placeholder="Tìm thủ tục..."
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
        <table className="w-full text-left border-collapse min-w-[1400px]">
          <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
            <tr className="border-b border-slate-200 text-slate-500 text-sm">
              <th className="p-4 font-medium w-24 text-center">Thao tác</th>
              <th className="p-4 font-medium w-24 whitespace-nowrap">Mã TTHC</th>
              <th className="p-4 font-medium w-40">Lĩnh vực</th>
              <th className="p-4 font-medium w-64">Tên thủ tục</th>
              <th className="p-4 font-medium w-40">Thời gian xử lý</th>
              <th className="p-4 font-medium w-40">Lệ phí</th>
              <th className="p-4 font-medium w-48">Từ khóa tìm kiếm</th>
              <th className="p-4 font-medium w-64">Hồ sơ / Cách nộp</th>
              <th className="p-4 font-medium w-48">Căn cứ pháp lý</th>
              <th className="p-4 font-medium w-48">Mô tả ngắn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-500 bg-white">
                  {isLoading ? 'Đang tải dữ liệu...' : data.length === 0 ? 'Chưa có dữ liệu. Bấm "Tải dữ liệu" để đồng bộ.' : 'Không tìm thấy thủ tục phù hợp.'}
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
                        title="Sửa thủ tục"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => item.id && handleDelete(item.id)}
                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors inline-flex items-center justify-center shadow-sm"
                        title="Xóa thủ tục"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-slate-800 align-top whitespace-nowrap">{item.maThuTuc}</td>
                  <td className="p-4 text-slate-600 align-top whitespace-normal break-words">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50/80 text-blue-700 text-[11px] font-medium border border-blue-100">
                      {item.linhVuc}
                    </span>
                  </td>
                  <td className="p-4 text-slate-800 font-semibold align-top whitespace-normal break-words leading-relaxed">{item.tenThuTuc}</td>
                  <td className="p-4 text-slate-600 align-top whitespace-normal break-words leading-relaxed">{item.thoiGian}</td>
                  <td className="p-4 text-amber-700 font-medium align-top whitespace-normal break-words leading-relaxed">{item.lePhi}</td>
                  <td className="p-4 text-slate-500 text-xs align-top whitespace-normal break-words leading-relaxed">{item.tuKhoaTimKiem}</td>
                  <td className="p-4 text-slate-600 align-top whitespace-pre-wrap break-words text-xs leading-relaxed">{item.hoSo}</td>
                  <td className="p-4 text-slate-500 text-xs align-top whitespace-normal break-words leading-relaxed">{item.canCuPhapLy}</td>
                  <td className="p-4 text-slate-600 text-xs align-top whitespace-normal break-words leading-relaxed">{item.moTaNgan}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm/Sửa Thủ Tục */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${editingId ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {editingId ? <Edit2 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {editingId ? 'Cập nhật Thủ tục' : 'Thêm Thủ tục mới'}
                  </h2>
                  <p className="text-sm text-slate-500">Nhập thông tin chi tiết vào cơ sở dữ liệu.</p>
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

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Tên thủ tục (Bắt buộc) */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      Tên thủ tục <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="ten_thu_tuc"
                      value={formData.ten_thu_tuc}
                      onChange={handleFormChange}
                      required
                      rows={2}
                      placeholder="Ví dụ: Đăng ký thành lập hộ kinh doanh"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow text-sm"
                    />
                  </div>

                  {/* Mã thủ tục */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Mã thủ tục</label>
                    <input
                      type="text"
                      name="ma_thu_tuc"
                      value={formData.ma_thu_tuc}
                      onChange={handleFormChange}
                      placeholder="Ví dụ: 1.001.612"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm"
                    />
                  </div>

                  {/* Lĩnh vực */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Lĩnh vực</label>
                    <input
                      type="text"
                      name="linh_vuc"
                      value={formData.linh_vuc}
                      onChange={handleFormChange}
                      placeholder="Ví dụ: Kinh doanh & Thuế"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm"
                    />
                  </div>

                  {/* Tên thủ tục chuẩn */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Tên thủ tục chuẩn (nếu khác tên thường gọi)</label>
                    <input
                      type="text"
                      name="ten_thu_tuc_chuan"
                      value={formData.ten_thu_tuc_chuan}
                      onChange={handleFormChange}
                      placeholder="Nếu bỏ trống sẽ tự động lấy theo Tên thủ tục ở trên"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm"
                    />
                  </div>

                  {/* Thời gian xử lý */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Thời gian xử lý</label>
                    <input
                      type="text"
                      name="thoi_gian_xu_ly"
                      value={formData.thoi_gian_xu_ly}
                      onChange={handleFormChange}
                      placeholder="Ví dụ: 3 Ngày làm việc"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm"
                    />
                  </div>

                  {/* Lệ phí */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Lệ phí</label>
                    <input
                      type="text"
                      name="le_phi"
                      value={formData.le_phi}
                      onChange={handleFormChange}
                      placeholder="Ví dụ: 100.000 VNĐ hoặc Theo quy định"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm"
                    />
                  </div>

                  {/* Từ khóa tìm kiếm */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Từ khóa tìm kiếm (SEO & Bot)</label>
                    <input
                      type="text"
                      name="tu_khoa_tim_kiem"
                      value={formData.tu_khoa_tim_kiem}
                      onChange={handleFormChange}
                      placeholder="Ví dụ: thành lập hộ kinh doanh, mở cửa hàng, giấy phép (cách nhau bằng dấu phẩy)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm"
                    />
                  </div>

                  {/* Cách thức nộp */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Hồ sơ / Cách thức nộp</label>
                    <textarea
                      name="cach_thuc_nop"
                      value={formData.cach_thuc_nop}
                      onChange={handleFormChange}
                      rows={3}
                      placeholder="Liệt kê các giấy tờ cần thiết hoặc cách nộp hồ sơ..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm"
                    />
                  </div>

                  {/* Căn cứ pháp lý */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Căn cứ pháp lý</label>
                    <textarea
                      name="can_cu_phap_ly"
                      value={formData.can_cu_phap_ly}
                      onChange={handleFormChange}
                      rows={2}
                      placeholder="Ví dụ: Luật Doanh nghiệp 2020, Nghị định số 01/2021/NĐ-CP..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm"
                    />
                  </div>
                  
                  {/* Mô tả ngắn */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Mô tả ngắn</label>
                    <textarea
                      name="mo_ta_ngan"
                      value={formData.mo_ta_ngan}
                      onChange={handleFormChange}
                      rows={2}
                      placeholder="Tóm tắt ngắn gọn về thủ tục này..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm"
                    />
                  </div>
                </div>

                <div className="pt-6 flex justify-end gap-3 sticky bottom-0 bg-white py-4 border-t border-slate-100">
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
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {editingId ? 'Cập nhật' : 'Lưu Thủ tục'}
                      </>
                    )}
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
