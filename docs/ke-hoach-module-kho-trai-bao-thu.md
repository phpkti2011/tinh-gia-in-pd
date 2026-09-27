# Kế hoạch lập trình module tính khổ trải bao thư

- Đơn vị sử dụng: In Nhanh P&D.
- Ngày: 27/09/2026.
- Mục đích: tài liệu giao việc và nghiệm thu cho nhân viên lập trình.
- Phạm vi: nhập thông số bao thư → tính kích thước khuôn trải → chuyển dữ liệu sang module tính giá hiện có.

## 1. Phạm vi công việc

Module cần:

1. Nhận kích thước thành phẩm, kích thước nắp, tay dán, vị trí nắp và kiểu khuôn.
2. Tính khổ bao ngoài của khuôn cắt.
3. Hiển thị kích thước từng phần.
4. Chuyển kích thước, số lượng và trạng thái có in/không in sang module tính giá hiện có.

Không thực hiện trong đợt này: tính giá độc lập, bình trang, xét khổ máy, tự chọn kiểu khuôn, vẽ đường bế chi tiết hoặc xuất file khuôn bế. Không thay đổi công thức giá hiện có ngoài việc tích hợp đầu vào và xử lý phần không in.

## 2. Thông số và giao diện nhập liệu

| Trường | Quy tắc |
| --- | --- |
| Chiều ngang thành phẩm W | Bắt buộc, lớn hơn 0 |
| Chiều cao thành phẩm H | Bắt buộc, lớn hơn 0 |
| Chiều dài nắp N | Bắt buộc, lớn hơn 0; đo từ đường gấp đến mép ngoài nắp |
| Chiều rộng tay dán T | Bắt buộc, lớn hơn 0; dùng chung cho các tay dán |
| Đơn vị | mm hoặc cm; tính nội bộ bằng mm |
| Vị trí nắp | Cạnh W hoặc cạnh H; hiển thị rõ lựa chọn |
| Kiểu khuôn | Một trong ba kiểu bên dưới |
| Mặt sau có in | Chỉ hiển thị và sử dụng khi chọn tách hai phần |
| Số lượng bao thư | Số nguyên dương; lấy từ đơn hàng hiện có nếu đã có |

Ba kiểu khuôn:

- **Liền thân — nối đối diện nắp:** mặc định. Mặt trước và mặt sau nối nhau tại cạnh đối diện nắp.
- **Liền thân — nối cạnh bên:** mặt trước và mặt sau nối nhau tại cạnh vuông góc với cạnh mang nắp.
- **Tách hai phần:** phần trước gồm mặt trước, nắp và ba tay dán; mặt sau là một miếng rời.

Khi tách hai phần, yêu cầu chọn rõ **Có in mặt sau** hoặc **Không in mặt sau** trước khi chuyển tính giá. Phần trước được chuyển sang tính giấy và in.

Quy đổi đơn vị phải giữ nguyên kích thước thực: 35 cm = 350 mm. Khi đổi đơn vị hiển thị, phải quy đổi giá trị đang nhập, không giữ nguyên con số rồi diễn giải bằng đơn vị mới.

## 3. Hàm tính khổ trải

Tách hàm tính toán khỏi giao diện và khỏi module tính giá. Cùng một đầu vào phải trả về cùng một kết quả, không phụ thuộc trạng thái giao diện.

Tất cả công thức dưới đây dùng mm. W và H luôn là hai chiều thành phẩm theo đầu vào; không tự sắp xếp cạnh dài/cạnh ngắn.

| Kiểu khuôn | Vị trí nắp | Ngang khổ trải | Cao khổ trải |
| --- | --- | --- | --- |
| Liền thân — nối đối diện nắp | Cạnh W | W + 2T | 2H + N |
| Liền thân — nối đối diện nắp | Cạnh H | 2W + N | H + 2T |
| Liền thân — nối cạnh bên | Cạnh W | 2W + T | H + N + T |
| Liền thân — nối cạnh bên | Cạnh H | W + N + T | 2H + T |
| Tách hai phần — phần trước | Cạnh W | W + 2T | H + N + T |
| Tách hai phần — phần trước | Cạnh H | W + N + T | H + 2T |

