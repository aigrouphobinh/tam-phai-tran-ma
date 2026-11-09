# Boss rơi vải và biến hình · 09/11/2026

Game local và bản sân luyện web mặc định chạy chuỗi boss nối tiếp. Bốn dạng có atlas nhân vật và trang phục nền riêng: Hồng Liên → Băng Nguyệt → Lôi Ảnh → Kim Sa → Hồng Liên. Các vòng sau tăng HP 5% mỗi lượt đủ bốn dạng, tối đa +35%.

| Máu còn lại | Hành vi |
| --- | --- |
| Trên 75% | Bốn phụ kiện ngoài: áo choàng vai, hai tà vải và dải lụa |
| 75% | Rơi áo choàng vai |
| 50% | Rơi tà vải thứ nhất |
| 25% | Rơi tà vải thứ hai; còn một dải trang trí |
| 12% | Biến hình trong 1,6 giây, xuất hiện dạng kế tiếp với HP và phụ kiện mới |

**Trang phục nền luôn được vẽ nguyên vẹn:** áo chiến đấu kín cổ, tay áo, quần tất/quần dài đục và giày. Các phụ kiện rơi là texture riêng đặt bên ngoài; không cắt vùng cơ thể, không xóa hoặc làm mỏng trang phục nền. Hai nữ boss mặc giáp/áo kín; hai nam boss là pháp vương và hộ pháp mặc chiến phục/giáp. Không có giai đoạn khỏa thân hoặc cảnh cởi đồ.

## Loot và tiến độ

Mỗi mốc phá lớp ngoài thả một vật thể xuống đấu trường. Sau 1,25 giây, server cộng một vật liệu vào túi chung và vào số vải của người gây đòn phá lớp. Hợp kích không có chủ riêng thì cộng vào túi chung. Bốn loại vật liệu có màu và tên tương ứng với bốn boss.

Đổi dạng giữ nguyên đội hình, chiến công, quà đã ghi nhận và túi vật liệu. Mỗi dạng mới có bốn phút chiến đấu; phong ấn được hồi 180 điểm. Quà nhận trong lúc biến hình được xếp chờ và áp dụng một lần khi dạng mới đến. Overkill dừng ở ngưỡng 12%, không xuyên tiếp sang boss chưa xuất hiện.

Checkpoint lưu dạng, lượt, số lớp đã rơi, vật liệu, các vật rơi chưa nhặt và quà đang chờ. Khởi động lại server phục hồi ở trạng thái tạm dừng. Thua trận vẫn giữ vật liệu đã kiếm được khi bắt đầu lại cùng đội hình. Làm mới sân luyện hoặc đổi nguồn/kênh mới bắt đầu một bộ tiến độ riêng.

## Bốn kiểu đánh

| Dạng | HP ban đầu | Kiểu vùng đánh ưu tiên | Báo đòn | Nhịp thường |
| --- | ---: | --- | ---: | ---: |
| Hồng Liên | 80.000 | Quạt, quét, vòng tròn | 2,2 giây | 6,5 giây |
| Băng Nguyệt | 86.000 | Vòng tròn, vòng tròn, quạt | 2,6 giây | 6,9 giây |
| Lôi Ảnh | 90.000 | Quạt, vòng tròn, quạt | 1,8 giây | 5,8 giây |
| Kim Sa | 94.000 | Quét, quét, vòng tròn | 2,4 giây | 7,1 giây |

Vùng trúng đòn tiếp tục dùng chung `combat-geometry.mjs` với vùng cảnh báo. Giai đoạn cuồng bạo vẫn tăng nhịp như luật chiến đấu hiện có.

## Xem thử

1. Mở `start.cmd`, chọn **Bắt đầu sân luyện**, rồi **Thêm đội 3 môn phái**.
2. **Thử phá giáp** gây 27% HP: bấm ba lần để thấy lần lượt ba phụ kiện rơi.
3. **Thử biến hình** đưa boss tới ngưỡng chuyển dạng. Bấm lại sau mỗi lần chuyển để xem đủ bốn dạng và vòng tiếp theo.
4. Xem bộ đếm **Vải linh đã nhặt**, nhật ký và số vải trong đội hình.
5. `/animation-studio`: chọn Boss và **Dạng boss** để xem đủ tám trạng thái của từng dạng.

Các nút thử bị server từ chối ở nguồn LIVE. Chúng cũng có trên bản sân luyện static và dùng cùng luật trong SharedWorker.

## Nguồn art và kiểm chứng

`docs/asset-register.csv` ghi năm nhóm art gốc được tạo theo yêu cầu dự án bằng công cụ tạo ảnh tích hợp: bốn sheet nhân vật và một sheet 16 phụ kiện. Mỗi boss có 8 trạng thái × 4 tư thế, ảnh nguồn tham chiếu theo phong cách art hiện có nhưng trang phục nền được thiết kế kín. `*-states-v2.json` giữ SHA-256 ảnh nguồn và thông số nhập; `tools/import_actor_sheet.py` chuẩn hóa cùng tỷ lệ/mốc đất. Bốn fallback `boss-*-base.webp` được trích từ pose đầu, không lấy lại boss trang phục cũ.

`tests/boss-cycle.test.mjs` kiểm tra ngưỡng, loot một lần, vòng lặp, quà chờ, checkpoint, giữ đội hình và giới hạn điều khiển. `tests/boss-wardrobe.test.mjs` kiểm tra crop trang phục nền giữ nguyên khi mất từng phụ kiện, bốn atlas riêng và schema trang phục nền.

Chạy `npm test`, `npm run check`, `npm run build`. Browser QA tùy chọn: cài Playwright và Chromium trong môi trường kiểm thử rồi chạy `node tools/playtest-boss-loop.mjs`. Có thể chỉ định `PLAYWRIGHT_MODULE` và `BROWSER_EXECUTABLE` nếu dùng runtime sẵn có. Game thường không cần Playwright, Python hoặc API key.

Ảnh/báo cáo browser QA nằm trong `docs/qa/boss-loop/`. Kiểm chứng trên Chromium Linux không thay cho đo FPS/âm thanh Windows OBS hoặc nghiệm thu TikTok LIVE thật.
