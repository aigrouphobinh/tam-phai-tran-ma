# Tam Phái Trấn Ma · TikTok LIVE

Game đấu boss cộng đồng chạy local bằng Node.js + Canvas 2D. Mỗi người tham chiến có ID TikTok, tên, môn phái, vị trí, HP, kỹ năng và chiến công. Server quyết định sát thương; màn OBS chỉ trình bày trạng thái, animation, VFX và SFX.

## Chạy trên Windows

1. Cài **Node.js 22 trở lên**.
2. Tải mã nguồn và giải nén. Mở **setup.cmd** một lần để cài thư viện.
3. Mở **start.cmd**. Bảng điều khiển: **http://127.0.0.1:8788**.
4. Bấm **Bắt đầu sân luyện**, **Thêm đội 3 môn phái** để kiểm tra hình ảnh và âm thanh.

Trên macOS/Linux:

```sh
npm ci --ignore-scripts
npm start
```

Không cần API key, tài khoản dịch vụ ký hoặc dịch vụ game trả phí. Game không tự mở phiên livestream của tài khoản.

## Nhận TikTok LIVE từ Chrome

Cầu nối quan sát frame WebSocket mà tab TikTok của chính bạn đang nhận, rồi chuyển tới server `127.0.0.1:8788`. Không đọc/gửi cookie, mật khẩu hoặc stream key. Không gọi API ký của bên thứ ba. Thư viện `tiktok-live-connector` chỉ được dùng để giải mã protobuf.