Với khuôn tách hai phần, tạo thêm mặt sau:

```text
Ngang mặt sau = W − 3 mm
Cao mặt sau   = H − 3 mm
```

Ví dụ: bao thư 350 × 250 mm có mặt sau rời 347 × 247 mm, tương đương 34,7 × 24,7 cm.

### Quy tắc bắt buộc

- Mặt sau giảm **tổng mỗi chiều 3 mm**, không giảm 3 mm ở từng mép.
- Độ giảm 3 mm áp dụng sau khi đã quy đổi về mm.
- Không cộng bleed, biên máy hoặc khoảng cách bình bài vào khổ khuôn.
- Không tự đổi ngang/cao để cạnh dài luôn đứng trước.
- Không tự chuyển sang tách hai phần dựa trên kích thước thành phẩm.
- Nắp và tay dán đã nằm trong khổ trải; module giá không được cộng lần nữa.
- Giữ độ chính xác của phép tính; định dạng hiển thị không được làm thay đổi dữ liệu chuyển sang module giá.

## 4. Dữ liệu đầu ra và tích hợp

Trả về danh sách `parts`:

- Khuôn liền thân: một phần `body`.
- Khuôn tách: hai phần `front` và `back`.

| Thuộc tính mỗi phần | Ý nghĩa |
| --- | --- |
| `id` | Mã phần: `body`, `front`, `back` |
| `widthMm` | Ngang khổ trải, đơn vị mm |
| `heightMm` | Cao khổ trải, đơn vị mm |
| `quantity` | Số lượng phần cần có, bằng số lượng bao thư |
| `printEnabled` | Có tính in hay không |

Ví dụ: 100 bao thư 350 × 250 mm, nắp cạnh W, N = 40 mm, T = 15 mm, tách hai phần, mặt sau không in:

```json
{
  "schemaVersion": 1,
  "unit": "mm",
  "envelopeQuantity": 100,
  "construction": "split",
  "parts": [
    {
      "id": "front",
      "widthMm": 380,
      "heightMm": 305,
      "quantity": 100,
      "printEnabled": true
    },
    {
      "id": "back",
      "widthMm": 347,
      "heightMm": 247,
      "quantity": 100,
      "printEnabled": false
    }
  ]
}
```

Tên thuộc tính có thể điều chỉnh theo phần mềm hiện có nhưng phải giữ đủ ý nghĩa dữ liệu. Số lượng đầu ra là số chi tiết cần cho thành phẩm, chưa cộng hao hụt. Việc tính hao hụt giữ theo module giá hiện tại, tránh cộng hai lần.

### Quy tắc gọi module giá

| Trường hợp | Cách xử lý |
| --- | --- |
| Khuôn liền thân | Một phần, tính giấy và in |
| Tách hai phần, mặt sau có in | Tính giấy và in cho cả hai phần |
| Tách hai phần, mặt sau không in | Phần trước tính giấy và in; mặt sau chỉ tính giấy |

Mặt sau không in:

- Vẫn truyền đủ kích thước và số lượng để tính giấy.
- Tiền in bằng 0.
- Không áp phí in tối thiểu hoặc phí thiết lập in cho phần mặt sau.
- Không tự thêm gia công cho mặt sau trong module này.

Khi đổi thông số, tính lại toàn bộ danh sách phần. Chuyển từ tách hai phần sang liền thân phải bỏ phần mặt sau và chi phí liên quan khỏi lần tính mới. Nếu module giá tính bất đồng bộ, kết quả cũ không được ghi đè kết quả của đầu vào mới.

## 5. Hiển thị kết quả

