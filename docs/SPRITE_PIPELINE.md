# Game Studio — 2D Sprite Pipeline cho Tam Phái Trấn Ma

Repo: https://github.com/aigrouphobinh/tam-phai-tran-ma
Tracking: https://github.com/aigrouphobinh/tam-phai-tran-ma/issues/5

## Trạng thái hiện tại

**Đã hoạt động:** bốn sheet WebP RGBA, tám trạng thái × bốn tư thế độc lập mỗi nhân vật. `SkinRenderer` phát crop atlas theo actionSeq/actionAt/actionDuration. Bốn cutout gốc và mesh được giữ làm dự phòng khi clip không nạp được.

**Sheet chung:** mỗi clip khai báo `startFrame` vào atlas 4 cột × 8 hàng. `frameTimes` xác định mốc chuyển tư thế; `syncToAction` co thời gian theo server. Studio và OBS cùng dùng `sampleAtlasFrame`, kể cả khi bấm thumbnail. Xem `SPRITE_ART_V2.md` để nhập sheet đã có.

**Đúng phạm vi:** các sprite hiện tại CHƯA chia tay/chân/tóc thành texture độc lập. Mesh deformation KHÔNG phải full skeletal rig production.

## Quy trình sản xuất 2D

1. Seed: dùng một hình duyệt chuẩn (cùng silhouette, khuôn mặt, trang phục và hướng nhìn).
2. Storyboard: mỗi strip gồm 4–12 tư thế thật của cùng một hành động. Không tạo từng frame độc lập rồi ghép tùy tiện.
3. Ảnh nguồn: RGBA sạch, ô cùng kích thước, đủ chân và vũ khí, không chữ hoặc khung cảnh.
4. Normalize: chạy tools/normalize_sprite_strip.py để dùng một tỷ lệ duy nhất và chốt chân ở đáy ô.
5. Atlas: xuất actor-state.webp và actor-state.clip.json, chép clip config vào actors.[actor].animations.[state] trong public/assets/characters/manifest.json.
6. Review: kiểm tra /models và /obs (540×960), không lệch chân, không đổi trang phục, không xé mép, không che tên.
7. QA: xác nhận ảnh liên tục theo FPS, SFX đúng nhịp contact, hình không bị restart theo mỗi SSE snapshot.

## Lệnh mẫu cho một strip 8 frame Kiếm Tông

Cài đặt dependency miễn phí: python -m pip install pillow

Chạy lệnh:

    python tools/normalize_sprite_strip.py --input art/kiem-attack.png --actor kiem --state attack --frames 8 --input-columns 8 --frame-size 256 --fps 14 --output-dir public/assets/characters

Sau khi chạy, thêm cấu hình vào actors.kiem:

    "animations": {
      "attack": {
        "texture": "/assets/characters/kiem-attack.webp",
        "frames": 8,
        "columns": 8,
        "rows": 1,
        "frameWidth": 256,
        "frameHeight": 256,
        "fps": 14,
        "loop": false
      }
    }

Đặt loop:false với attack/hit/down/revive; loop:true với idle/run. Khi thiếu clip, renderer dùng layer nếu có, tiếp theo là mesh flat hoặc vector debug. Sát thương và HP luôn tính trên server.

## Tiến độ so với Issue #5

- [x] 4/4 WebP concept cutouts hiển thị trên /obs, /models
- [x] Mesh motion cho art RGBA từ server action state
- [x] Hỗ trợ frame atlas + FPS/loop theo từng clip trên renderer
- [x] Có tool chuẩn hóa full strip, giữ chân chung và cùng tỷ lệ
- [x] Có các tư thế riêng cho đủ 8 state mỗi model (4 tư thế/state; đã kiểm tra trong trình duyệt)
- [ ] Mở rộng các clip đánh/chạy lên 6–12 tư thế và duyệt ở đội hình 40 người
- [ ] Rig bone/layer độc lập cho tay, chân, áo, tóc, vũ khí
- [ ] QA screenshot và benchmark FPS thực trên máy Windows OBS

Không đánh dấu P1/P2/P3 hoàn thành cho tới khi có các file art và bằng chứng QA ở đúng môi trường phát LIVE.
