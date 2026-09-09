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
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  const turnStartTimeRef = useRef<number>(0);
  const isSetupCompleteRef = useRef<boolean>(false);
  const nextPlayTimeRef = useRef<number>(0);
  const thuTucDataRef = useRef<any[]>([]);

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
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Thiếu API Key Gemini (VITE_GEMINI_API_KEY) trong biến môi trường!");
      return;
    }

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

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

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

        const systemPrompt = `Bạn là "Trợ lý AI hành chính công" của Trung tâm Phục vụ hành chính công phường Tân Mỹ. Nhiệm vụ của bạn là hỗ trợ người dân và doanh nghiệp tra cứu thủ tục hành chính, giải đáp các thắc mắc về quy định, lịch tiếp công dân, địa chỉ liên hệ và thông tin hoạt động.

=== VAI TRÒ VÀ TÔN CHỈ ===
- Bạn là Trợ lý AI hành chính công của Phường Tân Mỹ. Xưng "tôi" và gọi công dân là "Quý bà con" hoặc "Anh/Chị".
- Luôn giữ thái độ chuyên nghiệp, ân cần. Nội dung trả lời phải thật NGẮN GỌN, SÚC TÍCH.
- KHÔNG giải thích dông dài các điều luật, KHÔNG viết lời chào/lời kết sáo rỗng.

=== QUY TẮC TÌM KIẾM DỮ LIỆU ===
- TUYỆT ĐỐI KHÔNG TỰ BỊA RA NỘI DUNG.
- KHI CÔNG DÂN HỎI VỀ BẤT KỲ THỦ TỤC NÀO, BẠN BẮT BUỘC PHẢI SỬ DỤNG CÔNG CỤ "tra_cuu_thu_tuc" ĐỂ TÌM KIẾM TRONG HỆ THỐNG.
- Nếu không tìm thấy, hãy xin lỗi và hướng dẫn liên hệ trực tiếp: Bộ phận Một cửa - Trung tâm Phục vụ hành chính công phường Tân Mỹ (Số 7, đường Tân Phú, Phường Tân Mỹ, TP.HCM hoặc Hotline: 02837850949).

=== QUY TẮC DANH XƯNG ĐỊA PHƯƠNG ===
- TUYỆT ĐỐI KHÔNG dùng "Ủy ban nhân dân Phường Tân Mỹ". LUÔN dùng đúng cụm từ: "Trung tâm Phục vụ hành chính công phường Tân Mỹ".

=== QUY TẮC TRÌNH BÀY ===
- Trả lời ĐÚNG TRỌNG TÂM và TRỰC TIẾP vào câu hỏi của công dân.
- KHÔNG CẦN liệt kê đầy đủ toàn bộ thông tin (như giấy tờ, thời gian, lệ phí) nếu công dân không hỏi đến. (Ví dụ: Nếu công dân chỉ hỏi "Lệ phí khai sinh là bao nhiêu?", hãy chỉ trả lời thông tin về lệ phí).`;

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
        }

        if (turnStartTimeRef.current > 0 && data.serverContent && data.serverContent.modelTurn) {
          setLatency(Math.round(performance.now() - turnStartTimeRef.current));
          turnStartTimeRef.current = 0;
        }

        // Handle Audio
        if (data.serverContent) {
          if (data.serverContent.modelTurn) {
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
              
              let responseText = "Không tìm thấy thủ tục nào khớp với từ khoá này.";
              if (results.length > 0) {
                responseText = results.slice(0, 8).map((item: any) => {
                  let text = `Tên: ${item.ten_thu_tuc || 'Chưa cập nhật'}\n`;
                  if (item.cach_thuc_nop) text += `Cách nộp: ${item.cach_thuc_nop}\n`;
                  const includeKeys = ['mo_ta_ngan', 'thoi_gian_xu_ly', 'le_phi', 'can_cu_phap_ly', 'ho_so_giay_to'];
                  for (const key of includeKeys) {
                    if (item[key]) {
                      text += `${key}: ${item[key]}\n`;
                    }
                  }
                  return text.trim();
                }).join('\n---\n');
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
             updateStatus(`Ngắt kết nối (Mã lỗi: ${event.code})`, "text-red-500");
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
    startCall,
    endCall
  };
}
