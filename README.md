# Tam Phái Trấn Ma

Game 2D dọc cho TikTok LIVE. Bản khởi tạo cung cấp bảng kỹ năng ba môn phái và hàm chọn kỹ năng theo giá trị quà. Chạy kiểm thử bằng `node --test`.

## Kiến trúc triển khai

Tham chiếu server.js trong aigrouphobinh/tiktok-live-temple-rpc tại 2908ce298368b2fd466ea723daf579cb71f1e5b5. Connector nguồn xử lý WebcastEvent.CHAT, LIKE và GIFT. Callback chat gọi trình phân tích nghi lễ ngay tại server, do đó cần nhận bình luận ở lớp connector trước bước này để xử lý lệnh nhập môn.

1. Adapter LIVE và simulator phát cùng kiểu sự kiện nội bộ. Chat mang uniqueId và comment, like mang số lượt tăng, gift mang groupId, diamondCount, repeatCount và repeatEnd. Adapter phải chốt một lần mỗi chuỗi trước khi gọi selectGiftSkill với tổng số lần lặp.
2. Game server sở hữu đội hình, máu boss, hồi chiêu, đồng hồ và điểm. Ba lệnh !kiem, !huyen, !linh tạo nhân vật theo uniqueId. Server gửi snapshot khi OBS kết nối lại.
3. OBS dùng Canvas 540 × 960, mục tiêu 30 FPS. Giới hạn 40 nhân vật vẽ trực tiếp. Âm cảnh báo ưu tiên hơn tiếng đánh thường.
4. Ngưỡng bonus bản đầu là 1, 5, 20, 100 và 500. Đây là thông số cân bằng game.

Adapter, game server và màn OBS đang ở giai đoạn thiết kế.
