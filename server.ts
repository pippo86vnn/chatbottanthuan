import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import WebSocket, { WebSocketServer } from "ws";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import { sendTelegramAlert } from "./src/lib/telegram";

// Nạp các biến môi trường từ .env.local và .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = 3000;
// Bảo mật: Giảm giới hạn payload xuống 5MB để chống tấn công OOM
app.use(express.json({ limit: "5mb" }));

// Bảo mật: Giới hạn số lượng request API Chat (15 request / 1 phút / IP)
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  message: { error: "Bạn đã vượt quá giới hạn nhắn tin. Vui lòng thử lại sau 1 phút." }
});

// Khởi tạo Supabase client trên server (dùng chung VITE_ env cho tiện, hoặc dùng SERVICE_ROLE_KEY nếu có)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("Vui lòng cấu hình GEMINI_API_KEY trong Settings để sử dụng Trợ lý AI.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}



async function getTTS(text: string) {
  // Tạm tắt chức năng chuyển văn bản thành giọng nói (TTS) để tránh lỗi API
  // Nếu muốn dùng lại, bạn cần thiết lập Google Cloud Service Account
  return "";
}

// Chuẩn hóa đơn vị hành chính: Hiện nay không còn cấp Quận/Huyện, chỉ còn cấp Phường/Xã
function cleanAdminUnits(text: string): string {
  if (!text) return text;
  return text
    .replace(/cấp\s+quận\s*[\/,]\s*huyện/gi, 'cấp phường/xã')
    .replace(/quận\s*[\/,]\s*huyện/gi, 'phường/xã')
    .replace(/cấp\s+quận\s+hoặc\s+huyện/gi, 'cấp phường/xã')
    .replace(/quận\s+hoặc\s+huyện/gi, 'phường hoặc xã')
    .replace(/cấp\s+xã\s*[\/,]\s*quận/gi, 'cấp phường/xã')
    .replace(/xã\s*[\/,]\s*quận/gi, 'phường/xã')
    .replace(/cấp\s+quận/gi, 'cấp phường')
    .replace(/cấp\s+huyện/gi, 'cấp xã')
    .replace(/Công an quận/gi, 'Công an phường')
    .replace(/Công an huyện/gi, 'Công an xã')
    .replace(/UBND quận/gi, 'UBND phường')
    .replace(/UBND huyện/gi, 'UBND xã')
    .replace(/Bộ phận Một cửa quận/gi, 'Bộ phận Một cửa phường')
    .replace(/Bộ phận Một cửa huyện/gi, 'Bộ phận Một cửa xã')
    .replace(/Phòng Tư pháp quận/gi, 'Bộ phận Tư pháp phường')
    .replace(/Phòng Tư pháp huyện/gi, 'Bộ phận Tư pháp xã');
}

