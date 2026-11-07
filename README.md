# Tam Phái Trấn Ma — Product V2: Animation & Sound

Ứng dụng LIVE game chạy cục bộ bằng **Node.js 22+**, không cần API AI trả phí. Đây là một bản engine + renderer đang chạy, **không phải ảnh giao diện hay video mô phỏng**.

## Chạy trên Windows 10/11

1. Giải nén vào thư mục mới, ví dụ `C:\TamPhaiTranMaV2`.
2. Chạy `start.cmd` hoặc mở PowerShell:

```powershell
cd C:\TamPhaiTranMaV2
node server.mjs
```

3. Mở `http://127.0.0.1:8788/admin` → nhấn **Bắt đầu sân luyện**.
4. Trang game: `http://127.0.0.1:8788/obs`. Nhấn **Bật âm thanh** ngay trên trang để mở AudioContext. Nếu dùng OBS Browser Source, mở **Interact** và nhấn **Bật âm thanh** trong Browser Source.
5. Trong OBS thêm **Browser Source**: URL `http://127.0.0.1:8788/obs`, kích thước **540 × 960**, đặt FPS 30 hoặc 60 phù hợp cấu hình. Bật tùy chọn điều khiển âm thanh qua OBS nếu cần.
6. Tại Admin chọn môn phái và Bậc 1–5: từng lần nhấn gửi hành động đến server, server thực hiện tính toán HP/heal/buff rồi phát animation event cho renderer.

Chế độ **DEMO** là một trận đánh thật do cùng engine xử lý, nhưng người tham gia được tạo từ dữ liệu thử. Chế độ **LIVE** sử dụng sự kiện nhận trực tiếp từ TikTok và chỉ tạo nhân vật khi xác định được tài khoản.

## Kết nối TikTok LIVE thật

```powershell
npm install tiktok-live-connector@2.5.0
npm start
```

- Trong Admin, nhập tên kênh đang LIVE và nhấn **Kết nối LIVE thật**.
- `!kiem`, `!huyen`, `!linh`: chọn môn. `!skill`: kỹ năng bậc 1 miễn phí, cooldown 12 giây.
- Một sự kiện quà đã chốt combo đi vào sổ chống trùng, sau đó cấp bậc tương ứng với giá trị kim cương trong sự kiện.
- `roomUser` chỉ cung cấp **số lượng người xem**; không tự dựng danh sách người xem và tên không tồn tại.
- Connector không chính thức có thể bị TikTok thay đổi; chưa kiểm thử kết nối đến một tài khoản đang LIVE trong phiên build này. Không có yêu cầu API key trả phí trong bản chạy demo.

## Chất lượng hiệu ứng V2

- **Hình ảnh:** 540×960, Canvas 2D sử dụng các lớp art riêng (background, boss, fighters, VFX, HUD); animation theo `requestAnimationFrame`, mục tiêu 60 FPS. Có cap 600 particles và 40 actor hiển thị, còn server xử lý toàn bộ người nhập môn.
- **Boss:** trạng thái idle/windup/impact/stun, vũ khí liềm vẽ riêng có hoạt ảnh, vòng triệu hồi, shield, AoE warning và flash/vibration.
- **Kiếm Tông:** sword slash, rain of swords, spell circle và rồng vàng vẽ chuyển động theo thời gian.
- **Huyền Môn:** talisman, tia sét phân nhánh và trận pháp có vòng rune quay.
- **Linh Dược:** vòng hồi phục, hoa sen cánh rời, phượng hoàng xanh, hồi sinh và số HP xanh.
- **Âm thanh:** 15 MP3 mono (compressed for GitHub; WAV stereo originals from source generator) do generator trong repo tổng hợp thành sample thật. Có mixer spatial panning, limiter/compressor, BGM bus, SFX bus và giới hạn polyphony.
- **Tính toán:** server thực hiện damage/heal/shield, player HP, boss 4 giai đoạn, 8 giây phá khiên và damage theo hitbox trước khi gửi event.
- **Giao diện:** thanh boss, số người LIVE từ nguồn thật, hiệu ứng và trạng thái, HUD ba môn, 5 bậc quà tặng.

