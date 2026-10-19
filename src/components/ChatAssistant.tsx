import React, { useState, useRef, useEffect, useCallback } from 'react';
import Markdown from 'react-markdown';
import { Send, Camera, User, Image as ImageIcon, X, FileText, ThumbsUp, ThumbsDown, Mic, Headset } from 'lucide-react';
import { ChatMessage } from '../types';
import { getSessionId, logChatMessage, submitRating } from '../config';
import { supabase } from '../lib/supabase';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { LiveVoiceModal } from './LiveVoiceModal';
const TypewriterText: React.FC<{
  content: string;
  isActive: boolean;
  onUpdate: () => void;
  onComplete?: () => void;
}> = ({ content, isActive, onUpdate, onComplete }) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setDisplayedContent(content);
      setCurrentIndex(content.length);
      if (onComplete) onComplete();
      return;
    }

    if (currentIndex < content.length) {
      const timeout = setTimeout(() => {
        const chunkSize = 4; // Tối ưu: Gõ 4 ký tự mỗi nhịp để giảm 75% số lần render Markdown
        setDisplayedContent(prev => prev + content.slice(currentIndex, currentIndex + chunkSize));
        setCurrentIndex(prev => prev + chunkSize);
      }, 25);
      return () => clearTimeout(timeout);
    } else if (currentIndex === content.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, content, isActive, onComplete]);

  useEffect(() => {
    if (isActive && currentIndex % 3 === 0) {
      onUpdate();
    }
  }, [displayedContent, isActive, currentIndex, onUpdate]);

  return (
    <div className="markdown-body">
      <Markdown
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-600 underline font-medium" />
          ),
          p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
          ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2 last:mb-0 space-y-1" />,
          ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2 last:mb-0 space-y-1" />,
          li: ({ node, ...props }) => <li {...props} />
        }}
      >
        {displayedContent}
      </Markdown>
    </div>
  );
};

