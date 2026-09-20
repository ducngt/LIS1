# Rules

1. Nhiều provider được phép cùng enabled.
2. Primary là ưu tiên, không phải khóa độc quyền.
3. Provider lỗi được fallback theo priority nếu route phù hợp.
4. Human authority không bị thay đổi bởi việc đổi model/provider.
5. Không tự chọn model legacy/embedding/audio cho text-generation.
