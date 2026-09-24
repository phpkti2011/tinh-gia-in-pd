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