app.post("/api/chat", chatLimiter, async (req, res) => {
  try {
    const { messages, image, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const lastMessage = messages[messages.length - 1]?.content || "";
    const userQuestion = lastMessage;

    // Trigger 1: Bắt thông tin liên hệ (Contact Request)
    const phoneRegex = /0[3|5|7|8|9][0-9]{8}/;
    const phoneMatch = userQuestion.match(phoneRegex);
    const isContactKeyword = /(gọi lại|liên hệ)/i.test(userQuestion);

    if (phoneMatch || isContactKeyword) {
      const foundPhoneNumber = phoneMatch ? phoneMatch[0] : 'Chưa cung cấp SĐT, yêu cầu gọi lại';
      sendTelegramAlert('CONTACT', userQuestion, foundPhoneNumber);
      const replyText = "Tôi đã ghi nhận thông tin liên hệ của bạn. Cán bộ phụ trách sẽ sớm gọi lại hỗ trợ bạn.";
      return res.json({ reply: replyText, audioBase64: await getTTS(replyText) });
    }

    // Trigger 2: Nội dung nhạy cảm (Security Alert)
    const sensitiveKeywords = ['khiếu nại', 'tố cáo', 'tham nhũng', 'chửi bới'];
    const isSensitive = sensitiveKeywords.some(keyword => userQuestion.toLowerCase().includes(keyword));

    if (isSensitive) {
      sendTelegramAlert('SECURITY', userQuestion);
      const replyText = "Xin lỗi, tôi là trợ lý ảo hỗ trợ thủ tục. Với các vấn đề khiếu nại, phản ánh, vui lòng liên hệ trực tiếp số điện thoại đường dây nóng của UBND.";
      return res.json({ reply: replyText, audioBase64: await getTTS(replyText) });
    }

    // Chuẩn bị nội dung gửi đến Gemini
    const contents: any[] = [];
    for (const msg of messages.slice(0, -1)) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    const latestParts: any[] = [];
    if (image) {
      latestParts.push({
        inlineData: {
          data: image.data,
          mimeType: image.mimeType || "image/jpeg"
        }
      });
    }
    latestParts.push({ text: lastMessage });

    contents.push({
      role: 'user',
      parts: latestParts
    });

    // Hàm gọi Gemini kèm Google Search Grounding khi dữ liệu nội bộ không có
    const callGeminiWithSearch = async (): Promise<string> => {
      sendTelegramAlert('FALLBACK', userQuestion);

      const internetInstruction = `Bạn là "Trợ lý AI hành chính công" của Trung tâm Phục vụ hành chính công phường Tân Mỹ.
Hiện tại cơ sở dữ liệu nội bộ của phường chưa có dữ liệu trực tiếp về nội dung này. Bạn hãy sử dụng công cụ Google Search để tra cứu quy định pháp luật và thủ tục hành chính mới nhất tại Việt Nam để giải đáp cho Quý bà con.

=== VAI TRÒ VÀ TÔN CHỈ ===
- Xưng "tôi" và gọi công dân là "Quý bà con" hoặc "Anh/Chị".
- Luôn giữ thái độ chuyên nghiệp, ân cần.
- TUYỆT ĐỐI KHÔNG dùng cụm từ "Ủy ban nhân dân Phường Tân Mỹ" hay "UBND Phường Tân Mỹ", LUÔN dùng đúng: "Trung tâm Phục vụ hành chính công phường Tân Mỹ".

=== QUY TẮC ĐƠN VỊ HÀNH CHÍNH (ĐẶC BIỆT QUAN TRỌNG) ===
- TUYỆT ĐỐI KHÔNG dùng các từ: "quận", "huyện", "cấp quận", "cấp huyện", "quận/huyện". Hiện nay địa phương không còn cấp Quận/Huyện, CHỈ dùng "phường/xã" (hoặc cơ quan cấp Tỉnh/Thành phố).
- Khi hướng dẫn nơi nộp hồ sơ hoặc thẩm quyền, CHỈ dùng "phường/xã" (ví dụ: "Công an phường/xã", "Bộ phận Một cửa phường/xã") hoặc cơ quan chuyên ngành (ví dụ: "Cơ quan Công an", "Bảo hiểm xã hội").

=== QUY TẮC BẮT BUỘC VỀ ĐỘ DÀI & NỘI DUNG (PHẢI THẬT GỌN GÀNG) ===
- Trả lời CỰC KỲ NGẮN GỌN, SÚC TÍCH, đi thẳng vào trọng tâm câu hỏi, KHÔNG viết dài dòng lan man.
- Trình bày tối đa 3 ý chính ngắn gọn (mỗi ý từ 1 - 2 câu, xuống dòng dễ nhìn):
  1. Thẩm quyền / Nơi nộp hồ sơ (ví dụ: Cơ quan Công an phường/xã, Bộ phận Một cửa,...).
  2. Các giấy tờ cốt lõi cần chuẩn bị (chỉ gạch đầu dòng các giấy tờ chính).
  3. Thời hạn giải quyết hoặc lệ phí (nếu có thông tin).
- TUYỆT ĐỐI KHÔNG trích dẫn toàn văn điều luật, không phân tích lý thuyết pháp lý dài dòng.
- KHÔNG tự tạo danh sách nguồn ở cuối, hệ thống sẽ tự gắn 1 nguồn tham khảo duy nhất.

=== QUY TẮC ĐƯỜNG LINK & LƯU Ý ===
- Nếu nhắc đến Cổng Dịch vụ công Quốc gia, hãy dùng định dạng [Cổng Dịch vụ công Quốc gia](https://dichvucong.gov.vn). TUYỆT ĐỐI không dán URL dài thô.
- Ở cuối câu trả lời thêm 1 dòng lưu ý ngắn gọn:
*(Lưu ý: Thông tin trên được tổng hợp từ Internet để tham khảo. Quý bà con vui lòng liên hệ Trung tâm qua [Zalo OA](https://zalo.me/4060033006235308567) hoặc Hotline: 02837850949).*`;

      const searchResponse = await getAiClient().models.generateContent({
        model: "gemini-3.8-flash",
        contents: contents,
        config: {
          systemInstruction: internetInstruction,
          temperature: 0.2,
          tools: [{ googleSearch: {} }],
        }
      });

      let searchReply = searchResponse.text || "";

      // Kiểm tra xem tìm kiếm có thất bại hoàn toàn không
      const hardRejections = ["không tìm thấy thông tin", "tôi không tìm thấy", "không thể tìm thấy"];
      const isSearchFailed = !searchReply || hardRejections.some(pattern => searchReply.toLowerCase().includes(pattern));

      if (isSearchFailed) {
        return "Xin lỗi, hiện tại tôi chưa có dữ liệu chính xác về thủ tục này. Quý bà con liên hệ trực tiếp qua [Zalo OA](https://zalo.me/4060033006235308567) hoặc Hotline: 02837850949 để được hỗ trợ.";
      }

      // Trích xuất nguồn Internet từ groundingMetadata (CHỈ TRÍCH 1 NGUỒN DUY NHẤT)
      const grounding = searchResponse.candidates?.[0]?.groundingMetadata;
      if (grounding?.groundingChunks && grounding.groundingChunks.length > 0) {
        const sources: { title: string; url: string }[] = [];
        for (const chunk of grounding.groundingChunks) {
          const web = (chunk as any).web;
          if (web && web.uri) {
            const title = web.title || web.uri;
            if (!sources.some(s => s.url === web.uri)) {
              sources.push({ title, url: web.uri });
            }
          }
        }

        if (sources.length > 0) {
          // Ưu tiên nguồn chính thống (.gov.vn hoặc thuvienphapluat.vn)
          const primarySource = sources.find(s => s.url.includes('.gov.vn') || s.url.includes('thuvienphapluat.vn')) || sources[0];
          searchReply += `\n\n---\n🌐 **Nguồn tham khảo:** [${primarySource.title}](${primarySource.url})`;
        }
      }

      return cleanAdminUnits(searchReply);
    };

    const hasInternalContext = Boolean(context && context.trim() !== 'Không tìm thấy thủ tục phù hợp.' && context.trim() !== '');

    let reply = "";

    if (!hasInternalContext) {
      // Trường hợp 1: Dữ liệu nội bộ không có kết quả -> Tìm kiếm Google qua Gemini Search Grounding
      reply = await callGeminiWithSearch();
    } else {
      // Trường hợp 2: Có dữ liệu nội bộ -> Ưu tiên trả lời từ dữ liệu nội bộ
      const systemInstruction = `Bạn là "Trợ lý AI hành chính công" của Trung tâm Phục vụ hành chính công phường Tân Mỹ. Nhiệm vụ của bạn là hỗ trợ người dân và doanh nghiệp tra cứu thủ tục hành chính, giải đáp các thắc mắc về quy định, lịch tiếp công dân, địa chỉ liên hệ và thông tin hoạt động.

=== VAI TRÒ VÀ TÔN CHỈ ===
- Bạn là Trợ lý AI hành chính công của Phường Tân Mỹ. Xưng "tôi" và gọi công dân là "Quý bà con" hoặc "Anh/Chị".
- Luôn giữ thái độ chuyên nghiệp, ân cần. Nội dung trả lời phải thật NGẮN GỌN, SÚC TÍCH.
- KHÔNG giải thích dông dài các điều luật, KHÔNG viết lời chào/lời kết sáo rỗng.

=== QUY TẮC TRẢ LỜI ===
Bước 1: Kiểm tra xem câu hỏi có thể trả lời bằng DỮ LIỆU NỘI BỘ (bên dưới) hay không. Nếu có, BẮT BUỘC trả lời dựa trên dữ liệu đó. Nếu nơi nộp thông qua Cổng Dịch vụ công Quốc gia thì câu trả lời phải dẫn link đến [Cổng Dịch vụ công Quốc gia](https://dichvucong.gov.vn)
Bước 2: Nếu DỮ LIỆU NỘI BỘ trống hoặc không chứa câu trả lời, hãy trả lời chính xác: "CHUA_CO_DU_LIEU_NOI_BO".

=== QUY TẮC DANH XƯNG & ĐƠN VỊ HÀNH CHÍNH ===
- TUYỆT ĐỐI KHÔNG dùng "Ủy ban nhân dân Phường Tân Mỹ" hay "UBND Phường Tân Mỹ".
- LUÔN dùng đúng cụm từ: "Trung tâm Phục vụ hành chính công phường Tân Mỹ".
- TUYỆT ĐỐI KHÔNG dùng các từ: "quận", "huyện", "cấp quận", "cấp huyện", "quận/huyện". Hiện nay địa phương không còn cấp Quận/Huyện, CHỈ dùng cấp "phường/xã".

=== QUY TẮC TRÌNH BÀY (UI/UX) ===
- Khi tư vấn 1 thủ tục cụ thể, bắt buộc đúng 3 ý theo thứ tự, mỗi ý CHỈ xuất hiện 1 LẦN DUY NHẤT, KHÔNG lặp lại nội dung giữa các ý:
  1. Giấy tờ cần chuẩn bị (chỉ liệt kê hồ sơ — KHÔNG nhắc lại cách nộp ở đây).
  2. Thời gian xử lý & Lệ phí.
  3. Căn cứ pháp lý — CHỈ thêm nếu dữ liệu nội bộ có sẵn số hiệu, trích dẫn CHÍNH XÁC nguyên văn, không viết tắt, không suy diễn, không tự bịa. Nếu dữ liệu không có, bỏ hẳn ý này, không đoán.
- Dùng số thứ tự (1, 2, 3...), KHÔNG dùng ký tự đặc biệt (*, #) hay gạch đầu dòng (-, •).
- Tách các đoạn bằng 1 dòng trống để dễ đọc trên điện thoại.

=== BIỂU MẪU & VIDEO HƯỚNG DẪN (nếu dữ liệu có) ===
- Nếu dữ liệu nội bộ có link biểu mẫu/video, thêm 1 đoạn RIÊNG, ĐẶT SAU CÙNG (sau ý số 3), KHÔNG chèn vào giữa các ý 1-3.
- BẮT BUỘC định dạng Markdown ngắn gọn: [Tên biểu mẫu](URL) — TUYỆT ĐỐI KHÔNG dán nguyên URL dài làm chữ hiển thị, vì sẽ vỡ dòng trên điện thoại.
  Ví dụ đúng: [Tải mẫu đơn](https://...) rồi xuống dòng [Xem video hướng dẫn](https://...)
- KHÔNG tự tạo link nếu dữ liệu không có.

DỮ LIỆU THỦ TỤC LIÊN QUAN:
${context}`;

      const response = await getAiClient().models.generateContent({
        model: "gemini-3.8-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2,
        }
      });

      const initialReply = response.text || "Xin lỗi, tôi không thể trả lời lúc này.";

      // Kiểm tra nếu Gemini xác nhận không có thông tin trong dữ liệu nội bộ
      const rejectionPatterns = [
        "chua_co_du_lieu_noi_bo",
        "tôi không có thông tin",
        "không tìm thấy dữ liệu",
        "không có dữ liệu",
        "chưa có dữ liệu",
        "không tìm thấy thủ tục",
        "chưa có thông tin"
      ];
      const isRejection = rejectionPatterns.some(pattern => initialReply.toLowerCase().includes(pattern));

      if (isRejection) {
        // Fallback sang Google Search
        reply = await callGeminiWithSearch();
      } else {
        reply = initialReply;
      }
    }

    reply = cleanAdminUnits(reply);
    res.json({ reply, audioBase64: await getTTS(reply) });
  } catch (err: any) {
    console.error("Chat API error:", err);
    // Trigger 4: Lỗi API (System Error)
    const lastMessage = req.body?.messages?.[req.body.messages?.length - 1]?.content || "Không xác định";
    sendTelegramAlert('ERROR', lastMessage, err.message);
    res.status(500).json({ error: "Hệ thống đang bảo trì. Vui lòng quay lại sau." });
  }
});

