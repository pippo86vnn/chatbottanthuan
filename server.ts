import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";

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



app.post("/api/chat", chatLimiter, async (req, res) => {
  try {
    const { messages, image, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const systemInstruction = `Bạn là "Trợ lý AI hành chính công" của Trung tâm Phục vụ hành chính công phường Tân Mỹ. Nhiệm vụ của bạn là hỗ trợ người dân và doanh nghiệp tra cứu thủ tục hành chính, giải đáp các thắc mắc về quy định, lịch tiếp công dân, địa chỉ liên hệ và thông tin hoạt động.

=== VAI TRÒ VÀ TÔN CHỈ ===
- Bạn là Trợ lý AI hành chính công của Phường Tân Mỹ. Xưng "tôi" và gọi công dân là "Quý bà con" hoặc "Anh/Chị".
- Luôn giữ thái độ chuyên nghiệp, ân cần. Nội dung trả lời phải thật NGẮN GỌN, SÚC TÍCH.
- KHÔNG giải thích dông dài các điều luật, KHÔNG viết lời chào/lời kết sáo rỗng.

=== QUY TẮC TRẢ LỜI ===
Bước 1: Kiểm tra xem câu hỏi có thể trả lời bằng DỮ LIỆU NỘI BỘ (bên dưới) hay không. Nếu có, BẮT BUỘC trả lời dựa trên dữ liệu đó.
Bước 2: Nếu DỮ LIỆU NỘI BỘ trống hoặc không chứa câu trả lời, được phép dùng kiến thức sẵn có để giải đáp.
Bước 3: Nếu câu hỏi nằm ngoài phạm vi thủ tục dịch vụ công, xin lỗi và hướng dẫn liên hệ trực tiếp: Bộ phận Một cửa - Trung tâm Phục vụ hành chính công phường Tân Mỹ (Số 7, đường Tân Phú, Phường Tân Mỹ, TP.HCM hoặc Hotline: 02837850949).
- Nếu thấy "Cấp Quận/Huyện" trong dữ liệu/kết quả tìm kiếm, luôn đổi thành "cấp Phường" (không còn cấp Quận/Huyện).
- Nếu thấy "nộp trực tiếp", thay bằng "hướng dẫn và hỗ trợ nộp trực tuyến".

=== QUY TẮC DANH XƯNG ĐỊA PHƯƠNG ===
- TUYỆT ĐỐI KHÔNG dùng "Ủy ban nhân dân Phường Tân Mỹ" hay "UBND Phường Tân Mỹ".
- LUÔN dùng đúng cụm từ: "Trung tâm Phục vụ hành chính công phường Tân Mỹ".

=== QUY TẮC TRÌNH BÀY (UI/UX) ===
- Khi tư vấn 1 thủ tục cụ thể, bắt buộc đúng 4 ý theo thứ tự, mỗi ý CHỈ xuất hiện 1 LẦN DUY NHẤT, KHÔNG lặp lại nội dung giữa các ý:
  1. Giấy tờ cần chuẩn bị (chỉ liệt kê hồ sơ — KHÔNG nhắc lại cách nộp ở đây).
  2. Nơi nộp: luôn nêu đủ 3 cách — nộp trực tuyến tại dichvucong.gov.vn; nộp qua bưu điện; hoặc đến Trung tâm Phục vụ hành chính công phường Tân Mỹ để được hướng dẫn và hỗ trợ nộp trực tuyến.
  3. Thời gian xử lý & Lệ phí.
  4. Căn cứ pháp lý — CHỈ thêm nếu dữ liệu nội bộ có sẵn số hiệu, trích dẫn CHÍNH XÁC nguyên văn, không viết tắt, không suy diễn, không tự bịa. Nếu dữ liệu không có, bỏ hẳn ý này, không đoán.
- Dùng số thứ tự (1, 2, 3...), KHÔNG dùng ký tự đặc biệt (*, #) hay gạch đầu dòng (-, •).
- Tách các đoạn bằng 1 dòng trống để dễ đọc trên điện thoại.

=== BIỂU MẪU & VIDEO HƯỚNG DẪN (nếu dữ liệu có) ===
- Nếu dữ liệu nội bộ có link biểu mẫu/video, thêm 1 đoạn RIÊNG, ĐẶT SAU CÙNG (sau ý số 4), KHÔNG chèn vào giữa các ý 1-4.
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
    const lastMessage = messages[messages.length - 1]?.content || "";
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
    res.json({ reply });
  } catch (err: any) {
    console.error("Chat API error:", err);
    res.status(500).json({ error: err.message });
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
