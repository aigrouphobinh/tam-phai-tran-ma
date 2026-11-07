# Ghi nhận kiểm chứng · 08/11/2026

| Hạng mục | Kết quả | Bằng chứng |
| --- | --- | --- |
| Vào phái, vị trí, HP, chiến công riêng | Đã kiểm thử | `tests/engine.test.mjs` |
| Tấn công cơ bản sau windup | Đã kiểm thử | `tests/animation-timeline.test.mjs` |
| Boss 4 giai đoạn, khiên, ảo ảnh, ma ảnh/độc | Đã triển khai; cơ chế chính đã kiểm thử | `engine.mjs`, `tests/live-pipeline.test.mjs` |
| Né đòn khớp vùng vẽ | Đã kiểm thử | `combat-geometry.mjs`, `tests/live-pipeline.test.mjs` |
| Combo quà cuối, không nhận trùng | Đã kiểm thử | `input.mjs`, `tests/live-pipeline.test.mjs` |
| Giải mã frame protobuf/gzip | Đã kiểm thử bằng fixture theo schema thư viện | `bridge.mjs`, `tests/live-pipeline.test.mjs` |
| HTTP mã ghép nối, lọc kênh | Đã kiểm thử | `tests/live-pipeline.test.mjs` |
| Lưu/khôi phục trận; quà chờ; roster qua trận | Đã kiểm thử | `persistence.mjs`, `tests/live-pipeline.test.mjs` |
| Renderer 2D/nền/âm thanh | Asset đã có; chọn âm thanh đã kiểm thử | `public/assets/`, các bài thử renderer |
| Chrome bắt sự kiện từ TikTok LIVE thực | Chưa nghiệm thu | Cần mở tab kênh đang LIVE với tiện ích được cài |
| OBS audio meter và phát vào LIVE Studio | Chưa nghiệm thu trên máy chủ kênh | Cần OBS/LIVE Studio trên máy phát |
| FPS trên máy Windows hiện có | Chưa đo | Chỉ số trình duyệt cloud không đại diện máy phát |
| 8 clip độc lập × 4 nhân vật | Chưa có đủ asset | Hiện Kiếm Tông có atlas attack 12 frame; còn lại mesh/cutout |

Không gán % hoàn thành hoặc nhãn Production chỉ từ số test đạt.

Kiểm thử tự động hiện tại: **59 đạt, 0 lỗi**. Trình duyệt: xác nhận gọi Kim Long, kỹ năng Huyền Môn và Linh Dược, mở Web Audio không báo thiếu file, đội hình/chiến công, bố cục 390 px không tràn ngang. Renderer tải đủ 5 tài nguyên nhân vật (4 texture + atlas). Trình duyệt cloud bị giảm nhịp khung hình; không xác nhận 60 FPS hoặc hiệu năng OBS từ phép thử này.
