const fs = require('fs');
const path = require('path');

const sourceDir = 'D:\\supabasedvc\\skills';

// Định nghĩa cấu trúc phân loại, từ khóa nhận diện và nội dung README
const categories = {
    '1_Security_Privacy': {
        keywords: ['security', 'penetration', 'threat', 'privacy', 'compliance', 'auditor', 'incident', 'responder', 'hygiene'],
        readme: '# Nhóm 1: Bảo mật & An toàn Thông tin\nĐội ngũ rà soát lỗ hổng, đảm bảo an toàn cho mã nguồn, hệ thống lưu trữ đám mây và tuân thủ quyền riêng tư.'
    },
    '2_3D_XR_Game': {
        keywords: ['3d', 'xr', 'unity', 'unreal', 'godot', 'game', 'spatial', 'blender', 'roblox', 'ui', 'ux', 'designer', 'audio', 'visual'],
        readme: '# Nhóm 2: Thiết kế 3D, XR & Trò chơi\nChuyên xử lý các môi trường tương tác thị giác, thiết kế trải nghiệm 3D, UI/UX và lập trình game engine.'
    },
    '3_AI_Data_LLM': {
        keywords: ['ai', 'data', 'llm', 'rag', 'agent', 'mcp', 'prompt', 'analytics', 'statistician', 'model', 'machine-learning'],
        readme: '# Nhóm 3: Trí tuệ Nhân tạo & Dữ liệu\nChứa các Agent chuyên xử lý lõi AI, mô hình ngôn ngữ lớn (LLM), luồng dữ liệu và kiến trúc hệ thống đa tác tử.'
    },
    '4_Content_Media': {
        keywords: ['social', 'tiktok', 'douyin', 'wechat', 'content', 'seo', 'media', 'creator', 'publisher', 'storyteller', 'instagram', 'twitter', 'bilibili', 'kuaishou', 'xiaohongshu', 'weibo', 'zhihu', 'podcast', 'youtube'],
        readme: '# Nhóm 4: Sáng tạo Nội dung & Truyền thông\nCác chuyên gia tối ưu hóa khả năng hiển thị, sản xuất nội dung đa nền tảng và phân tích mạng xã hội.'
    },
    '5_Software_Web_Dev': {
        keywords: ['developer', 'engineer', 'architect', 'code', 'backend', 'frontend', 'devops', 'sre', 'api', 'cms', 'app', 'web', 'git', 'infrastructure', 'tester'],
        readme: '# Nhóm 5: Phát triển Phần mềm & Hệ thống\nĐội ngũ kỹ sư nòng cốt để lập trình code, xây dựng kiến trúc web, ứng dụng di động và tự động hóa quy trình CI/CD.'
    },
    '6_Business_Ops': {
        keywords: ['manager', 'strategist', 'coach', 'sales', 'hr', 'finance', 'operations', 'officer', 'account', 'billing', 'recruitment', 'shepherd', 'buyer', 'support'],
        readme: '# Nhóm 6: Quản trị Kinh doanh & Vận hành\nCác trợ lý giúp điều phối dự án, chăm sóc khách hàng, quản lý tài chính và lập chiến lược kinh doanh.'
    },
    '7_Specialized_Industry': {
        keywords: [], // Nhóm mặc định (Fallback) nếu không khớp từ khóa nào
        readme: '# Nhóm 7: Các Ngành Đặc thù\nCác Agent được huấn luyện với tệp dữ liệu chuyên ngành hẹp như Y tế, Pháp lý, Giáo dục, GIS và Bản đồ không gian.'
    }
};

// Khởi tạo thư mục và ghi file README
console.log('Đang khởi tạo cấu trúc thư mục...');
for (const [folderName, data] of Object.entries(categories)) {
    const dirPath = path.join(sourceDir, folderName);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(path.join(dirPath, 'README.md'), data.readme, 'utf8');
}

// Đọc và phân loại các thư mục kỹ năng
const items = fs.readdirSync(sourceDir);
let movedCount = 0;

items.forEach(item => {
    const itemPath = path.join(sourceDir, item);
    
    // Bỏ qua nếu là thư mục phân loại vừa tạo hoặc không phải là thư mục
    if (Object.keys(categories).includes(item) || !fs.statSync(itemPath).isDirectory()) {
        return;
    }

    let targetCategory = '7_Specialized_Industry'; // Mặc định
    const itemNameLower = item.toLowerCase();

    // Dò tìm từ khóa (Ưu tiên theo thứ tự đã định nghĩa ở trên)
    for (const [folderName, data] of Object.entries(categories)) {
        if (data.keywords.some(keyword => itemNameLower.includes(keyword))) {
            targetCategory = folderName;
            break;
        }
    }

    // Di chuyển thư mục
    const targetPath = path.join(sourceDir, targetCategory, item);
    try {
        fs.renameSync(itemPath, targetPath);
        console.log(`Đã chuyển: ${item} -> ${targetCategory}`);
        movedCount++;
    } catch (err) {
        console.error(`Lỗi khi chuyển ${item}:`, err.message);
    }
});

console.log(`\nHoàn tất! Đã phân loại thành công ${movedCount} kỹ năng vào các nhóm.`);