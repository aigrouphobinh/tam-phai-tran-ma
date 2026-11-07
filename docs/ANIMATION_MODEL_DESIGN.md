# Tam Phái Trấn Ma — thiết kế Animation Model 2D

## Phạm vi

Dùng bốn concept đã duyệt: Kiếm Tông (xanh), Huyền Môn (tím), Linh Dược (lục), Hồng Liên Ma Tướng (đỏ). Sân khấu OBS 540×960. Hệ Node.js điều khiển HP, cooldown và sát thương; renderer chỉ phát hình, hiệu ứng và âm thanh theo state, actionSeq, actionAt từ server.

**Đã có trên main:** bốn ảnh nhân vật RGBA WebP thật, renderer texture, biến dạng mesh, thông số chuyển động riêng cho từng môn và trang Animation Studio. **Chưa có:** atlas vẽ tay đủ frame, layer RGBA tách tay/chân/tóc/vũ khí và bone rig production. Không đánh đồng biến dạng mesh với frame art được họa sĩ vẽ.

## Động tác bắt buộc và tiêu chí hình ảnh

| Model | Idle / Run | Attack / Cast | Hit / Down / Revive | Điểm nhấn |
| --- | --- | --- | --- | --- |
| Kiếm Tông | Trọng tâm thấp; chân chạy so le; tà áo, tóc đi sau | Rút kiếm → lấy đà → chém ngang → thu kiếm | Lùi đột ngột → quỳ → đứng dậy bằng kiếm | Kiếm khí xanh, ánh sáng lưỡi kiếm |
| Huyền Môn | Lơ lửng nhẹ; dải tay áo mềm; bùa xoay | Kết ấn → triệu phù → khóa ấn → phóng bùa | Bùa vỡ → khụy → tái lập vòng ấn | Ấn tím, tia sét và vòng phép |
| Linh Dược | Hoa sen thở nhẹ, tay áo dài | Nâng tay → mở sen → hồi máu → thu pháp | Tắt sen → ngã → ánh lục nâng dậy | Hào quang và cánh hoa sen |
| Hồng Liên | Tóc, vạt váy, lụa và liềm có độ trễ khác nhau | Tụ lực → khóa vùng nguy hiểm → quét liềm → hồi chiêu | Trúng đòn giật người → choáng vỡ khiên → gục | Vòng huyết liên, khói đỏ và shockwave |

## Storyboard từng động tác

### Kiếm Tông — Attack

Thời lượng art tham chiếu: 580ms. 0–15% chuẩn bị; 15–28% kéo kiếm ra sau; 28–44% dồn lực; khoảng 44% contact/sword trail; 44–62% follow-through; 62–100% thu kiếm. Cue: sword-windup (12%), sword-contact (44%), sword-followthrough (62%). Server xác nhận và trừ HP; frontend không tự trừ HP tại cue.

### Huyền Môn — Cast

Art tham chiếu 1240ms. 0–18% nâng tay; 18–43% kết ấn; 43–66% tích pháp; 66–81% khóa ấn/phát lực; 81–100% thu bùa. Cue: seal-form 20%, seal-lock 62%, seal-release 81%.

### Linh Dược — Cast

Art tham chiếu 1140ms. 0–17% hạ rồi nâng tay; 17–39% liên hoa thành hình; 39–65% sen mở; 65–83% phát hồi phục; 83–100% hạt sáng lắng xuống. Cue: lotus-grow 19%, heal-pulse 65%, petal-fall 83%.

### Hồng Liên — Windup / Impact / Stun / Phase

Windup art tham chiếu 2200ms: huyết liên mở, liềm nâng, lụa căng, telegraph đỏ hoàn tất 72%. Impact art tham chiếu 720ms: liềm quét từ thân lúc 20%, dải lụa và ma khí theo sau. Stun 900ms: huyết liên vỡ, giảm phát sáng, giật người rồi đứng yên. Phase 1450ms: ma trận xoay, năng lượng bùng nổ khoảng 49%, lụa chạy nhanh rồi hạ.

## Runtime

* public/animation-direction.js: keyframes theo từng nhân vật/state, duration, loop và cue.
* public/skin-renderer.js: render art RGBA, dùng keyframes định hướng; không tự tính damage.
* public/sprite-mesh.js: biến dạng texture hiện tại; thay bằng atlas/rig khi art hoàn thành.
* public/animation-studio.html: chọn model/state, phát chậm 0.25×, kéo timeline, lưu PNG khung hình và xuất thông số JSON.
* public/assets/characters/manifest.json: dùng khóa định danh actor; atlas frame có quyền ưu tiên cao nhất.
* tools/normalize_sprite_strip.py: chuẩn hóa frame, cùng điểm chân và tỷ lệ.

## Chuẩn asset production

Mỗi action cần 6–12 frame thực sự thay đổi pose, nền RGBA trong suốt, không text hoặc cảnh. Ảnh phải giữ khuôn mặt, trang phục, tỷ lệ, silhouette và vũ khí nhất quán. Anchor bottom-center, không cắt tóc/kiếm/liềm. Đề xuất frame hero 256×384 hoặc 384×512, boss 512×768. File atlas WebP/PNG kèm metadata frames, columns, rows, frameWidth, frameHeight, fps và loop. Nếu sử dụng layer rig, phải tách: head, front-hair, back-hair, torso, armL, armR, legL, legR, cape, weapon cùng pivot.

**Ưu tiên hiển thị:** atlas approved → rig layers → original RGBA mesh → vector debug fallback. Không coi clip pose cùng một ảnh warp là atlas vẽ tay chất lượng sản phẩm.

## Checklist nghiệm thu

- [x] Có 4 sprite RGBA và tải qua manifest
- [x] Có keyframe art direction riêng theo từng model
- [x] Có Animation Studio scrubbing/preview
- [x] Có kiểm thử Node.js cho profile, loop và timeline
- [ ] Có 8 bộ frame vẽ thực cho từng model
- [ ] Có layer tách và rig bone đúng anatomy
- [ ] Có ảnh chụp QA ở từng state tại kích thước OBS 540×960
- [ ] Có số đo FPS/audio sync trên Windows OBS thật
- [ ] Được duyệt art model nhỏ khi đứng trong đội hình 40 nhân vật

Lệnh kiểm tra: npm test, npm start, truy cập http://127.0.0.1:8788/animation-studio, http://127.0.0.1:8788/models, http://127.0.0.1:8788/obs.
