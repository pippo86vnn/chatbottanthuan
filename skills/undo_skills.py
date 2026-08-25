import os
import shutil

source_dir = r"D:\supabasedvc\skills"

print("Đang quét để đưa các kỹ năng về lại thư mục gốc...")

moved_count = 0
# Quét các thư mục phân loại cũ (bắt đầu bằng số từ 1 đến 7)
if os.path.exists(source_dir):
    for category_folder in os.listdir(source_dir):
        cat_path = os.path.join(source_dir, category_folder)
        
        # Chỉ xử lý nếu nó là thư mục và có tên bắt đầu bằng số (1_, 2_...)
        if os.path.isdir(cat_path) and category_folder[0].isdigit():
            # Quét các thư mục agency-... bên trong
            for item in os.listdir(cat_path):
                item_path = os.path.join(cat_path, item)
                
                if os.path.isdir(item_path):
                    target_path = os.path.join(source_dir, item)
                    try:
                        shutil.move(item_path, target_path)
                        moved_count += 1
                    except Exception as e:
                        print(f"Lỗi khi hoàn tác {item}: {e}")
            
            # Sau khi chuyển hết agency ra ngoài, xóa file README cũ và thư mục trống
            readme_path = os.path.join(cat_path, 'README.md')
            if os.path.exists(readme_path):
                os.remove(readme_path)
            
            try:
                os.rmdir(cat_path) # Xóa thư mục phân loại cũ
                print(f"Đã dọn dẹp thư mục: {category_folder}")
            except OSError:
                print(f"Không thể xóa thư mục {category_folder} (có thể vẫn còn file rác).")

print(f"\nHoàn tác thành công! Đã trả {moved_count} kỹ năng về thư mục gốc.")