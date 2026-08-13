export type TabType = 'chat' | 'admin';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  image?: {
    data: string;
    mimeType: string;
  };
  userQuestion?: string;
}

export interface Thu_tuc {
  Ma_TTHC: string;
  	Ten_TTHC: string;
  Noi_Dung_Chi_Tiet: string;
  Thoi_Gian_Xu_Ly: string;
  Le_Phi: string;
  Cach_Thuc_Nop: string;
}

