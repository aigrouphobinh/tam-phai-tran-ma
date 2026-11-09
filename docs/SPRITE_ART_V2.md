# Sprite art V2 · 09/11/2026

Cập nhật tiếp theo: bộ boss mặc định được thay bằng bốn dạng có trang phục nền kín và phụ kiện riêng; xem [BOSS_LOOP.md](BOSS_LOOP.md). Phần bên dưới ghi lại bộ V2 trước vòng biến hình.

Bốn nhân vật dùng tám clip riêng, bốn tư thế mỗi clip: **128 tư thế**. Mỗi actor nạp một WebP 1024×2048 (4 cột × 8 hàng, ô 256×256). Bốn ảnh cũ được giữ làm dự phòng. Atlas Kiếm Tông 12 frame cũ vẫn còn để đối chiếu nhưng không trộn vào bộ V2 vì khác kích thước và chất lượng.

| Actor | Reference gốc | Sheet dùng trong game | Hướng |
| --- | --- | --- | --- |
| Kiếm Tông | `kiem.webp` | `kiem-states-v2.webp` | Phải |
| Huyền Môn | `huyen.webp` | `huyen-states-v2.webp` | Phải |
| Linh Dược | `linh.webp` | `linh-states-v2.webp` | Phải |
| Hồng Liên | `boss.webp` | `boss-states-v2.webp` | Trái |

Các đường dẫn trong bảng nằm ở `public/assets/characters/`. File `*-states-v2.json` ghi SHA-256 ảnh nguồn, kích thước nguồn, tỷ lệ chuẩn hóa và toàn bộ clip metadata. Art gốc được tạo theo yêu cầu dự án bằng công cụ tạo ảnh tích hợp trong cuộc trò chuyện, với ảnh nhân vật hiện có làm reference. Không dùng nhân vật thương mại, asset tải trả phí, API key hoặc dịch vụ ảnh trong runtime game.

## Brief tạo art

Một lần tạo toàn sheet cho từng nhân vật; không tạo từng tư thế thành các ảnh rời. Yêu cầu cùng khuôn mặt, trang phục, bảng màu, tỷ lệ thân người, hướng nhìn và vũ khí như reference. Nền RGBA trong suốt, 4 cột × 8 hàng, 32 ô vuông có đủ thân, không chữ, lưới, cảnh hoặc watermark. Các tư thế phải thay đổi thật ở tay, chân và thân, không nhân bản rồi xoay ảnh.

| Hàng | Clip | Bốn tư thế từ trái sang phải |
| --- | --- | --- |
| 1 | idle | Thở nhẹ, tóc và tay áo đổi nhẹ |
| 2 | run | Chân trái chạm đất, chuyển bước, chân phải chạm đất, chuyển bước |
| 3 | attack | Lấy đà, tiếp xúc, theo đà, thu chiêu |
| 4 | cast | Tụ năng lượng, nâng tay/vũ khí, phát pháp, nghỉ |
| 5 | hit | Sẵn sàng, giật vì trúng đòn, chống đỡ, hồi tư thế |
| 6 | down | Khụy chân, quỳ, hạ người, nằm gục |
| 7 | revive | Nằm gục, chống tay, quỳ dậy, đứng |
| 8 | victory | Nâng vũ khí/tay, mừng chiến thắng, chuyển động nhẹ, tư thế kết |

Kiếm Tông: nam kiếm khách áo xanh/trắng viền vàng, tóc đen dài buộc cao, một kiếm xanh. Huyền Môn: nữ phù sư áo tím/vàng, tóc dài và trâm tím; tấn công bằng bùa, thi triển pháp ấn tím, không thêm kiếm. Linh Dược: nữ dược sư áo xanh/trắng, tóc đen/trâm hoa trắng, hoa sen sáng xanh trong tay. Hồng Liên: nữ ma tướng áo đỏ/đen, giáp và trang sức vàng, tóc đỏ sẫm, liềm lưỡi trăng đỏ; quét liềm về bên trái và gọi huyết liên khi tụ pháp.

## Nhập lại ảnh nguồn

Ảnh nguồn của đợt này là 887×1774; tool dùng ranh giới ô theo tỷ lệ nên không yêu cầu chia hết theo pixel.

```sh
python tools/import_actor_sheet.py --input path/to/actor-sheet.png --actor kiem
```

Cần Pillow để làm việc với nguồn art; chạy game không cần Python. Tool giữ một tỷ lệ cho toàn sheet, không phóng to các tư thế nằm gục, căn đất theo pixel rõ thay vì hào quang và bỏ mảnh nhỏ từ ô bên cạnh. Mỗi ô đích được cắt riêng để hào quang không tràn sang clip khác. Khi thay art, chép `animations` từ metadata vào actor tương ứng trong manifest.

## Phát hình

`startFrame` chọn hàng trong sheet. `frameTimes` là các mốc chuẩn hóa tăng dần từ 0 đến dưới 1. `syncToAction` co clip theo `actionDuration`; đòn cơ bản chuyển sang tư thế tiếp xúc đúng mốc 240 ms. `actionSeq` khởi động lại một đòn mới; SSE không tự khởi động lại clip. Boss giữ frame nâng liềm trong windup và bắt đầu impact ở tư thế quét, cùng lúc server phát sát thương/SFX. Down giữ frame cuối, revive kết ở tư thế đứng.

`sampleAtlasFrame` được dùng chung bởi OBS, Model Lab và Studio. Chọn thumbnail và kéo timeline xem cùng vùng crop mà game thực sự vẽ. Clip atlas không nhận thêm mesh hoặc phép xoay toàn thân.

## Bằng chứng và giới hạn

Ảnh chụp trình duyệt: [chạy](qa/models-run.jpg), [gục](qa/models-down.jpg), [Studio](qa/studio-boss.jpg), [OBS](qa/obs.jpg). Chi tiết phép thử ở [qa/sprite-v2.json](qa/sprite-v2.json).

Bộ hình có **4 tư thế mỗi hành động**, còn có thể tăng số tư thế để chuyển động mượt hơn. Đây là sprite animation từ art được tạo theo reference, chưa phải rig xương nhiều lớp hay nghiệm thu FPS Windows OBS. Issue #5 vẫn mở cho các tiêu chí đó; kết nối TikTok LIVE thực và âm thanh OBS trên máy chủ kênh cũng chưa được nghiệm thu.
