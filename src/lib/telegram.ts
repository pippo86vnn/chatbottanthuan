export type AlertType = 'FALLBACK' | 'SECURITY' | 'CONTACT' | 'ERROR';

export function sendTelegramAlert(type: AlertType, userQuestion: string, extraInfo?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID trong biến môi trường.");
    return;
  }

  let text = '';
  switch (type) {
    case 'FALLBACK':
      text = `🔴 <b>CẢNH BÁO: CHATBOT THIẾU KIẾN THỨC</b>\n👤 <b>Người dân hỏi:</b> "${userQuestion}"\n❌ <b>Tình trạng:</b> Không tìm thấy thủ tục liên quan trong RAG / AI không có dữ liệu.\n⚙️ <b>Hành động:</b> Đề nghị bổ sung thủ tục này vào Supabase.`;
      break;
    case 'SECURITY':
      text = `🚫 <b>CẢNH BÁO: TỪ KHÓA NHẠY CẢM / KHIẾU NẠI</b>\n👤 <b>Nội dung:</b> "${userQuestion}"\n⚠️ <b>Trạng thái:</b> Đã chặn trả lời tự động bằng AI.`;
      break;
    case 'CONTACT':
      text = `📞 <b>YÊU CẦU GỌI LẠI TỪ CÔNG DÂN</b>\n👤 <b>Câu hỏi gần nhất:</b> "${userQuestion}"\n📱 <b>Thông tin liên hệ (SĐT/Email):</b> ${extraInfo || 'Không có'}\n⚙️ <b>Hành động:</b> Đề nghị bộ phận tiếp dân liên hệ hỗ trợ.`;
      break;
    case 'ERROR':
      text = `🛠️ <b>CẢNH BÁO KỸ THUẬT: LỖI HỆ THỐNG</b>\n❌ <b>Chi tiết lỗi:</b> ${extraInfo || 'Không xác định'}\n⚙️ <b>Hành động:</b> Kỹ thuật viên kiểm tra API Gemini / Supabase ngay lập tức.`;
      break;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    }),
  }).catch((err) => {
    console.error('Lỗi khi gửi cảnh báo Telegram:', err);
  });
}
