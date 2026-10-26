import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface LiveVoiceStatus {
  status: string;
  colorClass: string;
}

export function useLiveVoice() {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<LiveVoiceStatus>({ status: 'Đã ngắt kết nối', colorClass: 'text-slate-500' });
  const [latency, setLatency] = useState<number | null>(null);
  const [talkTime, setTalkTime] = useState<number>(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  const turnStartTimeRef = useRef<number>(0);
  const isSetupCompleteRef = useRef<boolean>(false);
  const nextPlayTimeRef = useRef<number>(0);
  const thuTucDataRef = useRef<any[]>([]);
  const talkTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  const updateStatus = (text: string, colorClass: string) => {
    setStatus({ status: text, colorClass });
  };

  const playAudioChunk = (base64Data: string) => {
    if (!audioContextRef.current) return;
    const audioContext = audioContextRef.current;
    
    try {
      const binary = window.atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const pcm16 = new Int16Array(bytes.buffer);
      
      const buffer = audioContext.createBuffer(1, pcm16.length, 24000); // 24kHz for Gemini audio out
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < pcm16.length; i++) channelData[i] = pcm16[i] / 32768;
      
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      
      if (nextPlayTimeRef.current < audioContext.currentTime) {
        nextPlayTimeRef.current = audioContext.currentTime + 0.05;
      }
      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += buffer.duration;
    } catch (err) {
      console.error('Error playing audio chunk', err);
    }
  };

  const startCall = async () => {
    try {
      updateStatus("Đang tải dữ liệu...", "text-amber-500");
      
      // Load Supabase data
      if (thuTucDataRef.current.length === 0) {
        const { data, error } = await supabase.from('thu_tuc').select('*');
        if (error) throw error;
        thuTucDataRef.current = data || [];
      }

      updateStatus("Đang mở Micro...", "text-amber-500");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
      mediaStreamRef.current = stream;
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      // Using deprecated ScriptProcessorNode because it's in the prototype and simple to implement without extra files
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0; // Mute local feedback
      gainNodeRef.current = gainNode;
      
      source.connect(processor);
      processor.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live-voice`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const triggerGoodbye = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          updateStatus("Đang ngắt kết nối do im lặng...", "text-slate-500");
          ws.send(JSON.stringify({
            clientContent: {
              turns: [{
                role: "user",
                parts: [{ text: "HỆ THỐNG: Khách hàng đã im lặng quá 30 giây. Hãy nói: 'Dạ do không nhận được phản hồi, tôi xin phép ngắt kết nối. Xin chào tạm biệt anh chị.' và tuyệt đối không hỏi thêm câu hỏi nào." }]
              }],
              turnComplete: true
            }
          }));
          setTimeout(() => endCall(true), 6000);
        }
      };

      const resetSilenceTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(triggerGoodbye, 30000);
      };

      processor.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN || !isSetupCompleteRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        let binary = '';
        const bytes = new Uint8Array(pcm16.buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        
        ws.send(JSON.stringify({
          realtimeInput: { 
            audio: {
                mimeType: "audio/pcm;rate=16000",
                data: window.btoa(binary) 
            }
          }
        }));
      };

      ws.onopen = () => {
        setIsConnected(true);
        isSetupCompleteRef.current = false;
        updateStatus("Đã kết nối. Đang khởi tạo AI...", "text-amber-500");

        const systemPrompt = `Bạn là Trợ lý AI hành chính công của Trung tâm Phục vụ hành chính công phường Tân Thuận (tuyệt đối không gọi là UBND Phường). Bạn đang giao tiếp bằng GIỌNG NÓI trực tiếp với người dân.

=== TÍNH CÁCH VÀ NGỮ ĐIỆU (THÂN THIỆN, CHUYÊN NGHIỆP) ===
- Hãy đóng vai một giao dịch viên nhiệt tình, ân cần. Xưng "tôi" và gọi công dân là "Quý bà con" hoặc "Anh/Chị".
- Thường xuyên sử dụng các từ ngữ lịch sự như: "Dạ", "Vâng", "Thưa anh/chị", "Dạ để tôi kiểm tra giúp anh/chị nhé".
- NÓI NGẮN GỌN, như giao tiếp tự nhiên hằng ngày. KHÔNG đọc như cái máy. Dùng nhiều dấu phẩy (,) và dấu chấm (.) để tạo nhịp ngưng tự nhiên khi phát âm.
- Tuyệt đối KHÔNG đọc các ký tự gạch đầu dòng (như dấu sao *, gạch ngang -). Chuyển chúng thành các từ nối như "Thứ nhất là...", "Tiếp theo là...".

=== TỐI ƯU GIAO TIẾP ===
- Trả lời ĐÚNG TRỌNG TÂM. Ví dụ: Nếu khách hỏi "Lệ phí bao nhiêu?", chỉ cần đáp: "Dạ, lệ phí cho thủ tục này là [số tiền] ạ.", không cần đọc thêm hồ sơ, giấy tờ nếu khách không hỏi.
- Nếu không nghe rõ do ồn, hãy nói: "Dạ, anh/chị có thể nói lại giúp tôi được không ạ, tôi nghe chưa rõ."

=== QUY TẮC ĐƠN VỊ HÀNH CHÍNH ===
- TUYỆT ĐỐI KHÔNG dùng các từ: "quận", "huyện", "cấp quận", "cấp huyện", "quận/huyện". Hiện nay địa phương không còn cấp Quận/Huyện, CHỈ dùng cấp "phường/xã".

=== QUY TẮC TÌM KIẾM DỮ LIỆU ===
- Không tự bịa thông tin. Phải dùng công cụ "tra_cuu_thu_tuc" khi người dân hỏi về thủ tục cụ thể.
- Nếu kết quả trả về thông tin tra cứu từ Internet, hãy nói lại thật tự nhiên trong 2-3 câu ngắn: Nêu rõ cơ quan giải quyết (cấp phường/xã) và giấy tờ cơ bản cần chuẩn bị.
- Nếu hoàn toàn không tìm thấy, hãy nói: "Dạ xin lỗi anh chị, hiện tôi chưa tìm thấy thủ tục này. Anh chị vui lòng liên hệ trực tiếp Bộ phận Một cửa Số 342 Huỳnh Tấn Phát, phường Tân Thuận, hoặc gọi số (028) 38.72.80.32 để được hỗ trợ ạ."`;

        ws.send(JSON.stringify({
          setup: {
            model: "models/gemini-3.1-flash-live-preview",
            systemInstruction: { parts: [{ text: systemPrompt }] },
            tools: [
              {
                functionDeclarations: [
                  {
                    name: "tra_cuu_thu_tuc",
                    description: "Tìm kiếm thông tin thủ tục hành chính. Trả về danh sách thủ tục khớp với từ khoá tìm kiếm.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        tu_khoa: {
                          type: "STRING",
                          description: "Từ khoá để tìm kiếm thủ tục (ví dụ: 'kết hôn', 'khai sinh', 'xây dựng')"
                        }
                      },
                      required: ["tu_khoa"]
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }
            }
          }
        }));
        
        turnStartTimeRef.current = performance.now();
      };

      ws.onmessage = async (event) => {
        let dataRaw = event.data;
        if (dataRaw instanceof Blob) dataRaw = await dataRaw.text();
        const data = JSON.parse(dataRaw);
        
        if (data.setupComplete) {
            isSetupCompleteRef.current = true;
            updateStatus("Sẵn sàng! Đang lắng nghe...", "text-emerald-600");
            
            setTalkTime(0);
            if (talkTimeIntervalRef.current) clearInterval(talkTimeIntervalRef.current);
            talkTimeIntervalRef.current = setInterval(() => setTalkTime(p => p + 1), 1000);
            resetSilenceTimer();
        }

        if (turnStartTimeRef.current > 0 && data.serverContent && data.serverContent.modelTurn) {
          setLatency(Math.round(performance.now() - turnStartTimeRef.current));
          turnStartTimeRef.current = 0;
        }

        // Handle Audio
        if (data.serverContent) {
          if (data.serverContent.modelTurn) {
            resetSilenceTimer();
            for (const p of data.serverContent.modelTurn.parts) {
              if (p.inlineData && p.inlineData.data) {
                  playAudioChunk(p.inlineData.data);
              }
            }
          }
          if (data.serverContent.turnComplete) {
              turnStartTimeRef.current = performance.now();
          }
        }

        // Handle Function Calling
        if (data.toolCall) {
          resetSilenceTimer();
          const functionCalls = data.toolCall.functionCalls;
          const toolResponses = [];
          
          for (const call of functionCalls) {
            if (call.name === "tra_cuu_thu_tuc") {
              const tu_khoa = (call.args.tu_khoa || "").toLowerCase().trim();
              updateStatus(`Đang tra cứu: "${tu_khoa}"...`, "text-amber-600");
              
              const searchTerms = tu_khoa.split(/\s+/).filter(Boolean);
              
              const results = thuTucDataRef.current.filter((t: any) => {
                const name = (t.ten_thu_tuc || "").toLowerCase();
                const keywords = (t.tu_khoa_tim_kiem || "").toLowerCase();
                const combinedText = name + " " + keywords;
                
                // Trả về true nếu thủ tục chứa TẤT CẢ các từ khoá đơn lẻ (tìm kiếm linh hoạt hơn)
                if (searchTerms.length === 0) return false;
                return searchTerms.every(term => combinedText.includes(term));
              });
              
              let responseText = "";
              if (results.length > 0) {
                responseText = results.slice(0, 10).map((item: any) => {
                  let text = `Tên: ${item.ten_thu_tuc || 'Chưa cập nhật'}\n`;
                  if (item.cach_thuc_nop) text += `Cách nộp: ${item.cach_thuc_nop}\n`;
                  // BỎ can_cu_phap_ly để tiết kiệm token tối đa
                  const includeKeys = ['mo_ta_ngan', 'thoi_gian_xu_ly', 'le_phi', 'ho_so_giay_to'];
                  for (const key of includeKeys) {
                    if (item[key]) {
                      // Rút gọn text nếu quá dài (VD: cắt bớt nếu nội dung dài hơn 500 ký tự)
                      const val = item[key].length > 500 ? item[key].substring(0, 500) + '...' : item[key];
                      text += `${key}: ${val}\n`;
                    }
                  }
                  return text.trim();
                }).join('\n---\n');
              } else {
                // Không có trong nội bộ -> Kích hoạt Google Search qua Server
                updateStatus(`Đang tìm kiếm Internet: "${tu_khoa}"...`, "text-amber-600");
                try {
                  const searchRes = await fetch('/api/voice-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ keyword: tu_khoa })
                  });
                  if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    responseText = searchData.reply || "Không tìm thấy thủ tục nào khớp với từ khoá này.";
                  } else {
                    responseText = "Không tìm thấy thủ tục nào khớp với từ khoá này.";
                  }
                } catch (searchErr) {
                  console.warn('Lỗi voice search:', searchErr);
                  responseText = "Không tìm thấy thủ tục nào khớp với từ khoá này.";
                }
              }
              
              toolResponses.push({
                id: call.id,
                name: call.name,
                response: { result: responseText }
              });
            }
          }
          
          ws.send(JSON.stringify({
            toolResponse: {
              functionResponses: toolResponses
            }
          }));
          updateStatus("Đã tra cứu xong. AI đang trả lời...", "text-emerald-600");
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        updateStatus("Lỗi kết nối", "text-red-500");
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event);
        if (event.code !== 1000 && event.code !== 1005) {
             const reasonMsg = event.reason || (event.code === 1008 
               ? "Mã lỗi: 1008 - Lỗi cấu hình máy chủ hoặc API Key" 
               : `Mã lỗi: ${event.code}`);
             updateStatus(`Ngắt kết nối (${reasonMsg})`, "text-red-500");
        } else {
             updateStatus("Đã ngắt kết nối", "text-slate-500");
        }
        endCall(false); // don't overwrite error status if any
      };

    } catch (err: any) {
      alert("Lỗi: " + err.message);
      endCall();
    }
  };

  const endCall = useCallback((resetStatus = true) => {
    setIsConnected(false);
    if (talkTimeIntervalRef.current) clearInterval(talkTimeIntervalRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (processorRef.current) { 
        processorRef.current.disconnect(); 
        processorRef.current = null; 
    }
    if (gainNodeRef.current) { 
        gainNodeRef.current.disconnect(); 
        gainNodeRef.current = null; 
    }
    if (mediaStreamRef.current) { 
        mediaStreamRef.current.getTracks().forEach(t => t.stop()); 
        mediaStreamRef.current = null; 
    }
    if (wsRef.current) { 
        // Only close if it's still open
        if (wsRef.current.readyState === WebSocket.OPEN) {
             wsRef.current.close(1000, "User ended call"); 
        }
        wsRef.current = null; 
    }
    if (audioContextRef.current) { 
        audioContextRef.current.close(); 
        audioContextRef.current = null; 
        nextPlayTimeRef.current = 0; 
    }
    if (resetStatus) {
        updateStatus("Đã ngắt kết nối", "text-slate-500");
    }
    setLatency(null);
  }, []);

  return {
    isConnected,
    status,
    latency,
    talkTime,
    startCall,
    endCall
  };
}