## Files

| File | Chức năng |
| --- | --- |
| `server.mjs` | HTTP, SSE, điều khiển, TikTok adapter, save điểm |
| `engine.mjs` | Máy chủ điều khiển chiến đấu, trạng thái boss/người chơi |
| `public/arena.js` | Render nhân vật, boss, hiệu ứng và HUD |
| `public/fx.js` | VFX particle/projectile/lightning/lotus/phoenix/dragon |
| `public/audio.js` | SoundBank tải 15 MP3 và mix âm thanh |
| `public/obs.html` | Trang chiến trường dùng cho OBS |
| `public/admin.html` | Admin LIVE, sandbox kỹ năng, bảng sự kiện |
| `public/assets/arena-background.webp` | Nền trường đấu không chứa nhân vật tĩnh |
| `public/assets/boss-reference.webp` | Sprite boss tách từ ảnh người dùng gửi và tạo alpha mask |
| `generate_sfx.py` | Tạo lại bộ MP3 gốc, phụ thuộc numpy/scipy (chỉ cần khi phát triển audio) |

## Kiểm thử

```powershell
npm test
```

7 tests thuộc engine, không cần kết nối TikTok hay browser. Máy host tác giả hiện chạy qua Node 22; API tĩnh, SSE, WAV trả 200; chưa kiểm thử chất lượng FPS trực quan trên Windows/OBS thực tế.

## Giới hạn và việc còn cần hoàn thiện trước khi livestream quy mô lớn

1. Boss hiện là **sprite layer + vũ khí tách và procedural VFX**, chưa phải rig xương Spine/DragonBones từng chi được hoàn thiện. Hình chuyển động có thực nhưng chưa phải full skeletal-animation production.
2. Ba nhân vật môn phái hiện được vẽ bằng vector tách bộ phận với walk/attack/cast/down/revive; chưa có sprite atlas nhân vật vẽ tay cuối cùng.
3. Âm WAV là sample gốc được tạo tự động, bản phân phối nén MP3; cần nghe trên hệ thống OBS/loa thật để cân bằng và master chuyên nghiệp.
4. Hiện có snapshot SSE, điểm lưu bằng JSON; chưa có SQLite event replay/chống mất trận đầy đủ khi crash.
5. TikTok LIVE chưa được thực nghiệm trực tiếp; phiên bản connector có thể bị hạn chế tùy vùng/kênh và dịch vụ ký.
6. Tư liệu boss cắt từ ảnh tham chiếu của người dùng; kiểm tra quyền sử dụng hình mẫu trước khi khai thác thương mại. Nền được tạo mới cho dự án.

**Mức độ hoàn thiện:** playable V2 để kiểm tra animation/audio thật, chưa xác nhận phát hành thương mại. Không nhầm "đã code" với "đã nghiệm thu sản phẩm".

## Phát triển trên main

Bản V2 dùng `engine.mjs` và renderer `public/arena.js`. Các module V1 (`raid.mjs`, `fighters.mjs`, `combat.mjs`, `live.mjs` và bộ kiểm thử cũ) được giữ lại trong repository để tham chiếu, không tham gia vào entrypoint V2. Mọi thay đổi tới live/gameplay cần thêm test vào `tests/engine.test.mjs`.

## Hoạt ảnh 2D riêng từng model (V3)

Vào **http://127.0.0.1:8788/models** (hoặc nhấn liên kết ngay trong /admin) để mở **2D Animation Lab**. Trang này **dùng chính model renderer `public/models2d.js` của /obs**, không phải clip/video giả lập.

- **Kiếm Tông:** rig tay cầm kiếm, nhát chém, hai chân chạy so le, áo choàng theo bước di chuyển và phản ứng bị đánh.
- **Huyền Môn:** rig tay kết ấn, bùa phép xoay và tà áo tím chuyển động.
- **Linh Dược:** rig pháp trượng, liên hoa và động tác nâng tay hồi phục.
- **Hồng Liên Ma Tướng:** rig đầu, tóc, tay cầm liềm, tay tung pháp, váy, lụa phía sau, pháp trận và trạng thái choáng.
- Tất cả nhân vật có 8 trạng thái `idle`, `run`, `attack`, `cast`, `hit`, `down`, `revive`, `victory` (boss có chuỗi trạng thái phù hợp riêng).
- Bạn có thể chọn từng hoạt ảnh hoặc bật chuỗi chạy tự động. Trên đấu trường thật, hoạt ảnh được kích hoạt theo state từ **Node.js RaidEngine**, không phát độc lập với chiến đấu.

