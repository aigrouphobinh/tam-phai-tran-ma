# Pipeline asset thực tế

Runtime dùng `public/assets/characters/manifest.json` làm bảng ánh xạ. Bốn texture RGBA là Kiếm Tông, Huyền Môn, Linh Dược và Hồng Liên. Mỗi nhân vật có thêm atlas `*-states-v2.webp` 4 × 8, mỗi ô 256 × 256: tám trạng thái × bốn tư thế riêng. Clip ưu tiên atlas; mesh chỉ dùng khi clip lỗi. Atlas Kiếm Tông 12 frame cũ được giữ để đối chiếu. Không có file Spine binary/skeleton trong bản này.

## Thêm hoặc thay hoạt ảnh

1. Xuất ảnh nền trong suốt, không cắt mất vũ khí/áo tóc. Chân nhân vật dùng cùng ground anchor giữa các frame.
2. Chuẩn hóa strip bằng `tools/normalize_sprite_strip.py` theo `docs/SPRITE_PIPELINE.md`.
3. Đặt atlas vào `public/assets/characters/` và khai báo trong `animations` của actor: `texture`, `frames`, `columns`, `rows`, `frameWidth`, `frameHeight`, `fps`, `loop`, tùy chọn `renderScale`, `startFrame` (ô bắt đầu trong sheet chung), `syncToAction` và `frameTimes` (các mốc tăng dần từ 0 đến dưới 1). Renderer và Studio dùng chung `sampleAtlasFrame`.
4. State đã hỗ trợ: idle, run, attack, cast, hit, down, revive, victory; boss thêm windup, impact, stun, phase.
5. Xem `/models` và `/animation-studio`; kiểm tra điểm chân, frame đầu/cuối, tốc độ đánh, kích thước đồng đội và boss.
6. Chạy `npm test` và `npm run check`. Khi đổi tiện ích Chrome, đóng gói lại ZIP từ đúng nội dung `extension/`.

Sát thương cơ bản được server chốt sau windup 240 ms. Renderer dùng `actionSeq`, `actionAt`, `actionDuration` để phát lại đúng lượt đánh, kể cả khi hai hành động liên tiếp có cùng state.

VFX trong `public/fx.js` chỉ nhận sự kiện server. Vùng báo đòn circle/sweep/cone có chung tọa độ và polygon với `combat-geometry.mjs`. Âm thanh tại `public/assets/audio/` được nạp/giải mã khi người điều khiển bật âm thanh; voice limiter giới hạn âm chồng.

Nguồn và mức hoàn thiện của asset phải ghi ở manifest; không đổi nhãn sang fully-rigged hoặc production nếu chỉ có một texture. Tài nguyên bên ngoài cần ghi tác giả, URL, giấy phép và yêu cầu ghi công trước khi đưa vào repo.
