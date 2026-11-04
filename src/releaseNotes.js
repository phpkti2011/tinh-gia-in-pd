// Danh sách bản phát hành — VIẾT CHO NHÂN VIÊN ĐỌC, không phải cho lập trình viên.
//
// Dùng ở hai chỗ: băng "Đã có bản mới" dưới đáy màn hình, và bảng "Đã cập nhật" hiện
// một lần sau khi tải lại. Xem components/common/UpdateBanner.jsx.
//
// ⚠ KHÔNG nhầm với các file modules/*/config/version.js: những cái đó là phiên bản
// HÌNH DẠNG của bảng giá lưu trên Supabase, không liên quan tới bản phát hành của app.
//
// Quy ước:
//   - Mới nhất đứng ĐẦU mảng.
//   - `id` là duy nhất và KHÔNG được sửa sau khi đã deploy: máy của nhân viên nhớ id
//     này để biết đã xem bản nào rồi. Sửa id là mọi máy tưởng có bản mới.
//   - `items` viết bằng lời thường, nói CÁI GÌ ĐỔI VỚI NGƯỜI DÙNG, không nói tên hàm.
//
// Mỗi lần deploy có thay đổi người dùng thấy được thì thêm một mục ở đầu mảng.

export const RELEASE_NOTES = [
    {
        id: '2026-11-03-kts-boi-keo-2-mat',
        date: '2026-11-03',
        title: 'In KTS khổ nhỏ: thêm kiểu bồi keo 2 mặt',
        items: [
            'Ô "Bồi thành phẩm" có thêm 2 kiểu: "Bồi keo 2 mặt – 2 lớp" (dán 1 tấm keo) và "Bồi keo 2 mặt – 3 lớp" (dán 2 tấm keo).',
            'Mỗi tấm keo tính như cán màng 1 mặt theo trang A4 của tờ in, cộng thêm tiền chênh do admin nhập. Ví dụ 50 tờ in khổ A4, giá cán 1.000đ/trang, chênh 500đ/trang thì bồi keo 2 lớp là 75.000đ, 3 lớp là 150.000đ.',
            'Bồi keo không tính bảng công bồi 2 lớp / 3 lớp. Số tờ in và tờ giấy trắng vẫn đếm như bồi thường.',
            'Admin nhập tiền chênh báo khách (đ/trang A4) và chênh giá vốn (đ/m dài) trong Cài Đặt → Giá Bồi Thành Phẩm → Bồi keo 2 mặt. Chưa nhập thì chênh = 0, tức là bằng đúng giá cán màng.',
        ],
    },
    {
        id: '2026-11-03-kts-in-nguyen-to',
        date: '2026-11-03',
        title: 'In KTS khổ nhỏ: tự thử in nguyên tờ giấy lớn',
        items: [
            'Trước đây khổ giấy "Tùy chọn" hơi hẹp (ví dụ giấy 32 × 44 cm, thành phẩm 30 × 42 cm) báo không tính được, vì không có khổ tờ in cố định nào cắt ra từ giấy đó mà chứa vừa thành phẩm.',
            'Nay nếu tờ giấy lớn vừa khổ máy in thì phần mềm thử luôn phương án in nguyên tờ (không cắt), lề in tính như tờ in thường.',
            'Giấy khổ chuẩn 65 × 86, 79 × 109… quá rộng so với máy nên không đổi gì.',
        ],
    },
    {
        id: '2026-11-02-mang-can-tien-chenh',
        date: '2026-11-02',
        title: 'Loại màng cán: phụ thu bằng tiền chênh thay vì %',
        items: [
            'Màng đặc biệt (7 màu, kim tuyến, nhung…) giờ tính = giá cán Mờ/Bóng + một khoản chênh cố định. Ví dụ 100 trang A4 cán Mờ 100.000đ, màng 7 màu chênh 1.000đ/trang thì ra 200.000đ.',
            'Trước đây tính theo %, nên đơn ít trang bị đội giá rất cao còn đơn nhiều trang gần như không thu thêm. Nay đơn ít hay nhiều đều chênh đúng một khoản như nhau trên mỗi trang (hoặc mỗi tờ / mỗi cái, tuỳ module).',
            'Áp cho In KTS khổ nhỏ, Catalogue, Sổ lò xo và Decal. Tờ rơi và Decal nhãn giá rẻ chỉ dùng màng Mờ/Bóng.',
            'Loại màng nào CHƯA nhập tiền chênh thì vẫn tính theo % cũ, giá không đổi. Admin vào Cài Đặt của từng module, nhập tiền chênh cho từng loại màng. Ở In KTS có thêm ô chênh giá vốn (đ/m dài màng).',
            'Catalogue, Sổ lò xo và Decal lấy bảng màng và tiền chênh theo In KTS khổ nhỏ: Cài Đặt của 3 module này có nút "Lấy giá màng theo In KTS" để thêm màng còn thiếu và điền tiền chênh, bấm Lưu để áp dụng. Catalogue chưa lưu bảng giá riêng nên tự có sẵn bảng này.',
            'Decal (cả tem lẻ lẫn bế demi): tiền chênh màng đặc biệt nhập cho 1 trang A4, hệ thống tự nhân với số A4 của khổ tờ in theo bảng giống In KTS (tờ 33 x 35 = 1,5 A4; 33 x 48 = 2,4 A4). Mờ/Bóng không đổi.',
            'Tờ rơi và Decal nhãn giá rẻ chỉ có màng Mờ/Bóng, không có màng đặc biệt.',
        ],
    },
    {
        id: '2026-11-02-lich-kho-chuan',
        date: '2026-11-02',
        title: 'Mới: Tính Giá Lịch Khổ Chuẩn',
        items: [
            'Trang chủ có thêm ô "Tính Giá Lịch Khổ Chuẩn" cho lịch để bàn 2026 khổ có sẵn: 17×15, 15×17, 20×15, 25×15 và 25×15 loại 2 phần.',
            'Chọn quy cách bằng hình, nhập số lượng là ra giá trọn gói theo bảng giá (từ 1 đến 3.000 cuốn). Trên 3.000 cuốn phần mềm báo "cần báo giá riêng".',
            'Số lượng nằm giữa hai bậc giá: dưới 70% khoảng giữa thì tính đơn giá bậc dưới, từ 70% trở lên tính đơn giá bậc trên.',
            'Có nút Sao chép báo giá, xem được cả bảng giá theo số lượng. Nếu đặt nhiều hơn lại rẻ hơn (ví dụ 90 cuốn đắt hơn 100 cuốn) thì có dòng nhắc để gợi ý khách.',
            'Bảng giá này cố định trong phần mềm, chưa sửa được ở Cài Đặt. Muốn đổi giá hãy báo admin.',
        ],
    },
    {
        id: '2026-10-20-kho-lon-gia-toi-thieu-ca-don',
        date: '2026-10-20',
        title: 'In Khổ Lớn: đơn nhiều tấm nhỏ không còn bị tính giá tối thiểu từng tấm',
        items: [
            'Trước đây "Giá in tối thiểu" và "Giá cán màng tối thiểu" bị áp cho TỪNG tấm rồi nhân số lượng, nên đơn nhiều tấm nhỏ (ví dụ 80 tấm 2×80 cm) ra giá cao gấp nhiều lần so với diện tích thật.',
            'Nay khổ lớn tính theo tổng mét vuông của cả đơn (mét dùng + mét dư không in vẫn tính). Giá tối thiểu chỉ áp MỘT lần cho cả đơn; nếu tổng chưa tới mức tối thiểu thì có thêm dòng "Bù cho đủ giá tối thiểu".',
            'Đơn lớn không đổi giá. Chỉ đơn có nhiều tấm nhỏ là rẻ đi. Bảng giá trong Cài Đặt không phải nhập lại.',
        ],
    },
    {
        id: '2026-10-16-so-lo-xo-bia-kinh',
        date: '2026-10-16',
        title: 'Sổ lò xo: nhập số trang bìa, bìa kính tính theo khổ',
        items: [
            'Sổ Lò Xo có thêm ô "Số trang bìa" (mặc định 4 trang = 2 tờ in 2 mặt, trước + sau). Muốn bìa dày hơn thì nhập 8, 12... Chọn in bìa 1 mặt thì ô tự về 2 trang (2 tờ).',
            'Mục "Bìa lót ngoài" đổi tên thành "Bìa kính bao ngoài trước sau (mỗi cuốn 2 tờ)".',
            'Giá bìa kính trong Cài Đặt là giá khổ A4. Chọn khổ A5 thì phần mềm tự chia 1.5, khổ A6 chia 2.5; hệ số này sửa được ở Cài Đặt. Khổ không chuẩn tính theo khổ nhỏ nhất mà thành phẩm lọt vào.',
            'Thành phẩm lớn hơn A4 mà chọn bìa kính thì phần mềm báo "báo giá riêng, liên hệ admin" thay vì ra giá. Không chọn bìa kính thì tính bình thường.',
            'Bìa kính chưa điền giá thì vẫn ra 0 đ như trước — nhớ điền giá A4 trong Cài Đặt.',
        ],
    },
    {
        id: '2026-10-03-decal-lam-lot-lich',
        date: '2026-10-03',
        title: 'Giấy lót lịch bàn dùng được decal giấy',
        items: [
            'Cài Đặt lịch bàn, mục "Vật liệu được phép dùng cho áo và lót": phần Giấy lót có thêm "Decal giấy đế mỏng (VHM)" và "Decal giấy đế dày (LH)". Tích vào rồi lưu thì màn Tính Giá chọn được.',
            'Decal nhựa vẫn tích được cho cả áo và lót như trước. Decal giấy chỉ dành cho lót.',
            'Lót bằng decal: chọn xong thì ô "Khổ giấy lót" tự chuyển sang khổ decal và lấy sẵn khổ 33 × 48 cm. Vẫn in 1 mặt và cán màng 1 mặt được như giấy thường; tiền cán tính riêng theo mét vuông.',
            'Khi tích "In giấy lót" mà đang dùng decal, ô "Khổ giấy lót" được thay bằng dòng ghi chú: khổ do phần mềm tự chọn theo phương án in, xem khổ thật ở sơ đồ "Cắt giấy lót". Trước đây ô này vẫn hiện nhưng đổi khổ không làm đổi giá. Giấy thường thì ô khổ vẫn dùng bình thường.',
            'Mặc định giấy lót vẫn là C150 và F120 — không tích thì không có gì thay đổi.',
            'Sửa lỗi lịch bàn báo đỏ "Chưa xác nhận được bảng giá từ máy chủ" và không cho báo giá: máy chủ chưa nhận bảng giá phiên bản mới nên lần lưu nào cũng hỏng. Nay phần mềm nói đúng nguyên nhân thay vì báo như mất mạng.',
        ],
    },
    {
        id: '2026-10-02-kho-tam-carton',
        date: '2026-10-02',
        title: 'Khổ tấm carton khai riêng cho từng loại (lịch bàn)',
        items: [
            'Cài Đặt lịch bàn: bảng giá carton lạnh có thêm ô "Ngang" và "Dài" cho từng loại carton. Hai ô "Cạnh nạp / Chiều dài tấm carton" ở mục Kích thước đã chuyển vào đây; ô "Khổ ngang máy cắt" vẫn giữ nguyên chỗ cũ.',
            'Bấm "+ Thêm loại carton lạnh" để thêm loại khổ khác; loại mới lấy sẵn khổ của loại đầu tiên, sửa lại rồi lưu. Ngang là cạnh đưa vào máy cắt nên phải nhỏ hơn hoặc bằng khổ ngang máy.',
            'Bảng giá carton có thêm hai cột chỉ để xem: "Vốn / cm² tấm nguyên" (vốn một tấm chia cho ngang × dài) và "Khách / Vốn" (giá khách gấp bao nhiêu lần vốn) — tiện đối chiếu từng bậc. Đây là cm² tấm nguyên, chưa trừ hao khi cắt phôi.',
            'Màn Tính Giá: chọn loại carton khác thì số tấm nguyên và sơ đồ cắt đổi theo đúng khổ của loại đó. Dòng Carton lạnh ghi thêm vốn mỗi cm² tấm nguyên và vốn mỗi cm² thành phẩm thực tế của đơn.',
            'Bảng giá đang dùng không phải nhập lại: phần mềm tự điền khổ cũ vào từng loại, giá không thay đổi.',
        ],
    },
    {
        id: '2026-10-02-dan-thanh-pham',
        date: '2026-10-02',
        title: 'Dán thành phẩm cho In KTS khổ nhỏ',
        items: [
            'In KTS khổ nhỏ: mục Thành Phẩm có thêm ô "Dán thành phẩm". Bấm "+ Thêm kiểu dán" để thêm từng kiểu keo (dán keo phá màng, dán keo 2 mặt vàng…); một đơn thêm được nhiều dòng dán, mỗi dòng tính cho toàn bộ số lượng.',
            'Cài Đặt In KTS: có bảng giá "Dán Thành Phẩm" — thêm, đổi tên, xoá kiểu dán; mỗi kiểu có các bậc số lượng, mỗi bậc chọn trọn gói hoặc tính theo từng sản phẩm.',
            'Giá dán ban đầu là giá mẫu: quản trị viên cần kiểm tra và sửa lại trong Cài Đặt trước khi báo khách.',
        ],
    },
    {
        id: '2026-09-24-gia-san',
        date: '2026-09-24',
        title: 'Giá sàn cho In KTS khổ nhỏ + Bế Formex',
        items: [
            'In KTS khổ nhỏ: giá báo khách không còn xuống dưới giá vốn. Đơn nào bảng giá ra thấp hơn mức sàn sẽ có thêm dòng "Phụ thu tối thiểu".',
            'Giấy tính theo ram dùng mức sàn đã gồm tiền giấy; decal cuộn, decal xi và giấy mỹ thuật dùng mức sàn chỉ in rồi cộng tiền giấy thật.',
            'In khổ lớn: thêm thành phẩm "Bế Formex", giá theo hình dạng và theo tổng mét vuông của đơn.',
            'Từ nay khi có bản mới, màn hình sẽ tự báo mà không cần tắt mở lại trình duyệt.',
        ],
    },
    {
        id: '2026-09-23-kho-giay-nghich-bac',
        date: '2026-09-23',
        title: 'Nhiều khổ giấy và cảnh báo bảng giá nghịch bậc',
        items: [
            'Giấy khổ cố định (decal xi bạc/vàng) khai được nhiều khổ, mỗi khổ một giá riêng.',
            'Cài Đặt: bảng giá khách tự tô đỏ những bậc mà khách đặt thêm lại trả ít hơn.',
        ],
    },
];

export const CURRENT_RELEASE = RELEASE_NOTES[0];
