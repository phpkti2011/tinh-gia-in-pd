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
