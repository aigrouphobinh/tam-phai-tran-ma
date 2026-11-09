# Ghi nhận kiểm chứng · 09/11/2026

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
| Renderer 2D/nền/âm thanh | Đã kiểm tra trình duyệt, giải mã âm thanh local không lỗi | `docs/qa/sprite-v2.json`, `public/assets/` |
| Chrome bắt sự kiện từ TikTok LIVE thực | Chưa nghiệm thu | Cần mở tab kênh đang LIVE với tiện ích được cài |
| OBS audio meter và phát vào LIVE Studio | Chưa nghiệm thu trên máy chủ kênh | Cần OBS/LIVE Studio trên máy phát |
| FPS trên máy Windows hiện có | Chưa đo | Chỉ số trình duyệt cloud không đại diện máy phát |
| 3 môn phái + 4 dạng boss | Đã có 224 tư thế, 4 tư thế/clip | Atlas `*-states-v2.webp`, `docs/BOSS_LOOP.md` |
| Boss rơi phụ kiện, thu vật liệu và biến hình | Đã kiểm thử luật và bản chạy local/static | `tests/boss-cycle.test.mjs`, `tests/boss-wardrobe.test.mjs`, `docs/qa/boss-loop/report.json` |
| Studio chọn frame và clip boss | Đã kiểm tra trong trình duyệt | `docs/qa/sprite-v2.json`, `tests/real-attack-frames.test.mjs` |

Không gán % hoàn thành hoặc nhãn Production chỉ từ số test đạt.

Kiểm thử tự động hiện tại: **77 đạt, 0 lỗi**; `npm run check` xác nhận 32 tài nguyên runtime và 84 khai báo clip (có tham chiếu chung atlas), bao gồm schema/kích thước/vùng crop. `npm run build` tạo bản sân luyện static thành công.

Mốc sprite V2 trước vòng biến hình: trình duyệt Chromium Linux có 21 phép kiểm tra đạt, không có page error hoặc response HTTP lỗi. Đã kiểm tra tám trạng thái của cả bốn nhân vật, 32 clip trong Studio và các clip boss, scrubbing/chọn thumbnail, bắt đầu sân luyện, thêm đội ba môn phái, kỹ năng bậc 5 của cả ba phái gây thay đổi HP, giải mã bộ âm thanh local, canvas OBS 540×960 và bố cục điều khiển 390 px không tràn ngang. Mốc này nạp 8 bitmap nhân vật (4 texture dự phòng + 4 atlas).

Vòng boss mới: tám nhóm kiểm tra trình duyệt đạt, không có page error hoặc HTTP lỗi. Đã xác nhận Hồng Liên → Băng Nguyệt → Lôi Ảnh → Kim Sa → Hồng Liên ở lượt 5, 12 vật liệu giữ qua bốn lần đổi dạng, phụ kiện rơi theo ngưỡng, lớp nền kín giữ nguyên, bốn dạng trong Studio, âm thanh local, bố cục 390 px và bản sân luyện SharedWorker. Runtime nạp 15 bitmap gồm ba môn phái, bốn dạng boss và atlas phụ kiện. Xem [ảnh/báo cáo boss loop](qa/boss-loop/).

Ảnh và log: [docs/qa](qa/), [báo cáo JSON](qa/sprite-v2.json). Các ảnh chụp phản ánh đúng canvas trong trình duyệt; khi chụp màn OBS, trận được tạm dừng để giữ nguyên frame. Không dùng kết quả trình duyệt cloud/software renderer làm bằng chứng FPS hoặc âm thanh ra OBS của máy Windows.

Bốn tư thế/clip đã có và được kiểm tra; tăng lên 6–12 tư thế, rig tách layer, duyệt art ở đội hình 40 người và nghiệm thu phiên LIVE/OBS thật vẫn là các hạng mục mở. Không đóng issue #2/#4/#5 chỉ từ các kiểm tra local này.