1. Server local đang chạy. Tải tiện ích trong **Nguồn livestream → Cài cầu nối Chrome**, hoặc dùng thư mục **extension/** trong mã nguồn.
2. Nếu tải ZIP, giải nén. Mở `chrome://extensions`, bật **Developer mode**, chọn **Load unpacked**, chọn thư mục chứa `manifest.json`.
3. Trên bảng điều khiển, chọn **Sao chép mã ghép nối**. Mở tiện ích, dán mã rồi bấm **Bật cầu nối**.
4. Nhập tên kênh và bấm **Kết nối qua Chrome** trên bảng điều khiển.
5. Mở **https://www.tiktok.com/@TEN_KENH/live**, tải lại tab sau khi đã bật tiện ích. Giữ tab này mở.
6. Khi có frame, trạng thái chuyển sang **Đang nhận TikTok @kênh**. Khán giả bình luận `!kiem`, `!huyen`, `!linh` để nhập môn.

Chỉ frame đúng kênh đã chọn và đúng mã ghép nối được chấp nhận. Mã lưu ở `.runtime/bridge-token`, không được đưa vào Git. Đổi kênh sẽ xóa đội hình của kênh cũ. Quay lại cùng kênh sau khi khởi động lại server sẽ tiếp tục checkpoint.

TikTok có thể thay đổi giao thức hoặc cách tạo WebSocket. Cầu nối hiện chỉ bắt socket được tạo trong trang chính sau khi tiện ích nạp; socket nằm hoàn toàn trong Web Worker hoặc iframe khác không được bảo đảm. Lỗi giải mã và lần nhận frame cuối hiển thị trên bảng điều khiển. **Đường nhận đã được kiểm thử bằng frame protobuf/gzip và HTTP local; chưa nghiệm thu trên phiên TikTok LIVE thực tế của chủ kênh.**

## OBS / TikTok LIVE Studio

- OBS → Sources → **Browser** → URL `http://127.0.0.1:8788/obs`.
- Width **1080**, Height **1920**. Canvas logic 540 × 960 được phóng theo cùng tỷ lệ 9:16.
- Bật **Control audio via OBS**. Dùng **Interact** bấm **Bật âm thanh** trên nguồn để mở Web Audio. Kiểm tra audio meter trước khi phát.
- Nếu TikTok đã cấp stream key: cấu hình OBS theo thông tin tài khoản.
- Nếu dùng LIVE Studio: bật **OBS Virtual Camera**, chọn camera đó trong LIVE Studio. Virtual Camera chỉ mang hình; chọn nguồn âm thanh game riêng trong LIVE Studio và kiểm tra tránh phát âm hai lần.

`/models` xem từng nhân vật và trạng thái hoạt ảnh. `/animation-studio` xem atlas và các mốc chuyển động.

## Luật chơi

- Mỗi trận: **80.000 HP boss**, **240 giây**, **1.000 phong ấn**. Hết giờ hoặc mất phong ấn là thua. Kết quả hiện 12 giây rồi mở trận tiếp theo, giữ lại đội hình đã tham gia.
- `!kiem`: Kiếm Tông tiền tuyến, tấn công vật lý.
- `!huyen`: Huyền Môn trung tuyến, pháp thuật/khống chế.
- `!linh`: Linh Dược hậu tuyến, hồi phục/hộ thuẫn/hồi sinh.
- `!skill`: kỹ năng bậc 1 miễn phí, hồi 12 giây.
- `!ne` / `!dodge`: né đòn 2,7 giây, hồi 8 giây.
- `!1`, `!2`, `!3`: chọn phân thân mang ấn đỏ trong 8 giây, mỗi đệ tử chỉ được chọn một lần cho mỗi ảo ảnh.
- Like của người đã nhập môn tăng nội lực; đủ 100 kích hoạt hợp kích.
- Đệ tử ngã xuống trở lại sau 18 giây, hoặc được Linh Dược hồi sinh sớm.
- Không tạo nhân vật từ tổng viewerCount. Member chỉ được ghi nhận đến phòng; chưa tự chọn phái.

| Giai đoạn | Máu boss | Cơ chế |
| --- | --- | --- |
| 1 | trên 70% | Báo vùng đánh, chỉ trúng khi đòn chạm đất |
| 2 | 70%–40% | Khiên 8 giây, ảo ảnh có ấn đỏ |
| 3 | 40%–15% | Thêm ma ảnh cần tiêu diệt, độc có thể giải bằng Linh Dược |
| 4 | 15% trở xuống | Cuồng bạo, nhịp đánh nhanh hơn và mất phong ấn nhiều hơn |

### Kỹ năng từ quà

Giá trị dùng **kim cương/đơn vị × số lượng combo**, không phải giá tiền VNĐ. Combo streak chỉ tính bản cuối. Quà cần ID ổn định; frame thiếu ID/giá trị hợp lệ bị bỏ qua để tránh phát kỹ năng trùng.

| Bậc | Tổng kim cương từ | Kiếm Tông | Huyền Môn | Linh Dược |
| --- | ---: | --- | --- | --- |
| 1 | 1 | Kiếm Khí | Hỏa Phù | Liên Hoa Hồi Phục |
| 2 | 5 | Liên Trảm | Lôi Kích | Thanh Ngọc Hộ Thuẫn |
| 3 | 20 | Vạn Kiếm Quy Tông | Phong Ấn | Cam Lộ Giải Chú |
| 4 | 100 | Phá Giáp Kiếm Trận | Cửu Thiên Lôi | Liên Hoa Hồi Sinh |
| 5 | 500 | Triệu Hồi Kim Long | Thiên Kiếp Trấn Ma | Phượng Hoàng Niết Bàn |

Donut/Doughnut tăng 30% sát thương cho người gửi trong 10 giây; Rocket/Tên Lửa phá khiên đang có. Nhận diện bổ sung này dùng tên quà do TikTok gửi, không đoán ID quà.

Quà trong màn kết quả được xếp chờ trận tiếp theo. Chống trùng được giữ qua trận mới và checkpoint. Đây là game hợp tác; không đổi quà thành tiền, vật phẩm có giá trị hoặc giải thưởng.

## Lưu trạng thái

Checkpoint `.runtime/checkpoint.json` ghi tuần tự, thay file nguyên tử mỗi 3 giây và sau thao tác điều khiển. Khi tắt bằng Ctrl+C server đợi ghi xong. Sau khởi động lại, game khôi phục trận ở chế độ tạm dừng; chọn lại đúng kênh để tiếp tục. Có thể mất tối đa khoảng 3 giây dữ liệu nếu máy tắt đột ngột.

Sân luyện được tách khỏi nguồn LIVE. Chuyển sang LIVE sẽ bỏ đội hình sân luyện, kể cả trước đó đã bấm Tạm dừng.

## Bản chơi thử web

```sh
npm run build
```

`dist/` là bản static, sử dụng cùng `RaidEngine` trong SharedWorker để bảng điều khiển và iframe OBS có chung một trận. Đây là **sân luyện**, không kết nối TikTok và không thay thế server LIVE local. Cần trình duyệt hỗ trợ SharedWorker. Khi trình duyệt tiết kiệm tài nguyên, khung hình có thể giảm; không dùng kết quả trên trình duyệt cloud làm bằng chứng FPS của máy phát.

## Xác minh

```sh
npm test
npm run check
```

Các bài thử bao gồm giao thức protobuf/gzip, combo cuối/chống trùng, HTTP ghép nối/đúng kênh, khôi phục checkpoint, giữ đội hình qua trận, né đòn theo đúng vùng hiển thị, ảo ảnh, ma ảnh, thời điểm tấn công cơ bản, atlas, renderer và chọn SFX.

Xem [docs/RELEASE_CHECK.md](docs/RELEASE_CHECK.md) để phân biệt phần đã xác minh và phần cần nghiệm thu trên máy phát.

## Mã nguồn và asset

Giữ renderer Canvas hiện có để tái sử dụng animation/VFX/SFX của dự án; không chuyển engine chỉ để đổi tên công nghệ. Asset gồm bốn sprite sheet WebP, mỗi sheet có 8 trạng thái × 4 tư thế vẽ riêng (128 tư thế), bốn ảnh RGBA dự phòng, nền đấu trường và 15 MP3. Boss có thêm ánh xạ tụ lực/va chạm/choáng/chuyển giai đoạn. Mỗi hành động hiện có 4 tư thế; đây là sprite animation, không phải rig Spine nhiều lớp. Atlas Kiếm Tông 12 frame cũ được giữ lại trong mã nguồn để đối chiếu. Không dùng ảnh infographic làm bằng chứng tính năng đã chạy.

`input.mjs` chuẩn hóa sự kiện; `bridge.mjs` giải mã; `engine.mjs` tính chiến đấu; `combat-geometry.mjs` xác định vùng trúng; `persistence.mjs` lưu trận; `server.mjs` phục vụ local. Frontend nằm trong `public/`, tiện ích Chrome trong `extension/`.

`THIRD_PARTY_LICENSES/` giữ giấy phép AGPL-3.0 của `tiktok-live-connector@2.5.0`. Mã nguồn thư viện: https://github.com/zerodytrash/TikTok-Live-Connector/tree/v2.5.0 . Asset gốc được tạo theo yêu cầu dự án; nguồn và mức hoàn thiện ghi ở `public/assets/characters/manifest.json`.

## Hoạt ảnh sprite V2 · 09/11/2026

- `/models`: xem đồng thời tám trạng thái của cả bốn nhân vật.
- `/animation-studio`: xem từng tư thế, kéo timeline, bấm thumbnail để chọn đúng frame, xuất clip JSON.
- `/obs`: dùng cùng atlas, giữ ground anchor, kích thước theo bonus, tên phía trên đầu, vòng thủ lĩnh/hộ pháp và khiên.
- Tấn công cơ bản khớp frame tiếp xúc với windup 240 ms của server. Boss giữ tư thế tụ lực tới sự kiện va chạm.

Nguồn art, brief và cách nhập lại sheet: [docs/SPRITE_ART_V2.md](docs/SPRITE_ART_V2.md).
Ảnh chụp và kết quả trình duyệt: [docs/qa/sprite-v2.json](docs/qa/sprite-v2.json).
Kiểm chứng TikTok LIVE thật và FPS/âm thanh trên Windows OBS vẫn cần thực hiện trên máy phát.
