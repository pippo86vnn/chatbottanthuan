import os
import shutil

source_dir = r"D:\supabasedvc\skills"

# CẤU TRÚC 2 LỚP: Danh Mục Chính -> Danh Mục Con: ("Mô tả cho README", ["từ khóa 1", "từ khóa 2"])
categories = {
    "1_AI_and_Data": {
        "LLM_Prompt_Eng": ("Chuyên gia tối ưu hóa Prompt, xử lý ngôn ngữ tự nhiên và RAG pipeline.", ["llm", "prompt", "rag", "mcp"]),
        "Multi_Agent_Systems": ("Kiến trúc sư hệ thống tự trị và điều phối đa tác tử.", ["agent", "autonomous"]),
        "Data_Science": ("Phân tích dữ liệu, thống kê và kỹ sư xử lý luồng dữ liệu.", ["data", "analytics", "statistician", "model"])
    },
    "2_Software_Dev": {
        "Frontend_UI": ("Lập trình giao diện, thiết kế UI/UX và tối ưu trải nghiệm người dùng.", ["frontend", "ui", "ux", "uswds", "interface"]),
        "Backend_API": ("Kỹ sư máy chủ, cơ sở dữ liệu, API và hệ thống nhúng.", ["backend", "api", "database", "cms", "rust", 'embedded', 'webassembly']),
        "DevOps_Infra": ("Vận hành hệ thống, điện toán đám mây và độ tin cậy.", ["devops", "sre", "infrastructure", "network", "cloud", "finops", "pipeline"]),
        "QA_Testing": ("Kiểm thử tự động, đánh giá chất lượng mã nguồn và benchmark.", ["test", "qa", "reviewer", "benchmarker", "evaluator"])
    },
    "3_Cybersecurity": {
        "Offensive_Security": ("Kiểm thử xâm nhập, phát hiện mối đe dọa (Red Team).", ["penetration", "threat", "incident"]),
        "Defensive_Compliance": ("Đảm bảo an toàn thông tin, quyền riêng tư và tuân thủ quy định.", ["security", "privacy", "compliance", "auditor", "zk"])
    },
    "4_Media_and_Marketing": {
        "Social_Global": ("Chiến lược gia mạng xã hội toàn cầu (Tiktok, Youtube, X...).", ["social", "tiktok", "instagram", "twitter", "podcast", "youtube"]),
        "Social_China": ("Chuyên gia nền tảng Trung Quốc (Douyin, WeChat, Xiaohongshu...).", ["douyin", "wechat", "xiaohongshu", "kuaishou", "weibo", "zhihu", "baidu"]),
        "SEO_Advertising": ("Tối ưu hóa công cụ tìm kiếm và chạy quảng cáo trả phí.", ["seo", "ad", "ppc", "paid", "organic"]),
        "Content_Creation": ("Sáng tạo nội dung, kể chuyện và truyền thông.", ["content", "creator", "storyteller", "narrative", "pr-communications", "video"])
    },
    "5_Business_Ops": {
        "Executive_Strategy": ("Giám đốc, chiến lược gia và quản lý điều hành.", ["strategist", "chief", "manager", "officer", "economy"]),
        "Sales_Commerce": ("Bán hàng, thương mại điện tử và tìm kiếm khách hàng tiềm năng.", ["sales", "buyer", "commerce", "lead", "pricing"]),
        "Finance_Legal": ("Kế toán, tài chính, thanh toán và các tác vụ pháp lý.", ["finance", "account", "legal", "billing", "tax"]),
        "HR_Support": ("Nhân sự, tuyển dụng, đào tạo và chăm sóc khách hàng.", ["hr", "recruitment", "support", "service", "onboarding"])
    },
    "6_Gaming_XR_3D": {
        "Game_Engines": ("Lập trình viên game engine như Unity, Unreal, Godot, Roblox.", ["unity", "unreal", "godot", "roblox", "gameplay"]),
        "XR_Spatial_3D": ("Thiết kế 3D, thực tế mở rộng (XR) và điện toán không gian.", ["xr", "spatial", "3d", "blender", "visionos", "visual", "audio"])
    },
    "7_Specialized_Niches": {
        "GIS_Mapping": ("Hệ thống thông tin địa lý, bản đồ và dữ liệu không gian thực.", ["gis", "geo", "geography", "mapping", "drone", "cartography"]),
        "Healthcare_Med": ("Chiến lược gia y tế, bằng chứng lâm sàng và sức khỏe.", ["health", "medical", "clinical", "evidence"]),
        "Architecture_Civil": ("Kỹ sư dân dụng, BIM và mô hình hóa công trình.", ["civil", "bim"])
    },
    "8_Uncategorized": {
        "Others": ("Các kỹ năng đặc thù chưa được phân loại vào nhóm nào.", [])
    }
}

print("Đang khởi tạo cấu trúc 2 lớp...")

# 1. Tạo thư mục chính, thư mục con và ghi file README
for main_cat, sub_cats in categories.items():
    for sub_cat, (description, keywords) in sub_cats.items():
        dir_path = os.path.join(source_dir, main_cat, sub_cat)
        if not os.path.exists(dir_path):
            os.makedirs(dir_path)
        
        # Ghi file README cho từng thư mục con
        readme_path = os.path.join(dir_path, 'README.md')
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(f"# Nhóm: {main_cat} / {sub_cat}\n\n{description}")

# 2. Quét và phân loại thư mục
moved_count = 0
if os.path.exists(source_dir):
    for item in os.listdir(source_dir):
        item_path = os.path.join(source_dir, item)
        
        # Chỉ xử lý thư mục gốc, bỏ qua các thư mục phân loại 1-8 vừa tạo
        if not os.path.isdir(item_path) or any(item.startswith(str(i)) for i in range(1, 9)):
            continue
            
        item_lower = item.lower()
        target_main = '8_Uncategorized'
        target_sub = 'Others'
        
        # Dò tìm theo từ khóa
        found = False
        for main_cat, sub_cats in categories.items():
            if found: break
            for sub_cat, (description, keywords) in sub_cats.items():
                if any(keyword in item_lower for keyword in keywords):
                    target_main = main_cat
                    target_sub = sub_cat
                    found = True
                    break
        
        # Di chuyển thư mục
        target_path = os.path.join(source_dir, target_main, target_sub, item)
        try:
            shutil.move(item_path, target_path)
            print(f"Đã chuyển: {item} -> {target_main}/{target_sub}")
            moved_count += 1
        except Exception as e:
            print(f"Lỗi khi chuyển {item}: {e}")
else:
    print(f"Không tìm thấy thư mục nguồn: {source_dir}")

print(f"\nHoàn tất! Đã phân loại cực sâu {moved_count} kỹ năng vào hệ thống 2 lớp.")