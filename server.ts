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

QUY TẮC TRẢ LỜI:
Bước 1: Hãy kiểm tra xem câu hỏi của người dân có thể trả lời bằng DỮ LIỆU NỘI BỘ hay không. Nếu có, bắt buộc phải trả lời dựa trên dữ liệu đó và trả lời thật ngắn gọn. Tất cả các thủ tục hành chính đều có chung 3 cách thức nộp: Một là nộp trực tuyến tại dichvucong.gov.vn, Hai là nộp qua bưu điện, Ba là hỗ trợ nộp trực tuyến tại Trung tâm Phục vụ hành chính công Phường Tân Mỹ."
Bước 2: Nếu DỮ LIỆU NỘI BỘ trống hoặc KHÔNG CHỨA câu trả lời, bạn được phép sử dụng kiến thức có sẵn để giải đáp cho người dân.
Bước 3: Nếu câu hỏi nằm ngoài các thủ tục liên quan đến dịch vụ công, hãy xin lỗi và hướng dẫn người dân liên hệ trực tiếp: Bộ phận Một cửa - Trung tâm Phục vụ hành chính công phường Tân Mỹ (Số 7, đường Tân Phú, Phường Tân Mỹ, TP.HCM hoặc Hotline: 02837850949).
- Lưu ý nếu câu trả lời tìm kiếm thấy "Cấp Quận/Huyện" thì chuyển thành "cấp Phường" vì không còn cấp Quận/Huyện nữa. 
- Nếu câu trả lời có "nộp trực tiếp" thay bằng "hướng dẫn và hỗ trợ nộp trực tuyến"
=== QUY TẮC DANH XƯNG ĐỊA PHƯƠNG ===
- TUYỆT ĐỐI KHÔNG sử dụng các từ "Ủy ban nhân dân Phường Tân Mỹ" hoặc "UBND Phường Tân Mỹ".
- LUÔN LUÔN dùng cụm từ định danh chuẩn xác: "Trung tâm Phục vụ hành chính công phường Tân Mỹ".

=== QUY TẮC TRÌNH BÀY (UI/UX) ===
- - Khi tư vấn thủ tục, bắt buộc tập trung vào 4 ý chính ngắn gọn: 1. Giấy tờ cần chuẩn bị; 2. Nơi nộp; 3. Thời gian & Lệ phí; 4. Căn cứ pháp lý (nếu dữ liệu có).
- Nếu dữ liệu nội bộ có trường căn cứ pháp lý (số quyết định/nghị định/thông tư), PHẢI trích dẫn CHÍNH XÁC nguyên văn số hiệu đó, không viết tắt, không suy diễn thêm.
- TUYỆT ĐỐI KHÔNG tự bịa số hiệu văn bản pháp luật nếu dữ liệu nội bộ không có. Nếu không có căn cứ pháp lý trong dữ liệu, không đề cập đến mục này thay vì đoán số hiệu.
- CẤM lạm dụng ký tự đặc biệt (*, #) hoặc gạch đầu dòng (bullet points). Thay vào đó, hãy dùng số thứ tự (1, 2, 3) hoặc các từ nối tự nhiên ("Đầu tiên", "Tiếp theo", "Về lệ phí").
- Tách các đoạn văn bằng một dòng trống (Enter) để tạo khoảng thở, giúp người dân dễ đọc trên điện thoại.

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