- Khuôn liền: hiển thị một kích thước ngang × cao.
- Khuôn tách: hiển thị riêng phần trước và mặt sau.
- Mỗi phần hiển thị số lượng và trạng thái **Có in** hoặc **Chỉ tính giấy**.
- Có nhãn đơn vị rõ ràng.
- Ghi chú: **Kích thước khuôn chưa gồm bleed và biên in.**
- Nút **Chuyển sang tính giá**, hoặc cập nhật trực tiếp theo luồng hiện có của phần mềm.
- Nếu dữ liệu không hợp lệ, hiển thị lỗi ngay tại trường nhập và không chuyển kết quả cũ sang tính giá.

## 6. Kiểm tra dữ liệu

- W, H, N, T phải là số hữu hạn, lớn hơn 0.
- Số lượng phải là số nguyên dương.
- Đơn vị, vị trí nắp và kiểu khuôn phải thuộc danh sách được hỗ trợ.
- Với khuôn tách, W > 3 mm và H > 3 mm để mặt sau có kích thước dương.
- Khuôn tách phải có lựa chọn in mặt sau rõ ràng.
- Không coi ô trống là số 0 hoặc tự dùng lại kết quả hợp lệ trước đó.

Các kiểm tra trên xác nhận đầu vào và phép tính; không thay thế kiểm tra tính khả thi của mẫu khuôn sản xuất.

## 7. Bộ kiểm tra nghiệm thu

### 7.1. Công thức

Đầu vào chung: W = 350, H = 250, N = 40, T = 15 mm.

| Mã | Trường hợp | Kết quả ngang × cao |
| --- | --- | --- |
| F01 | Nối đối diện nắp, nắp cạnh W | 380 × 540 mm |
| F02 | Nối đối diện nắp, nắp cạnh H | 740 × 280 mm |
| F03 | Nối cạnh bên, nắp cạnh W | 715 × 305 mm |
| F04 | Nối cạnh bên, nắp cạnh H | 405 × 515 mm |
| F05 | Tách — phần trước, nắp cạnh W | 380 × 305 mm |
| F06 | Tách — phần trước, nắp cạnh H | 405 × 280 mm |
| F07 | Tách — mặt sau, cả hai vị trí nắp | 347 × 247 mm |

### 7.2. Hành vi và tích hợp

| Mã | Tình huống | Kết quả cần đạt |
| --- | --- | --- |
| I01 | Nhập W = 35, H = 25, N = 4, T = 1,5 cm | Kết quả giống bộ thông số mm ở trên |
| I02 | 100 bao thư, khuôn tách | 100 phần trước và 100 mặt sau |
| I03 | Tắt in mặt sau | Kích thước và số lượng không đổi; chỉ tính giấy mặt sau |
| I04 | Module giá có phí in tối thiểu | Mặt sau không in vẫn có tiền in bằng 0 |
| I05 | Bật lại in mặt sau | Tính lại phần in mặt sau theo module giá hiện có |
| I06 | Chuyển khuôn tách sang liền | Chỉ còn một phần; không còn chi phí mặt sau rời |
| I07 | Đổi cạnh nắp | Cập nhật theo đúng hàng công thức tương ứng |
| I08 | Thiếu dữ liệu, số âm, số không hữu hạn, số lượng lẻ | Chặn chuyển tính giá và báo lỗi phù hợp |
| I09 | Khuôn tách có W hoặc H không lớn hơn 3 mm | Chặn tính vì mặt sau không có kích thước dương |
| I10 | Đổi thông số sau lần tính trước | Không dùng lại kích thước hoặc chi phí cũ |
| I11 | Nhập kích thước có phần thập phân | Không làm tròn mất dữ liệu khi chuyển module giá |

## 8. Thứ tự triển khai

