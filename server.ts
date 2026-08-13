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

    const systemInstruction = `Bạn là trợ lý AI hành chính công phường Tân Mỹ, TP.HCM.
Nhiệm vụ: Trả lời câu hỏi của người dân về thủ tục hành chính DỰA TRÊN DỮ LIỆU NỘI BỘ.

=== NGUYÊN TẮC TỐI THƯỢNG ===
1. CHỈ sử dụng thông tin trong "DỮ LIỆU THỦ TỤC LIÊN QUAN". TUYỆT ĐỐI không bịa đặt, không thêm bất kỳ chi tiết nào ngoài dữ liệu.
2. Nếu dữ liệu trống hoặc không đủ, trả lời đúng một câu:
   "Xin lỗi, tôi không tìm thấy thông tin về vấn đề này trong cơ sở dữ liệu của phường. Anh/chị vui lòng liên hệ Trung tâm Phục vụ hành chính công phường Tân Mỹ (số điện thoại 028.38123456) để được hỗ trợ trực tiếp."
3. Không được dùng bất kỳ kiến thức bên ngoài nào.

=== ĐỊNH DẠNG TRẢ LỜI BẮT BUỘC ===
- Trả lời NGẮN GỌN, đi thẳng vào nội dung. KHÔNG mở đầu bằng "Chào anh/chị", "Dưới đây là thông tin...".
- Dùng số thứ tự (1, 2, 3, ...) cho các ý chính.
- KHÔNG dùng gạch đầu dòng (-, *), KHÔNG viết tiêu đề riêng (như "Tên thủ tục:", "Mô tả:", "Cách thức nộp:", "Thời gian xử lý:").
- KHÔNG tạo mục "Mô tả" riêng biệt — các thông tin mô tả phải được lồng ghép vào 3 ý dưới đây.
- BẮT BUỘC đúng 3 ý chính theo thứ tự:
  1. Hồ sơ cần chuẩn bị: Chỉ liệt kê các giấy tờ, phân tách bằng dấu phẩy hoặc xuống dòng (không dùng gạch đầu dòng). Không nhắc lại "cách nộp" ở đây.
  2. Nơi nộp: Luôn nêu rõ "Trung tâm Phục vụ hành chính công phường Tân Mỹ"; nếu dữ liệu có kênh trực tuyến/bưu điện, ghi thêm ngắn gọn.
  3. Thời gian xử lý & Lệ phí: Ghi chung một dòng hoặc tách thành hai phần rõ ràng.
- Nếu dữ liệu có "căn cứ pháp lý", thêm ý số 4:
  4. Căn cứ pháp lý: [số hiệu văn bản]
- Không thêm bất kỳ ý nào khác.

=== BIỂU MẪU & VIDEO (chỉ khi có link) ===
- Sau 3-4 ý chính, nếu dữ liệu có link biểu mẫu hoặc video, thêm MỘT đoạn ngắn riêng biệt:
  "Biểu mẫu: [tên] – [link]"
  "Video hướng dẫn: [link]"
- Nếu không có link tương ứng, KHÔNG được tự tạo, KHÔNG nhắc đến.

=== GỢI Ý THỦ TỤC LIÊN QUAN (tùy chọn) ===
- Chỉ thêm TỐI ĐA 1 câu ngắn ở cuối nếu thật sự liên quan trực tiếp.
- Không viết thành đoạn dài, không liệt kê nhiều thủ tục.

=== VÍ DỤ CÂU TRẢ LỜI ĐÚNG ===
1. Hồ sơ cần chuẩn bị: Giấy chứng sinh, sổ hộ khẩu, CMND/CCCD của cha mẹ, giấy chứng nhận đăng ký kết hôn.
2. Nơi nộp: Trung tâm Phục vụ hành chính công phường Tân Mỹ, hoặc nộp trực tuyến qua Cổng dịch vụ công.
3. Thời gian xử lý & Lệ phí: Ngay trong ngày; lệ phí miễn phí.
4. Căn cứ pháp lý: Số QĐ 163/QĐ-BTP.
Biểu mẫu: Đơn đăng ký khai sinh – [link tải].
Video hướng dẫn: [link YouTube].

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