// API tra cứu nhanh qua Google Search phục vụ LiveVoice
app.post("/api/voice-search", chatLimiter, async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
      return res.json({ reply: "Không tìm thấy thông tin phù hợp." });
    }

    const voicePrompt = `Bạn là Trợ lý AI hành chính công của Trung tâm Phục vụ hành chính công phường Tân Mỹ.
Người dân đang gọi điện và nói chuyện trực tiếp qua Micro hỏi về: "${keyword}".
Hiện dữ liệu nội bộ của phường không có thủ tục này. Bạn hãy dùng công cụ Google Search tra cứu nhanh quy định pháp luật và thẩm quyền mới nhất tại Việt Nam.

=== YÊU CẦU ĐẶC BIỆT CHO TRỢ LÝ GIỌNG NÓI (VOICE) ===
- Trả lời bằng văn phong giao tiếp trực tiếp ân cần, tự nhiên ("Dạ", "Thưa anh/chị").
- CỰC KỲ NGẮN GỌN: Chỉ gói gọn trong 2 đến 3 câu nói ngắn, không đọc lan man.
- TUYỆT ĐỐI KHÔNG dùng các từ: "quận", "huyện", "cấp quận", "cấp huyện", "quận/huyện". Hiện nay địa phương không còn cấp Quận/Huyện, CHỈ dùng "phường/xã".
- Tập trung vào 2 ý:
  1. Cơ quan giải quyết / Nơi nộp hồ sơ (ví dụ: Cơ quan Công an phường/xã, BHXH, Cổng DVC Bộ Công an...).
  2. Các giấy tờ cơ bản cần chuẩn bị.
- TUYỆT ĐỐI KHÔNG đọc link website hay URL, không dùng ký hiệu Markdown (*, #, gạch đầu dòng -), không trích dẫn điều luật dài.
- Câu kết thúc ngắn gọn: "Do đây là thủ tục ngoài thẩm quyền phường, anh/chị vui lòng liên hệ đơn vị trên hoặc gọi hotline phường 028 3785 0949 để được hướng dẫn thêm ạ."`;

    const response = await getAiClient().models.generateContent({
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: `Thủ tục: ${keyword}` }] }],
      config: {
        systemInstruction: voicePrompt,
        temperature: 0.2,
        tools: [{ googleSearch: {} }]
      }
    });

    const rawReply = response.text || "Hiện tại tôi chưa tìm thấy thông tin chính xác về nội dung này.";
    const reply = cleanAdminUnits(rawReply);
    res.json({ reply });
  } catch (err: any) {
    console.error("Voice search API error:", err);
    res.status(500).json({ error: "Lỗi tra cứu giọng nói", reply: "Không tìm thấy thông tin phù hợp." });
  }
});


