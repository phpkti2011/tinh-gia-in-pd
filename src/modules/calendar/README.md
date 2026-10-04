# Tính giá lịch bàn

Điểm vào: `ui/CalendarModule.jsx`. Trang chủ tải module bằng `React.lazy`.

## Ranh giới

- `calculateCalendar(input, calendarConfig, printConfig)` là engine thuần; nhận cấu hình KTS hiện tại, không đọc storage/network.
- `smallPrintAdapter.js` gọi trực tiếp engine small-print cho tờ lịch, vùng in áo, giá sàn và ép kim. Không sửa hoặc ghi lại bảng giá KTS.
- Vật liệu áo/lót do admin tích trong Cài Đặt. Danh sách chào ra khác nhau theo phần: **áo** gồm giấy ram và decal nhựa; **lót** có thêm **decal giấy** (đế mỏng/đế dày). Decal tính theo tờ (xi bạc/vàng) không được chào vì `paperQuote` chỉ dựng khổ cho `ream` và `sqm`. Mọi giấy tính theo m² lấy khổ từ `DECAL_SHEET_SIZES`; giao diện chọn khổ phải bám `pricingModel === 'sqm'` (`usesDecalStock`) chứ không dò theo tên, nếu không chỉ số khổ của ô chọn lệch khỏi danh sách engine tra mà không báo lỗi.
- Áo bồi chọn trực tiếp C150, mỹ thuật hoặc decal nhựa. Mỹ thuật phải nhập định lượng dưới 150 gsm và không cán màng; C150/decal cán ít nhất một mặt. C200 trở lên không dùng bồi áo. Giấy lót chọn độc lập. Decal có in dùng bộ tính m² KTS; decal không in tính đủ tờ theo khổ đã chọn và giá m², cán được cộng riêng một lần.
- `config/normalize.js` nâng hình dạng bảng giá cũ ngay khi đọc (điền `materials.carton[i].w/h` từ `geometry.stockW/stockH`, fallback 60 × 100) và đồng bộ bản sao `geometry.stockW/stockH` theo loại carton đầu tiên ở mọi đường ghi. Việc nâng cấp này không đổi giá một đồng và không bắt admin xác nhận lại. Hai field `geometry.stockW/stockH` nay chỉ là **bản sao**: engine không đọc, Cài Đặt không cho sửa, giữ để bundle cũ và đường rollback vẫn báo giá đúng.
- `config/storage.js` chỉ ghi cache/nháp lịch (`calendarConfig`, `calendarConfigDraft`, đọc tương thích `calendarConfigPending`). Đọc lịch và KTS cùng một lượt từ máy chủ; chỉ ghi module cloud `calendar` qua RPC riêng có kiểm tra phiên bản. Không sửa storage/module cũ.
- Cài đặt dùng AdminGate hiện có; RPC cloud vẫn kiểm tra admin phía server. Local cache không phải ranh giới bảo mật.
- Giao diện chỉ hiện tổng/cột giá vốn, vốn đế và ô nhập vốn giấy mỹ thuật khi đã xác nhận tài khoản admin; ẩn khi chưa đăng nhập, đang xác thực hoặc lỗi quyền. Đây là phân quyền hiển thị, không thay đổi việc tính giá trên client.

## Quy tắc chính

- Ngang: W = max(A,B), H = min(A,B); đứng: ngược lại.
- Carton: 2 mặt W×H, 2 chân W×3 cm; mỗi kích thước phôi cộng 4 mm (không phải 8 mm).
- Áo: (W+5)×(2H+13,1) cm. Vùng in trừ 5 mm ở cả bốn mép.
- Lót: (W−0,4)×(2H+2,1+6−0,4) cm. Giá bán lót = vốn×2, cộng vào đế đúng một lần, không tra bậc.
- Mục **Cài Đặt → Giá giấy lót trong** cho sửa hệ số bán và số lót/đế, giải thích nguồn vốn giấy ram KTS và dẫn đến danh mục giấy mỹ thuật.
- Giấy áo/lót độc lập: giấy ram KTS hoặc mỹ thuật theo khổ chuẩn/tùy chọn và giá 1 tờ nhập riêng.
- Lót dùng được decal (nhựa hoặc giấy): tính theo m² của khổ decal đã chọn, có thể in 1 mặt và cán màng 1 mặt — cán tính riêng ở dòng `liner-lam` theo m² và bậc số cuốn. Mặc định lót vẫn là C150/F120; muốn dùng decal thì admin tích trong Cài Đặt trước.
- Vốn carton tra bậc theo số tấm nguyên; báo khách carton tra theo số cuốn và diện tích thành phẩm. Các nhóm lò xo/công/cán tra theo số cuốn. Bậc cuối không có giới hạn trên.
- **Khổ tấm carton khai riêng cho từng loại** (`materials.carton[i].w/h`, cm), không còn là thông số chung. `w` là cạnh nạp vào máy cắt và phải ≤ khổ ngang máy; engine không tự xoay tấm nguyên. Loại carton đang chọn ở màn tính giá quyết định sơ đồ cắt và số tấm.
- Bảng giá carton có hai cột **chỉ đọc** để admin đối chiếu: `Vốn / cm² tấm nguyên` = vốn một tấm ÷ (ngang × dài), và `Khách / Vốn` = giá khách mỗi cm² ÷ vốn mỗi cm². Con số này tính trên cm² tấm **nguyên**, chưa trừ hao cắt và chưa tính phần bù mỗi chiều, nên vốn thật mỗi cm² **thành phẩm** luôn cao hơn. Dòng kết quả báo giá ghi cả hai con số (`result.carton.costPerRawCm2` và `costPerFinishedCm2`).
- Giá áo in cho phép toàn bộ báo giá KTS theo vùng in hoặc tiền in KTS cộng giấy theo hệ số vốn. Áo trắng cho phép vốn×hệ số hoặc gộp trong giá đế. Mặc định chưa thiết lập vì người dùng chưa chốt hai quy tắc này.
- Bảng giá mới ban đầu là giá mẫu. Chỉ xuất tổng/sao chép báo khách khi admin xác nhận bảng giá và chọn quy tắc áo tương ứng.
- Ép kim dùng tổng KTS cho cả cột vốn và khách; KTS chưa cung cấp giá vốn ép kim độc lập.