export const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Xin chào Quý vị! Tôi là Trợ lý AI Hành chính công Phường Tân Mỹ. Tôi sẵn sàng hỗ trợ Quý vị tra cứu thủ tục, quy định và hướng dẫn hồ sơ. Quý vị cần hỗ trợ thông tin gì?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [activeTypingId, setActiveTypingId] = useState<string | null>('1');
  const [isLiveVoiceModalOpen, setIsLiveVoiceModalOpen] = useState(false);

  const [ratings, setRatings] = useState<Record<string, 'Like' | 'Dislike'>>({});

  const sessionId = useRef<string>(getSessionId());
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isRecording,
    isProcessing,
    isPlaying,
    transcript,
    finalTranscript,
    startRecording,
    playWelcomeMessage,
    playAudio
  } = useVoiceChat();

  const [isWelcomed, setIsWelcomed] = useState(false);

  const handleInteractionToUnlockAudio = () => {
    if (!isWelcomed) {
      // playWelcomeMessage(); // Uncomment to enable welcome voice message
      setIsWelcomed(true);
    }
  };

  // Cập nhật text realtime khi đang thu âm
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Tự động gửi khi kết thúc thu âm (khi có finalTranscript)
  useEffect(() => {
    if (finalTranscript) {
      handleSend(finalTranscript);
    }
  }, [finalTranscript]);

  const scrollToBottom = useCallback((smooth = true) => {
    if (chatContainerRef.current) {
      requestAnimationFrame(() => {
        if (chatContainerRef.current) {
          const { scrollHeight } = chatContainerRef.current;
          chatContainerRef.current.scrollTo({
            top: scrollHeight,
            behavior: smooth === true ? 'smooth' : 'auto'
          });
        }
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      setAttachedImage({
        data: base64String,
        mimeType: file.type || 'image/jpeg',
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if ((!query.trim() && !attachedImage) || isLoading) return;

    setActiveTypingId(null);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: attachedImage ? { data: attachedImage.data, mimeType: attachedImage.mimeType } : undefined
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    const currentImage = attachedImage;
    setAttachedImage(null);
    setIsLoading(true);

    // --- Lấy context thủ tục liên quan (1-2 thủ tục) ---
    let context = 'Không tìm thấy thủ tục phù hợp.';
    try {
      // Vì số lượng thủ tục cấp phường thường < 100, lấy tất cả và lọc bằng JS sẽ chính xác hơn dùng ilike
      const { data, error } = await supabase
        .from('thu_tuc')
        .select('*');

      if (data && data.length > 0) {
        // Tách câu hỏi thành các từ khóa dài > 2 ký tự
        const keywords = query.toLowerCase().split(' ').filter((w) => w.trim().length > 2);

        // Chấm điểm từng thủ tục dựa trên số lượng từ khóa trùng khớp
        const scoredData = data.map((item: any) => {
          let score = 0;
          const title = (item.ten_thu_tuc || '').toLowerCase();
          const desc = (item.mo_ta_ngan || '').toLowerCase();
          const keywords_db = (item.tu_khoa_tim_kiem || '').toLowerCase();

          keywords.forEach((kw) => {
            if (title.includes(kw)) score += 3;
            if (keywords_db.includes(kw)) score += 2;
            if (desc.includes(kw)) score += 1;
          });

          return { item, score };
        });

        // Lọc các thủ tục có điểm > 0, sắp xếp giảm dần và lấy 5 kết quả tốt nhất
        const bestMatches = scoredData
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((x) => x.item);

        if (bestMatches.length > 0) {
          // Lấy thêm thông tin biểu mẫu và video liên quan
          const maThuTucList = bestMatches.map((m: any) => m.ma_thu_tuc).filter(Boolean);
          let bieuMauData: any[] = [];

          if (maThuTucList.length > 0) {
            const { data: bmData } = await supabase
              .from('bieu_mau')
              .select('*')
              .in('ma_thu_tuc', maThuTucList);

            if (bmData) bieuMauData = bmData;
          }

          context = bestMatches.map((item: any) => {
            const maThuTuc = item.ma_thu_tuc || '';
            const ten = item.ten_thu_tuc || '';
            const moTa = item.mo_ta_ngan || '';
            const cachThuc = item.cach_thuc_nop || 'Chưa có thông tin';
            const thoiGian = item.thoi_gian_xu_ly || '';
            const lePhi = item.le_phi || '';
            const canCu = item.can_cu_phap_ly || 'Chưa có thông tin';

            // Tìm biểu mẫu liên quan
            const relatedForms = bieuMauData.filter(bm => bm.ma_thu_tuc === maThuTuc && bm.ten_bieu_mau);
            const relatedVideos = bieuMauData.filter(bm => bm.ma_thu_tuc === maThuTuc && bm.tieu_de_video);

            let contextStr = `Thủ tục: ${ten}\nMô tả: ${moTa}\nHồ sơ và cách thức nộp: ${cachThuc}\nThời gian xử lý: ${thoiGian}\nLệ phí: ${lePhi}\nCăn cứ pháp lý: ${canCu}`;

            if (relatedForms.length > 0) {
              contextStr += `\nBiểu mẫu đính kèm:\n` + relatedForms.map(bm => `- ${bm.ten_bieu_mau}: ${bm.link_tai || 'Chưa có link'}`).join('\n');
            }
            if (relatedVideos.length > 0) {
              contextStr += `\nVideo hướng dẫn:\n` + relatedVideos.map(bm => `- ${bm.tieu_de_video}: ${bm.link_video || 'Chưa có link'}`).join('\n');
            }

            return contextStr;
          }).join('\n---\n');
        }
      }
    } catch (err) {
      console.warn('Không thể lấy dữ liệu tìm kiếm thủ tục, dùng context rỗng:', err);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content
          })),
          context: context,
          image: currentImage ? { data: currentImage.data, mimeType: currentImage.mimeType } : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi kết nối trợ lý AI.');
      }

      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        userQuestion: query
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setActiveTypingId(assistantMessageId);

      // --- Phát âm thanh nếu Server trả về audioBase64 ---
      if (data.audioBase64) {
        playAudio(data.audioBase64);
      }

      // Ghi nhật ký hội thoại
      try {
        await logChatMessage({ cauHoi: query, aiTraLoi: data.reply });
      } catch (e) {
        console.error('Error saving chat log:', e);
      }
    } catch (err: any) {
      const errorMessageId = (Date.now() + 1).toString();
      const errorMessage: ChatMessage = {
        id: errorMessageId,
        role: 'assistant',
        content: `Xin lỗi, hệ thống AI đang gặp sự cố kết nối: ${err.message}. Vui lòng liên hệ trực tiếp Bộ phận Một cửa Phường Tân Mỹ (028.38123456) để được hỗ trợ ngay.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMessage]);
      setActiveTypingId(errorMessageId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRate = async (messageId: string, userQuestion: string, rating: 'Like' | 'Dislike') => {
    setRatings((prev) => ({ ...prev, [messageId]: rating }));
    await submitRating({ cauHoi: userQuestion, danhGia: rating });
  };

  return (
    <div className="w-full max-w-full px-1 sm:px-3 py-2 sm:py-6" onClickCapture={handleInteractionToUnlockAudio}>
      <div className="bg-white rounded-2xl shadow-xl border border-admin-100 overflow-hidden flex flex-col h-[82vh] sm:h-[75vh]">

        {/* Chat Header Banner */}
        <div className="bg-gradient-to-r from-admin-900 to-admin-800 px-3 sm:px-6 py-2.5 sm:py-4 text-white flex items-center justify-between border-b border-admin-800 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 w-full">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white text-admin-950 flex items-center justify-center font-bold shadow-md p-1 shrink-0">
              <img src="https://i.postimg.cc/21pt1tmH/LOGO-TRUNG-TAM.png" alt="LOGO-TRUNG-TAM" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-sm sm:text-base md:text-lg sm:flex items-center gap-2 leading-tight">
                <span>Trợ lý AI hành chính công Tân Mỹ</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 w-fit inline-block ml-1.5 sm:ml-0">
                  Trực tuyến 24/7
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-admin-200 truncate mt-0.5 sm:mt-1">
                Tra cứu thủ tục hành chính, quy định pháp luật và tư vấn hồ sơ dựa trên dữ liệu của Trung tâm phục vụ hành chính công Phường Tân Mỹ
              </p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div ref={chatContainerRef} className="chat-container flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 bg-slate-50/50 relative">
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: "url('https://i.postimg.cc/XYX6zMP6/LOGO-PHUONG.png')",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "264px",
              opacity: 0.5
            }}
          />
          <div className="relative z-10 space-y-3 sm:space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 sm:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden ${isUser
                        ? 'bg-admin-700 text-white'
                        : 'bg-white text-admin-900 border border-admin-800'
                      }`}
                  >
                    {isUser ? <User className="w-4 h-4 sm:w-5 sm:h-5" /> : <img src="https://i.postimg.cc/21pt1tmH/LOGO-TRUNG-TAM.png" alt="Bot" className="w-full h-full object-contain p-0.5 sm:p-1" />}
                  </div>

                  <div className={`max-w-[90%] sm:max-w-[85%] md:max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 text-xs sm:text-sm text-slate-500">
                      <span className="font-medium text-slate-700">
                        {isUser ? 'Bạn' : 'Trợ lý AI hành chính công Tân Mỹ'}
                      </span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-3.5 sm:p-5 rounded-2xl text-base sm:text-lg leading-relaxed shadow-sm ${isUser
                          ? 'bg-slate-200 text-slate-900 rounded-tr-none font-normal'
                          : 'bg-admin-900 text-white rounded-tl-none font-normal'
                        }`}
                    >
                      {msg.image && (
                        <div className="mb-2.5 rounded-lg overflow-hidden border border-admin-700 bg-admin-950/50 p-1">
                          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-admin-200 mb-1 px-1">
                            <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                            <span>Đã đính kèm giấy tờ / hồ sơ</span>
                          </div>
                          <img
                            src={`data:${msg.image.mimeType};base64,${msg.image.data}`}
                            alt="Hồ sơ đính kèm"
                            className="max-h-40 sm:max-h-48 rounded object-contain mx-auto"
                          />
                        </div>
                      )}
                      <div className="markdown-body">
                        {!isUser && msg.id === activeTypingId ? (
                          <TypewriterText
                            content={msg.content}
                            isActive={true}
                            onUpdate={() => scrollToBottom(false)}
                            onComplete={() => setActiveTypingId(null)}
                          />
                        ) : (
                          <Markdown
                            components={{
                              a: ({ node, ...props }) => (
                                <a {...props} target="_blank" rel="noopener noreferrer" className={`${isUser ? 'text-blue-600 hover:text-blue-800' : 'text-amber-500 hover:text-amber-600'} underline font-medium break-all`} />
                              ),
                              p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                              ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2 last:mb-0 space-y-1" />,
                              ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2 last:mb-0 space-y-1" />,
                              li: ({ node, ...props }) => <li {...props} />
                            }}
                          >
                            {msg.content}
                          </Markdown>
                        )}
                      </div>


                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white text-admin-900 flex items-center justify-center shrink-0 shadow-sm border border-admin-800 p-0.5 sm:p-1">
                  <img src="https://i.postimg.cc/21pt1tmH/LOGO-TRUNG-TAM.png" alt="Bot" className="w-full h-full object-contain animate-pulse" />
                </div>
                <div className="bg-admin-900 text-white p-3 sm:p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 sm:gap-3">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]"></div>
                  <span className="text-[11px] sm:text-xs text-admin-200 italic ml-0.5">Trợ lý AI đang tra cứu cơ sở dữ liệu...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input & Image Attachment Area */}
        <div className="chat-input-wrapper p-2.5 sm:p-4 bg-white border-t border-slate-200 shrink-0">
          {attachedImage && (
            <div className="mb-2 flex items-center justify-between bg-admin-50 border border-admin-200 p-1.5 sm:p-2 rounded-xl">
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-admin-900 font-medium truncate">
                <FileText className="w-3.5 h-3.5 text-admin-700 shrink-0" />
                <span className="truncate">Đã chọn ảnh: <span className="font-bold">{attachedImage.name}</span></span>
              </div>
              <button
                onClick={() => setAttachedImage(null)}
                className="text-slate-500 hover:text-red-600 p-1 shrink-0"
                title="Xóa ảnh đính kèm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 sm:p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-admin-900 rounded-xl transition flex items-center justify-center border border-slate-200 shrink-0"
              title="Chụp hoặc đính kèm ảnh hồ sơ / CCCD / giấy tờ"
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-admin-800" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isRecording ? "Hệ thống đang lắng nghe..." : "Nhập câu hỏi thủ tục hành chính (khai sinh, kết hôn...)..."}
              disabled={isRecording || isProcessing || isPlaying}
              className="flex-1 min-w-0 bg-slate-100 border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-admin-600 focus:bg-white transition disabled:opacity-50"
            />

            <button
              type="button"
              onClick={startRecording}
              disabled={isPlaying || isProcessing || isRecording}
              title={isRecording ? "Đang thu âm" : "Gửi bằng giọng nói"}
              className={`p-2.5 sm:p-3 rounded-xl transition flex items-center justify-center shrink-0 border
                ${isRecording
                  ? 'bg-red-500 text-white border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.7)]'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-admin-900 hover:bg-slate-200'
                }
                ${(isPlaying || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Mic className={`w-4 h-4 sm:w-5 sm:h-5 ${isRecording ? 'animate-bounce' : ''}`} />
            </button>

            {/* Nút Live Voice (Đã mở) */}
            <button
              type="button"
              onClick={() => setIsLiveVoiceModalOpen(true)}
              className="p-2.5 sm:p-3 rounded-xl transition flex items-center justify-center shrink-0 border bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700"
              title="Trò chuyện trực tiếp với AI"
            >
              <Headset className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && !attachedImage) || isLoading || isRecording || isProcessing || isPlaying}
              className="bg-admin-900 hover:bg-admin-800 disabled:opacity-50 text-white px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition flex items-center gap-1.5 shadow-md shrink-0"
            >
              <span className="hidden sm:inline">Gửi hỏi</span>
              <span className="sm:hidden">Gửi</span>
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
          <div className="hidden sm:flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500">
            <span>Mẹo: Bạn có thể đính kèm ảnh tờ khai hoặc hồ sơ để trợ lý hỗ trợ kiểm tra.</span>
            <span className="text-admin-900 font-medium text-right leading-tight">Trợ lý AI hành chính công<br />Tân Mỹ</span>
          </div>
        </div>

      </div>
      <LiveVoiceModal isOpen={isLiveVoiceModalOpen} onClose={() => setIsLiveVoiceModalOpen(false)} />
    </div>
  );
};