// API ghi log chat bảo mật qua Server
app.post("/api/log-chat", async (req, res) => {
  try {
    const { session_id, cauHoi, aiTraLoi, nguonDuLieu } = req.body;

    if (!session_id || !cauHoi) {
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
    }

    const { data, error } = await supabase
      .from('nhat_ky_chat')
      .insert([
        {
          session_id,
          cau_hoi: cauHoi,
          ai_tra_loi: aiTraLoi,
          nguon_du_lieu: nguonDuLieu || ""
        }
      ])
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err: any) {
    console.error("Log chat error:", err);
    res.status(500).json({ error: err.message });
  }
});

// API đánh giá chat bảo mật qua Server
app.post("/api/rate-chat", async (req, res) => {
  try {
    const { session_id, cauHoi, danhGia } = req.body;

    if (!session_id || !cauHoi || !danhGia) {
      return res.status(400).json({ error: "Thiếu thông tin đánh giá" });
    }

    const { error } = await supabase
      .from('nhat_ky_chat')
      .update({ danh_gia: danhGia })
      .eq('session_id', session_id)
      .eq('cau_hoi', cauHoi);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error("Rate chat error:", err);
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  const server = http.createServer(app);

  // WebSocket Server làm Proxy bảo mật cho Gemini Live Voice
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (clientWs: WebSocket) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      console.error("[Live Voice Proxy] Lỗi: Chưa cấu hình GEMINI_API_KEY trên server.");
      clientWs.close(1008, "Chưa cấu hình GEMINI_API_KEY trên máy chủ");
      return;
    }

    const geminiWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${geminiKey}`;
    const geminiWs = new WebSocket(geminiWsUrl);

    const pendingQueue: Array<{ data: any; isBinary: boolean }> = [];

    geminiWs.on("open", () => {
      while (pendingQueue.length > 0) {
        const item = pendingQueue.shift();
        if (item) {
          geminiWs.send(item.data, { binary: item.isBinary });
        }
      }
    });

    clientWs.on("message", (data: any, isBinary: boolean) => {
      if (geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.send(data, { binary: isBinary });
      } else if (geminiWs.readyState === WebSocket.CONNECTING) {
        pendingQueue.push({ data, isBinary });
      }
    });

    geminiWs.on("message", (data: any, isBinary: boolean) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data, { binary: isBinary });
      }
    });

    clientWs.on("close", (code, reason) => {
      if (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING) {
        geminiWs.close(1000, "Client closed");
      }
    });

    clientWs.on("error", (err) => {
      console.error("[Live Voice Proxy] Client WS error:", err);
      geminiWs.close();
    });

    geminiWs.on("close", (code, reason) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(code, reason.toString());
      }
    });

    geminiWs.on("error", (err) => {
      console.error("[Live Voice Proxy] Gemini WS error:", err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1011, "Gemini upstream error");
      }
    });
  });

  server.on("upgrade", (request, socket, head) => {
    try {
      const url = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
      if (url.pathname === "/ws/live-voice") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      }
    } catch (err) {
      socket.destroy();
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
