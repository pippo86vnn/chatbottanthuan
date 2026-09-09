import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
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
  const ttsApiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!ttsApiKey) return "";
  try {
    const ttsResponse = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'vi-VN', name: 'vi-VN-Neural2-A' },
        audioConfig: { audioEncoding: 'MP3' }
      })
    });
    if (ttsResponse.ok) {
      const data = await ttsResponse.json();
      return data.audioContent || "";
    } else {
      console.error("Lỗi Google TTS API:", await ttsResponse.text());
    }
  } catch (err) {
    console.error("TTS Error:", err);
  }
  return "";
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

    // Trigger 3 (Part 1): Thiếu dữ liệu (Fallback) từ RAG
    if (!context || context.trim() === 'Không tìm thấy thủ tục phù hợp.' || context.trim() === '') {
      sendTelegramAlert('FALLBACK', userQuestion);
      const replyText = "Xin lỗi, hiện tại tôi chưa có dữ liệu chính xác về thủ tục này. Tôi đã ghi nhận câu hỏi và gửi đến Ban Quản trị để bổ sung. Bạn có thể quay lại sau nhé!";
      return res.json({ reply: replyText, audioBase64: await getTTS(replyText) });
    }

    const systemInstruction = `Bạn là "Trợ lý AI hành chính công" của Trung tâm Phục vụ hành chính công phường Tân Mỹ. Nhiệm vụ của bạn là hỗ trợ người dân và doanh nghiệp tra cứu thủ tục hành chính, giải đáp các thắc mắc về quy định, lịch tiếp công dân, địa chỉ liên hệ và thông tin hoạt động.

=== VAI TRÒ VÀ TÔN CHỈ ===
- Bạn là Trợ lý AI hành chính công của Phường Tân Mỹ. Xưng "tôi" và gọi công dân là "Quý bà con" hoặc "Anh/Chị".
- Luôn giữ thái độ chuyên nghiệp, ân cần. Nội dung trả lời phải thật NGẮN GỌN, SÚC TÍCH.
- KHÔNG giải thích dông dài các điều luật, KHÔNG viết lời chào/lời kết sáo rỗng.

=== QUY TẮC TRẢ LỜI ===
Bước 1: Kiểm tra xem câu hỏi có thể trả lời bằng DỮ LIỆU NỘI BỘ (bên dưới) hay không. Nếu có, BẮT BUỘC trả lời dựa trên dữ liệu đó.
Bước 2: Nếu DỮ LIỆU NỘI BỘ trống hoặc không chứa câu trả lời, được phép dùng kiến thức sẵn có để giải đáp.
Bước 3: Nếu câu hỏi nằm ngoài phạm vi thủ tục dịch vụ công, xin lỗi và hướng dẫn Quý bà con liên hệ trực tiếp qua [Zalo OA](https://zalo.me/4060033006235308567) để được hỗ trợ.
- Nếu thấy "Cấp Quận/Huyện" trong dữ liệu/kết quả tìm kiếm, luôn đổi thành "cấp Phường" (không còn cấp Quận/Huyện).

=== QUY TẮC DANH XƯNG ĐỊA PHƯƠNG ===
- TUYỆT ĐỐI KHÔNG dùng "Ủy ban nhân dân Phường Tân Mỹ" hay "UBND Phường Tân Mỹ".
- LUÔN dùng đúng cụm từ: "Trung tâm Phục vụ hành chính công phường Tân Mỹ".

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
${context || 'Không tìm thấy thủ tục phù hợp.'}`;

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

    const response = await getAiClient().models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
      }
    });

    const reply = response.text || "Xin lỗi, tôi không thể trả lời lúc này.";

    // Trigger 3 (Part 2): Kết quả từ Gemini chứa pattern từ chối
    const rejectionPatterns = ["tôi không có thông tin", "không tìm thấy dữ liệu", "không có dữ liệu", "chưa có dữ liệu", "không tìm thấy thủ tục", "chưa có thông tin"];
    const isRejection = rejectionPatterns.some(pattern => reply.toLowerCase().includes(pattern));

    if (isRejection) {
      sendTelegramAlert('FALLBACK', userQuestion);
      const replyText = "Xin lỗi, hiện tại tôi chưa có dữ liệu chính xác về thủ tục này. Tôi đã ghi nhận câu hỏi và gửi đến Ban Quản trị để bổ sung. Bạn có thể quay lại sau nhé!";
      return res.json({ reply: replyText, audioBase64: await getTTS(replyText) });
    }

    res.json({ reply, audioBase64: await getTTS(reply) });
  } catch (err: any) {
    console.error("Chat API error:", err);
    // Trigger 4: Lỗi API (System Error)
    const lastMessage = req.body?.messages?.[req.body.messages?.length - 1]?.content || "Không xác định";
    sendTelegramAlert('ERROR', lastMessage, err.message);
    res.status(500).json({ error: "Hệ thống đang bảo trì. Vui lòng quay lại sau." });
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
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