| Bước | Công việc | Sản phẩm bàn giao/điều kiện hoàn thành |
| --- | --- | --- |
| 1 | Đọc module giá hiện có | Xác định đầu vào kích thước, số lượng, cách tính giấy và cách bỏ toàn bộ phí in cho phần không in |
| 2 | Thống nhất hợp đồng dữ liệu | Cấu trúc đầu vào/đầu ra phù hợp dự án; giữ đủ các trường quy định |
| 3 | Viết hàm tính khổ trải | Hàm độc lập; đúng toàn bộ F01–F07 |
| 4 | Làm giao diện nhập và kết quả | Nhập thông số, chọn kiểu khuôn, hiển thị một hoặc hai phần |
| 5 | Tích hợp module giá | Đúng số phần và trạng thái in; không tính trùng nắp, tay dán hoặc hao hụt |
| 6 | Chạy kiểm tra và bàn giao | Hoàn thành bảng nghiệm thu; có hướng dẫn sử dụng ngắn |

Nhân viên sử dụng công nghệ và quy ước của dự án hiện tại; không cần tạo ứng dụng riêng hoặc thay đổi nền tảng chỉ để thêm module này.

## 9. Checklist bàn giao

- [ ] Có mã nguồn hàm tính khổ trải độc lập.
- [ ] Có giao diện nhập đủ thông số và ba kiểu khuôn.
- [ ] Đúng cả hai vị trí nắp W/H.
- [ ] Mặt sau rời giảm đúng 3 mm trên tổng mỗi chiều.
- [ ] Có lựa chọn có in/không in mặt sau cho khuôn tách.
- [ ] Mặt sau không in vẫn tính đủ giấy, tiền in bằng 0.
- [ ] Tích hợp được module giá hiện có, không thay đổi ngoài phạm vi cần thiết.
- [ ] Không cộng bleed hoặc biên in vào kích thước khuôn đầu ra.
- [ ] Không giữ phần thừa hoặc chi phí cũ khi đổi kiểu khuôn.
- [ ] Có kết quả kiểm tra công thức và hành vi tích hợp.
- [ ] Có hướng dẫn sử dụng ngắn và danh sách file mã nguồn đã thay đổi.

**Tiêu chí nghiệm thu cốt lõi:** đúng kích thước theo công thức đã chốt; mỗi bao thư tách cần một phần trước và một mặt sau; mặt sau không in chỉ tính giấy, không phát sinh tiền in.

## 10. Quyết định triển khai (chốt ngày 27/09/2026)

Người phụ trách đã chốt các điểm sau khi giao việc:

1. **Cách tích hợp:** module riêng "Tính Giá Bao Thư" trên trang chủ, theo mẫu module Lịch bàn. Module tự gọi engine In KTS khổ nhỏ cho từng phần; không chuyển người dùng sang màn KTS.
2. **Cài đặt giá riêng của bao thư** (trang Cài Đặt, chỉ admin): danh sách giấy KTS được phép và giấy mặc định; giá trị mặc định của nắp, tay dán, kiểu khuôn, vị trí nắp; phí bế khuôn theo bậc số lượng; phí dán bao thư theo bậc số lượng; phí cố định mỗi đơn và giá tối thiểu mỗi đơn; hệ số bán giấy mặt sau không in. Giá giấy, click in, bảng giá khách theo trang A4 và giá sàn in vẫn lấy từ cấu hình KTS khổ nhỏ.
3. **Mặt sau không in:** chỉ tính giấy theo giá ram trơn của KTS (số tờ giấy nguyên cần dùng × giá vốn/tờ), giá khách = vốn × hệ số; tiền in = 0; không áp giá sàn in.
4. **Ép nhũ:** có lựa chọn ép nhũ khi tính giá; giá và cài đặt lấy nguyên từ `EP_KIM_CONFIG` của KTS khổ nhỏ, tính theo số bao thư.
5. **Hình mô tả:** màn hình hiển thị hình khổ trải (nắp, mặt trước/sau, tay dán) kèm mô tả bằng chữ để người dùng kiểm tra trước khi báo giá.

Mã nguồn: `src/modules/envelope/`. Hướng dẫn sử dụng ngắn và danh sách file: `src/modules/envelope/README.md`.
