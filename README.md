# Tam Phái Trấn Ma

Game boss raid local cho TikTok LIVE. Dùng Node.js 22 trở lên. Mở terminal trong thư mục dự án và chạy `npm start` hoặc mở `start.cmd` trên Windows. Giả lập chạy ngay với Node, kể cả khi chưa cài connector.

- Điều khiển tại http://127.0.0.1:8788/admin. Bấm **Bắt đầu giả lập**, mở đấu trường và thử quà.
- Trong OBS thêm Browser Source http://127.0.0.1:8788/obs, kích thước 540 × 960, 30 FPS. Mở Interact và bấm **Bật âm** để nghe hiệu ứng.
- Để nhận sự kiện thật, chạy `npm install tiktok-live-connector@2.5.0`, khởi động lại server, nhập tên kênh đang LIVE ở trang điều khiển. Trạng thái kết nối và lỗi hiển thị tại đó. Khả năng kết nối phụ thuộc quyền truy cập của TikTok và dịch vụ ký mà connector sử dụng.
- Kiểm thử bằng `npm test`. Server chỉ lắng nghe ở loopback. Đổi cổng bằng biến PORT.

## Luật trận

Chat !kiem, !huyen hoặc !linh để nhập môn. Người chưa nhập môn gửi quà được xếp vào Kiếm Tông. Mỗi trận kéo dài tối đa 240 giây từ người đầu tiên, mỗi nhân vật tự đóng góp sát thương. !skill hồi sau 8 giây. Like tích thanh hợp kích. Quà kích hoạt một trong 15 chiêu, bậc 1–5 theo tổng giá trị 1 / 5 / 20 / 100 / 500. Chuỗi có cờ streak chốt khi nhận repeatEnd. Boss tăng sức mạnh ở hai ngưỡng máu và dựng khiên mỗi 30 giây. Hết thời gian hoặc trận pháp vỡ thì thua. Sau bảng vinh danh 12 giây, mở trận mới.

## Kiến trúc

live.mjs nhận CHAT / LIKE / GIFT theo giao diện connector dùng ở tiktok-live-temple-rpc. Dữ liệu chuẩn hóa và sự kiện giả lập đi vào Raid.input. raid.mjs quản lý trận theo giây; combat.mjs chọn bậc chiêu. server.mjs truyền snapshot qua SSE, kể cả khi OBS mở lại. Arena chỉ vẽ tối đa 40 nhân vật ở 540 × 960 và tổng hợp âm bằng Web Audio. Bảng điểm cộng dồn được lưu vào save.json khi kết trận. Trận đang chơi giữ trong RAM. Chuyển chế độ trên trang điều khiển sẽ bắt đầu phiên mới.