**Lưu ý mỹ thuật:** Đây là cutout rig 2D tạo hình bằng Canvas với khớp chuyển động; **chưa phải nhân vật Spine/Rive có atlas mỹ thuật được tách và rig thủ công**. Những rig hiện tại cho thấy chuyển động rõ ràng nhưng vẫn cần nâng cấp sprite/texture và kiểm tra FPS trên máy OBS để đạt mức hoàn thiện thương mại. Chạy `npm test` để kiểm thử state machine và các tư thế 2D.

## V4 — Đồng bộ hoạt ảnh với chiến đấu thật

Mở **http://127.0.0.1:8788/models** để xem từng model. Chọn một hoạt ảnh rồi trang sẽ **lặp lại hành động đó** đến khi đổi lựa chọn; chế độ tự động lần lượt chạy tám trạng thái. Đấu trường LIVE vẫn mở tại \`/obs\`.

- Mỗi lần chém/tụ pháp có \`actionSeq\`, \`actionAt\`, \`actionDuration\` riêng, kể cả khi hai lần liên tiếp sử dụng cùng một hành động; renderer giữ đúng tiến trình giữa các gói SSE.
- Đòn đánh thường được đặt lịch va chạm sau **240 ms**: model vung vũ khí trước, server mới tính sát thương. SFX mở đầu và SFX trúng đích có thời điểm khác nhau, dùng file theo từng môn phái.
- Animation tạo hình có ba nhịp: chuẩn bị, thi triển, thu hồi. Đòn bậc 5 có timeline dài hơn đòn thường.
- Boss có hoạt ảnh bị trúng đòn (giới hạn tần suất để không giật khi đông người), niệm khiên, choáng, thi triển đòn, chuyển giai đoạn, chiến thắng và gục.
- Vị trí nhân vật được nội suy từ tọa độ đang hiển thị thay vì tọa độ snapshot cũ, hạn chế giật lùi khi stream cập nhật 10 Hz.
- Các test trong \`tests/animation-timeline.test.mjs\` kiểm tra sát thương theo thời điểm, phát lại cùng state, pha animation, khiên boss và cue âm thanh.

**Giới hạn hiện tại:** Rig dùng Canvas/vector cắt lớp. Chưa có bộ sprite anime riêng cho từng môn phái và boss với texture atlas được vẽ, tách lớp và rig theo tiêu chuẩn Spine thương mại. Đây là hướng nâng cấp mỹ thuật tiếp theo; tuyệt đối không thay bằng hình minh họa cố định hoặc video giả lập.

## Game Studio: thiết kế từng animation model

Mở **http://127.0.0.1:8788/animation-studio**. Trang này sử dụng bốn texture WebP đã có trong game và cùng renderer /obs, không phải giao diện giả lập ảnh đẹp.

- Chọn **Kiếm Tông / Huyền Môn / Linh Dược / Hồng Liên** rồi chọn 8 state hoặc các chiêu boss.
- Xem ở 0.25×, kéo scrub 0–100%, tua lại, chọn cue, lưu PNG khung hình và xuất JSON storyboard.
- Timeline riêng từng môn nằm tại public/animation-direction.js; sprite-mesh.js nhận kinematics của các track này để vẽ trên texture RGBA thật.
- Thời lượng các chiêu trên LIVE vẫn bị khóa theo server actionSeq/actionAt/actionDuration. Khi có atlas nhiều frame được duyệt, SkinRenderer ưu tiên atlas.
- Chuẩn vẽ và checklist còn lại: docs/ANIMATION_MODEL_DESIGN.md. **Chưa có** full bone rig/atlas vẽ tay và chưa kiểm thử FPS OBS trên Windows thật.