## Cắt carton

Khổ tấm nguyên lấy theo **loại carton đang chọn** (khai trong Cài Đặt → Bảng giá carton lạnh; mặc định 60 × 100 cm), cạnh Ngang là cạnh nạp vào máy 76 cm. Sinh các dải cắt ngang rồi cắt cột trong từng dải đã tách; dải đem xoay phải lọt ngang máy. Tìm tổ hợp tối đa hai mẫu cắt, chọn ít tấm nhất trong tập ứng viên và ít phôi thừa nhất khi bằng số tấm. Kiểm tra từng phôi không chồng/vượt biên. Lưới tính nội bộ 0,1 mm: phôi làm tròn lên, khổ nguyên làm tròn xuống.

Đây là thuật toán tìm phương án khả thi, không chứng minh tối ưu toàn cục. Cận dưới diện tích chỉ để đối chiếu. Số tấm, phôi cần/dư, hình SVG và hướng dẫn cắt đều dùng cùng kết quả. Giới hạn tìm kiếm: 500 phôi/dải, 1.200 phôi/mẫu; tối đa 2.000 lần thử số tấm mẫu thứ nhất trong mỗi cặp, mẫu còn lại được tính đủ nhu cầu. Các giới hạn không làm thiếu phôi; có thể làm phương án kém tối ưu với khổ rất nhỏ/đơn lớn. Nếu không tìm được mẫu thì báo lỗi, không báo giá theo diện tích thay thế.

## Triển khai cài đặt

1. Module chạy trong bản build của phần mềm.
2. Chạy `docs/database/migration-calendar-module.sql` trong Supabase khi triển khai đồng bộ. File chỉ mở rộng CHECK module và danh sách cho phép trong RPC, giữ các kiểm tra quyền và dữ liệu cũ. Chưa tự chạy migration trong phiên triển khai mã nguồn này.
3. Admin mở **Cài đặt giá lịch**, cập nhật giá, chọn cách bán áo và xác nhận bảng giá; lưu phải báo **đã đồng bộ** để dùng trên nhiều máy.
4. Nếu lỗi cloud, giữ bản nháp riêng và chặn báo giá. Tự gửi lại dưới tài khoản admin đã lưu nháp; RPC từ chối bản cũ ghi đè phiên bản mới, gửi lại cùng dữ liệu không tạo lịch sử trùng. Bản nháp từ phiên bản cũ dùng phiên bản gốc 0, chỉ tạo mới hoặc xác nhận dữ liệu đã giống máy chủ.
5. Trong lúc mở module, tự đọc cả bảng lịch và KTS mỗi 15 giây, khi trở lại cửa sổ/tab và khi có mạng. Mất mạng, thiếu bảng giá hoặc dữ liệu không hợp lệ thì ẩn toàn bộ kết quả tiền. Không dùng cache/default để báo khách. Trước sao chép phải kiểm tra máy chủ lần nữa; nếu phiên bản đổi thì tính lại và yêu cầu kiểm tra kết quả trước khi sao chép.
6. Giá thay đổi tự tính lại. Danh mục giấy/vật tư đổi thứ tự hoặc thêm/bớt thì yêu cầu kiểm tra lại lựa chọn để tránh áp giá loại khác theo chỉ số cũ. Nháp đang chỉnh không bị làm mới ghi đè. Khi xung đột, dùng nút **Nạp bảng giá đã đồng bộ để chỉnh lại**, đối chiếu và lưu từ phiên bản mới.

### Kiểm thử cơ sở dữ liệu độc lập

Không kết nối Supabase thật. Chạy migration trên PostgreSQL WASM, kiểm tra quyền, phiên bản, gửi lại và giữ nguyên module cũ:

```powershell
npm install --prefix tmp/calendar-db-check --no-save --ignore-scripts @electric-sql/pglite
node scripts/check-calendar-migration.cjs
```

Kiểm chứng này không thay thế bước áp dụng migration và xác nhận lưu/đọc giữa các máy trên Supabase thật.

## Kiểm chứng

Các test `tests/golden/calendar.*` kiểm tra công thức, hướng, bù cắt, số phôi, bậc giá, nối KTS, không cộng trùng, nguồn giấy và lưu riêng. `tests/components/Calendar.test.jsx` kiểm tra chọn giấy độc lập, thêm bậc/loại, admin/staff và lưu thất bại.

Chạy đầy đủ trong môi trường test không có Supabase thật (không đổi `.env.local`):

```powershell
node -e "process.env.VITE_SUPABASE_URL='';process.env.VITE_SUPABASE_ANON_KEY='';process.argv=['node','vitest','run','--maxWorkers=2','--minWorkers=1'];import('./node_modules/vitest/vitest.mjs')"
npm run build
```

Quay lui: gỡ import/tile/nhánh lịch trong App và nhãn lịch. Các engine/module cũ không phụ thuộc lịch. Không xóa dữ liệu cũ.
