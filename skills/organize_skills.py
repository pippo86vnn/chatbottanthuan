import os
import shutil

source_dir = r"D:\supabasedvc\skills"

# Định nghĩa cấu trúc phân loại, từ khóa nhận diện và nội dung README
categories = {
    '1_Security_Privacy': {
        'keywords': ['security', 'penetration', 'threat', 'privacy', 'compliance', 'auditor', 'incident', 'responder', 'hygiene', 'zk'],
        'readme': '# Nhóm 1: Bảo mật & An toàn Thông tin\nĐội ngũ rà soát lỗ hổng, đảm bảo an toàn cho mã nguồn, hệ thống lưu trữ đám mây và tuân thủ quyền riêng tư.'
    },
    '2_3D_XR_Game': {
        'keywords': ['3d', 'xr', 'unity', 'unreal', 'godot', 'game', 'spatial', 'blender', 'roblox', 'ui', 'ux', 'designer', 'audio', 'visual'],
        'readme': '# Nhóm 2: Thiết kế 3D, XR & Trò chơi\nChuyên xử lý các môi trường tương tác thị giác, thiết kế trải nghiệm 3D, UI/UX và lập trình game engine.'
    },
    '3_AI_Data_LLM': {
        'keywords': ['ai', 'data', 'llm', 'rag', 'agent', 'mcp', 'prompt', 'analytics', 'statistician', 'model', 'machine-learning', 'pipeline'],
        'readme': '# Nhóm 3: Trí tuệ Nhân tạo & Dữ liệu\nChứa các Agent chuyên xử lý lõi AI, mô hình ngôn ngữ lớn (LLM), luồng dữ liệu và kiến trúc hệ thống đa tác tử.'
    },
    '4_Content_Media': {
        'keywords': ['social', 'tiktok', 'douyin', 'wechat', 'content', 'seo', 'media', 'creator', 'publisher', 'storyteller', 'instagram', 'twitter', 'bilibili', 'kuaishou', 'xiaohongshu', 'weibo', 'zhihu', 'podcast', 'youtube', 'pr-communications'],
        'readme': '# Nhóm 4: Sáng tạo Nội dung & Truyền thông\nCác chuyên gia tối ưu hóa khả năng hiển thị, sản xuất nội dung đa nền tảng và phân tích mạng xã hội.'
    },
    '5_Software_Web_Dev': {
        'keywords': ['developer', 'engineer', 'architect', 'code', 'backend', 'frontend', 'devops', 'sre', 'api', 'cms', 'app', 'web', 'git', 'infrastructure', 'tester', 'rust'],
        'readme': '# Nhóm 5: Phát triển Phần mềm & Hệ thống\nĐội ngũ kỹ sư nòng cốt để lập trình code, xây dựng kiến trúc web, ứng dụng di động và tự động hóa quy trình CI/CD.'
    },
    '6_Business_Ops': {
        'keywords': ['manager', 'strategist', 'coach', 'sales', 'hr', 'finance', 'operations', 'officer', 'account', 'billing', 'recruitment', 'shepherd', 'buyer', 'support', 'pricing', 'm-a', 'economy'],
        'readme': '# Nhóm 6: Quản trị Kinh doanh & Vận hành\nCác trợ lý giúp điều phối dự án, chăm sóc khách hàng, quản lý tài chính và lập chiến lược kinh doanh.'
    },
    '7_Specialized_Industry': {
        'keywords': [], # Nhóm mặc định (Fallback)
        'readme': '# Nhóm 7: Các Ngành Đặc thù\nCác Agent được huấn luyện với tệp dữ liệu chuyên ngành hẹp như Y tế, Pháp lý, Giáo dục, Kỹ thuật dân dụng, GIS và Bản đồ không gian.'
    }
}

print("Đang khởi tạo cấu trúc thư mục...")

# 1. Tạo thư mục và ghi file README
for folder_name, data in categories.items():
    dir_path = os.path.join(source_dir, folder_name)
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)
    
    readme_path = os.path.join(dir_path, 'README.md')
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(data['readme'])

# 2. Phân loại và di chuyển thư mục
moved_count = 0
if os.path.exists(source_dir):
    for item in os.listdir(source_dir):
        item_path = os.path.join(source_dir, item)
        
        # Bỏ qua nếu là file hoặc là thư mục phân loại vừa tạo
        if not os.path.isdir(item_path) or item in categories:
            continue
            
        item_lower = item.lower()
        target_category = '7_Specialized_Industry' # Mặc định nếu không khớp từ khóa
        
        # Tìm danh mục phù hợp dựa trên từ khóa
        for folder_name, data in categories.items():
            if any(keyword in item_lower for keyword in data['keywords']):
                target_category = folder_name
                break # Dừng lại khi đã tìm thấy nhóm phù hợp
        
        target_path = os.path.join(source_dir, target_category, item)
        
        # Di chuyển thư mục
        try:
            shutil.move(item_path, target_path)
            print(f"Đã chuyển: {item} -> {target_category}")
            moved_count += 1
        except Exception as e:
            print(f"Lỗi khi chuyển {item}: {e}")
else:
    print(f"Không tìm thấy thư mục nguồn: {source_dir}")

print(f"\nHoàn tất! Đã phân loại thành công {moved_count} kỹ năng vào các nhóm.")