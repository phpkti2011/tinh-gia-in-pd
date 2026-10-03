# THUẬT TOÁN XẾP HÌNH CHO PDF IMPOSING

Phiên bản tài liệu: 1.0 · Ngày: 02/10/2026 · Đơn vị thiết kế: mm.

## 1. Mục đích và cách sử dụng

Tài liệu độc lập để chuyển kiến thức và thuật toán từ module Decal Bế Demi sang dự án PDF Imposing. Nội dung bao gồm thuật toán đang có, các nhóm thuật toán bổ sung đã thảo luận, cơ chế kết hợp nhiều thuật toán trong một lần xếp, hợp đồng dữ liệu, kiểm tra hình học và tích hợp bình trang PDF.

Đây là **đặc tả triển khai mở rộng kèm mã nguồn nền**, không phải thư viện hoàn chỉnh đã cài đặt tất cả thuật toán. Phụ lục A chứa nguyên mã JavaScript hiện tại có thể tách ra thành module. Các phần ghi “bổ sung” là thiết kế và mã giả cần triển khai, kiểm thử trong dự án đích. Việc tạo tài liệu này không thay đổi engine đang chạy của phần mềm tính giá.

“Toàn bộ” trong tài liệu nghĩa là toàn bộ nhóm phương pháp và cách kết hợp được đóng gói ở đây; không tuyên bố liệt kê mọi biến thể từng được nghiên cứu. Thêm nhiều heuristic không tự động chứng minh tối ưu toàn cục.

Đọc theo thứ tự: mục 2–5 để chốt bài toán, mục 6–10 để triển khai thuật toán, mục 11–14 để nối với PDF và nghiệm thu. Mã nền ở cuối tài liệu giúp sử dụng mà không cần truy cập dự án gốc.

## 2. Hiện trạng engine nguồn

Nguồn: `src/modules/decal/engine/layout.js` trong dự án tính giá in, được đọc trực tiếp khi lập tài liệu.

| Thành phần | Trạng thái trong mã nguồn | Giới hạn |
|---|---|---|
| `getPrintableArea` | Có | Tính kích thước vùng in; không trả tọa độ lề trái/trên |
| `uniformGrid` | Có | Lưới cùng hướng trong một vùng |
| `packRectangles` | Có | Guillotine dạng khối tham lam, thử 0°/90°, độ sâu mặc định 4 |
| `calculateStaggeredLayout` | Có | DP trộn hàng thẳng/so le với hai vị trí ngang |
| `calculateStickersPerSheet` | Có | Chọn ứng viên theo hình; oval có thêm ứng viên hộp chữ nhật |
| `calculateSheetsPerPrintSheet` | Có | Xếp nguyên tờ sticker lên tờ in |
| MaxRects, Skyline, Shelf | Chưa có | Đặc tả bổ sung trong tài liệu |
| Chia vùng dùng nhiều thuật toán, lấp khoảng trống tổng quát | Chưa có | Đặc tả bổ sung |
| Beam Search, cải thiện cục bộ, SA, GA, Tabu, LNS | Chưa có | Đặc tả bổ sung |
| NFP, xếp đường viền, tọa độ tự do | Chưa có | Đặc tả bổ sung |
| Bộ giải chính xác và chứng minh tối ưu | Chưa có | Đặc tả bổ sung |
| Gán trang PDF, in hai mặt, bình sách, xuất PDF | Không thuộc engine nguồn | Lớp tích hợp riêng |

Engine nguồn xếp nhiều bản sao cùng kích thước. Với oval, “chạy DP và Guillotine rồi chọn” là thi đua giữa các bố cục hoàn chỉnh, chưa phải ghép hai thuật toán trong một bố cục. Với chế độ tờ sticker, số sticker bên trong tờ do người dùng nhập.

## 3. Chốt bài toán và mục tiêu trước khi xếp

### 3.1. Các chế độ cần phân biệt

| Chế độ | Mục tiêu | Ràng buộc đặc thù |
|---|---|---|
| Repeat một mẫu | Nhiều bản sao nhất trên một tờ | Một kích thước, số bản sao không giới hạn khi tìm sức chứa |
| Gang-run nhiều mẫu | Đủ số lượng từng mẫu với ít tờ hoặc ít chi phí | Nhiều kích thước, số lượng riêng, có thể khác vật liệu |
| N-up tuần tự | Nhiều trang trên tờ và giữ thứ tự đọc/cắt | Thứ tự trang và hướng chữ |
| Cut-and-stack | Sau cắt/chồng, trang hoặc số thứ tự đúng | Thứ tự theo chồng, không gán trang tùy ý |
| Booklet/signature | Đúng thứ tự sau gấp/đóng sách | Cặp trang, tờ ngoài/trong, trang trắng, creep |
| Nesting đường viền | Tận dụng hình thật | Path bế, bleed theo contour, khoảng cách chính xác |

Không ghép chung các đơn khác giấy, độ dày, cấu hình in hai mặt hoặc quy trình hoàn thiện nếu chưa được cho phép. Chế độ sách có thể cố định vị trí; không đưa trang sách vào bộ xếp tự do rồi kỳ vọng thứ tự tự đúng.

### 3.2. Hàm đánh giá

Loại bố cục không hợp lệ trước khi chấm điểm. Dùng so sánh theo thứ tự ưu tiên, tránh cộng trọng số tùy ý làm một lỗi sản xuất đổi lấy mật độ cao hơn.

- Một mẫu trên một tờ: nhiều con hợp lệ hơn → ít thao tác cắt hơn nếu có định nghĩa quy trình → vùng dư hữu ích hơn → bố cục ổn định hơn.
- Một đơn nhiều mẫu: hoàn thành đủ nhu cầu → tổng chi phí thấp hơn hoặc ít tờ hơn theo mục tiêu chọn trước → ít in dư hơn → ít mẫu bình khác nhau hơn.
- Sách/cut-and-stack: thứ tự, mặt trước/sau và hướng là ràng buộc bắt buộc; không phải điểm thưởng.

Hai bố cục cùng số con nhưng khác hình dạng khoảng trống đều có thể hữu ích. Giữ một tập ứng viên đa dạng cho bước ghép vùng và lập kế hoạch nhiều tờ.

## 4. Hợp đồng dữ liệu dùng chung

Các kiểu dưới đây là hợp đồng đề xuất, độc lập với React và thư viện PDF.

```ts
type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Edges = { top: number; right: number; bottom: number; left: number };

type Item = {
  id: string;
  sourcePdfId: string;
  sourcePageIndex: number;             // zero-based
  quantity: number;                    // số nguyên dương
  shape: 'rectangle' | 'circle' | 'ellipse' | 'polygon';
  trimW: number;
  trimH: number;
  outline?: { outer: Point[]; holes: Point[][] };
  bleed: Edges;
  allowedRotations: number[];          // ví dụ [0, 90], đơn vị độ
  allowMirror: boolean;                // mặc định false cho nội dung in
  scale: number;                       // mặc định 1; không tự thu nhỏ để nhét
  pairId?: string;                     // liên kết mặt trước/sau
  groupId?: string;
};

type Sheet = {
  id: string;
  width: number;
  height: number;
  margins: Edges;
  obstacles: Rect[];                   // vùng cấm: nhíp, camera, dấu đăng ký...
  materialKey: string;
  cost?: number;
};

type Policy = {
  mode: 'repeat' | 'gang-run' | 'n-up' | 'cut-stack' | 'booklet';
  gapMetric: 'axis' | 'euclidean';
  cutGap: number;                      // giữa đường thành phẩm/đường bế
  artworkGap: number;                  // giữa vùng artwork/bleed
  boundaryGap: number;                 // riêng với mép vùng khả dụng
  allowBleedOverlap: boolean;
  requireGuillotine: boolean;
  allowOverproduction: boolean;
  maxOverproductionPerItem: number;
  objective: 'max-count' | 'min-sheets' | 'min-cost';
  timeBudgetMs: number;
  maxIterations: number;
  seed: number;
  geometricToleranceMm: number;
};

type Placement = {
  instanceId: string;
  itemId: string;
  sheetInstanceId: string;
  side: 'front' | 'back';
  x: number;                          // gốc local trim sau biến đổi/chuẩn hóa
  y: number;                          // tọa độ top-left của engine
  rotation: number;
  scale: number;
  matrix: [number, number, number, number, number, number];
  trimOutline: Point[];                // hoặc shape chính xác cho circle/ellipse
  occupiedBounds: Rect;               // bao footprint thực tế sau transform
  sourcePdfId: string;
  sourcePageIndex: number;
};

type Solution = {
  placements: Placement[];
  sheets: { instanceId: string; sheetTypeId: string }[];
  producedByItem: Record<string, number>;
  unplacedByItem: Record<string, number>;
  provenance: string[];                // ví dụ grid > region-split > maxrects > lns
  objectiveValue: number;
  valid: boolean;
  validationErrors: string[];
  optimality: 'heuristic' | 'proven-for-model';
  termination: 'completed' | 'time-limit' | 'iteration-limit' | 'cancelled';
  bound?: number;
  proofScope?: string;
};
```

Đối với hình cong, polygon phục vụ preview không thay thế hình học chính xác nếu chưa có sai số xấp xỉ được kiểm soát. Có thể mở rộng `Placement` bằng shape primitive hoặc path gốc.

## 5. Hình học, lề, bleed và khoảng cách

### 5.1. Quy ước tọa độ

- Engine dùng mm, gốc góc trên trái tờ, X tăng sang phải, Y tăng xuống.
- Vùng khả dụng bắt đầu tại `(marginLeft, marginTop)`; chiều rộng `W-left-right`, chiều cao `H-top-bottom`.
- Vùng cấm nằm trong cùng hệ tọa độ. Đổi hệ tọa độ đúng một lần ở biên giao tiếp.
- Dùng số nguyên theo độ phân giải đã chọn cho bộ giải rời rạc; giữ bản hình học gốc để xác minh lại. Khi cần bảo thủ, làm tròn kích thước chiếm chỗ lên và vùng chứa xuống.
- Không mặc định canh giữa toàn tờ: lề bất đối xứng phải giữ nguyên. Dịch cả cụm để canh giữa vùng khả dụng chỉ sau khi kiểm tra lại vùng cấm.

### 5.2. Ba hình khác nhau của một sản phẩm

1. **Trim/cut shape:** hình thành phẩm hoặc đường bế.
2. **Artwork footprint:** nội dung thực sự được phép xuất, bao gồm bleed và clip đã chọn.
3. **Packing footprint:** hình dùng để kiểm tra khoảng cách, có thể là bao bảo thủ của hai hình trên.

Chỉ được xếp sát đường viền tròn/oval khi phần artwork ngoài đường viền/bleed được clip đúng chính sách. Một trang PDF hình chữ nhật chứa hình tròn không tự động trở thành một vật thể tròn để nesting.

Với hai cạnh chữ nhật đối diện, nếu bleed không được chồng:

```text
requiredTrimSeparation = max(cutGap, bleedEdgeA + bleedEdgeB + artworkGap)
```

Xoay tem cũng phải xoay ánh xạ bleed từng cạnh. Không cộng gap lần nữa nếu footprint đã bao gap. Khoảng cách tới mép giấy được kiểm riêng, không tự thêm nửa gap vào mọi lề.

### 5.3. Hai cách hiểu khoảng cách

- `axis`: với chữ nhật, yêu cầu tách ít nhất gap theo X hoặc Y; thuận tiện cho MaxRects/Guillotine.
- `euclidean`: khoảng cách ngắn nhất giữa hai đường viền ít nhất gap; phù hợp yêu cầu khe hở bế thật.

`axis` bảo thủ hơn trong một số tình huống chéo góc. Không gọi nó là tương đương hoàn toàn với khoảng cách Euclid.

Với đường viền bất kỳ và gap Euclid đồng nhất, dùng phép offset Minkowski với đĩa bán kính `gap/2` trên mỗi hình để kiểm tra giao nhau; clipping và sai số offset phải được quản lý. Nếu gap thay đổi theo cặp, dùng kiểm tra theo cặp, không gán một offset chung tùy ý.

**Điểm cần sửa khi chuyển oval sang sản xuất:** công thức hiện tại lấy `dW=w+gap`, `dH=h+gap` và khoảng cách hàng `dH*sqrt(3)/2`. Với gap bằng 0, đây là mô hình affine của các ellipse cùng hướng. Với gap dương, ellipse tăng hai trục không phải đường offset Euclid chính xác; không được xem đó là bằng chứng đủ khe hở giữa các oval. Dùng nó tạo ứng viên, sau đó kiểm tra đường viền và điều chỉnh/loại ứng viên.

### 5.4. Kiểm tra giao nhau

| Cặp hình | Kiểm tra đề xuất |
|---|---|
| Chữ nhật vuông góc | Kiểm tra khoảng trên hai trục và gap theo chính sách |
| Tròn–tròn | `distance(centerA,centerB) >= rA+rB+gap` |
| Đa giác lồi | SAT để kiểm tra chồng; dùng khoảng cách/offset riêng khi có gap |
| Đa giác lõm/có lỗ | Phép toán polygon hoặc phân rã có bảo toàn topology |
| Oval, góc xoay tùy ý | Khoảng cách convex chính xác có dung sai, hoặc polygon bao ngoài bảo thủ |

SAT là kiểm tra trục phân tách, không tự tính đúng khe hở chỉ bằng một kiểm tra không chồng. Polygon nội tiếp đường cong có thể bỏ lọt va chạm; dùng bao ngoài hoặc bù sai số đã chứng minh. Dùng spatial index cho bước lọc cặp rồi chạy kiểm tra hình thật.

## 6. Thuật toán nền và hình chữ nhật

### A01. Uniform Grid — đã có

Với tem `w,h`, vùng `W,H`, gap trục `g`:

```text
cols = floor((W+g)/(w+g))
rows = floor((H+g)/(h+g))
count = cols*rows
x(c) = originX + c*(w+g)
y(r) = originY + r*(h+g)
```

Kiểm tra kích thước dương, gap không âm, tem vừa vùng. Thử mọi hướng hợp lệ; 180° có thể cùng hình học nhưng khác hướng chữ. Thời gian đếm O(1), xuất tọa độ O(count). Dùng làm phương án nền và tham chiếu kiểm thử.

### A02. Guillotine khối tham lam — đã có

```text
packLegacy(w,h,W,H,g,depth):
  best = empty
  for orientation in allowed 0/90:
    main = largest uniform grid in W,H
    if empty: continue
    candidate = main
    if depth > 0:
      candidate += pack(right strip, full H, depth-1)
      candidate += pack(bottom strip, main width, depth-1)
    best = larger count of best/candidate
  return best
```

Hai vùng con không chồng nhau. Mặc định `depth=4`, độ sâu 0 vẫn xếp lưới. Giới hạn: không thử chủ động giảm hàng/cột của khối đầu, không thử mọi vị trí chia, không có chứng minh tối ưu.

### A03. Guillotine mở rộng — bổ sung

Sinh các vị trí chia ứng viên từ bội số kích thước footprint, cạnh khối đã xếp và tổng một số kích thước. Thử cả chia dọc trước và ngang trước, thử khối đầu nhỏ hơn lưới cực đại. Giới hạn số ứng viên và dùng memoization theo kích thước vùng, nhu cầu còn lại, hướng và chính sách gap.

```text
solveRegion(region, remaining, budget):
  candidates = uniform grids + feasible single blocks
  for cut in generated vertical/horizontal cuts:
    (left,right) = split region, accounting for channel exactly once
    for allocation in bounded quantity allocations:
      a = solveRegion(left, allocation.left, reduced budget)
      b = solveRegion(right, remaining minus a.used, reduced budget)
      keep valid a+b
  return diverse best candidates
```

Với vô hạn bản sao một mẫu, không cần phân bổ nhu cầu. Với nhiều mẫu, bắt buộc trừ số lượng giữa hai vùng. Nếu yêu cầu cắt guillotine, lưu cây cắt và kiểm chứng đường cắt; bố cục hình chữ nhật hợp lệ chưa đủ chứng minh cắt guillotine được. Nhóm Guillotine có nhiều biến thể chọn vật và chia vùng; tham khảo [RectangleBinPack](https://github.com/juj/RectangleBinPack).

### A04. MaxRects — bổ sung

Giữ danh sách các hình chữ nhật trống cực đại. Thử từng hướng tem trong từng vùng trống, chọn vị trí theo điểm. Sau đặt tem, tách **mọi vùng trống giao tem**, loại vùng bị chứa hoàn toàn trong vùng khác. Các vùng trống có thể chồng nhau nên không cộng diện tích của chúng để tính diện tích trống.

Các tiêu chí ứng viên: BSSF (dư cạnh ngắn nhỏ nhất), BLSF (dư cạnh dài nhỏ nhất), BAF (dư diện tích nhỏ nhất), Bottom-Left và Contact-Point. Chạy nhiều tiêu chí để giữ nhiều bố cục. Không xem một tiêu chí là luôn tốt nhất.

Với gap trục đồng nhất và footprint chưa có gap: có thể xếp vật `w+g,h+g` trong vùng ảo `W+g,H+g`, rồi trả kích thước vật thật. Chỉ dùng quy đổi này cho mô hình chữ nhật phù hợp; xử lý vùng cấm, bleed, lề riêng và kiểm tra cuối. Không dùng quy đổi đó như nghiệm hình học chính xác cho oval.

### A05. Skyline — bổ sung

Theo dõi đường biên trên của các vật đã đặt. Tạo vị trí ở các điểm gãy, chọn điểm thấp/ít lãng phí, cập nhật đường biên. Biến thể có quản lý khoảng trống bên dưới đường biên giúp lấp các hốc bỏ sót. Dùng như ứng viên nhanh và đối chiếu, không thay toàn bộ bộ xếp.

### A06. Shelf/Strip — bổ sung

Chia thành dải hàng/cột; đặt tem vào dải còn chỗ hoặc mở dải mới. Thử First-Fit, Best-Fit và nhiều thứ tự đầu vào. Hữu ích khi cần hàng dễ cắt hoặc cut-and-stack. Cùng kích thước có thể trùng kết quả lưới. Mã tham khảo cho các họ MaxRects, Skyline và Shelf: [RectangleBinPack](https://github.com/juj/RectangleBinPack).

### A07. Block patterns / bố cục nhiều khối — bổ sung

Sinh khối lưới đứng/ngang với số hàng/cột có giới hạn, rồi xếp các khối như vật lớn. Thử bố cục 2 dải, 3 dải, chia chữ L, bố cục quanh vùng trung tâm; cho phép khối chưa đầy để dành chỗ cho hướng khác. Mỗi khối giữ tọa độ tem con.

Đây là thiết kế ứng viên đề xuất cho tem đồng cỡ. Bố cục quanh tâm có thể không cắt guillotine được; chỉ dùng khi quy trình cho phép. Đừng gán tên một họ thuật toán thành cam kết đã duyệt hết mọi pattern.

## 7. Thuật toán tròn, oval và đường viền

### A08. So le thuần / hexagonal lattice — đã nằm trong mô hình hiện tại

Với tròn đường kính `d`, gap `g`, bước ngang `p=d+g`, bước dọc `p*sqrt(3)/2`, hai hàng liên tiếp lệch nhau `p/2`. Thử cả hai trục vùng in và cả pha hàng đầu. Trên tờ hữu hạn, không giả định so le luôn hơn lưới thẳng.

### A09. DP trộn hàng thẳng và so le — đã có

```text
pX = itemW + gap
pY = itemH + gap
step = pY * sqrt(3)/2
c0 = floor((areaW + gap)/pX)
c1 = floor((areaW - pX/2 + gap)/pX)
R = floor((areaH-itemH)/step)+1

H[k,s,o] = chiều cao nhỏ nhất cho k hàng,
           s hàng lệch, kiểu hàng cuối o thuộc {0,1}

H[1,0,0] = itemH
H[1,1,1] = itemH
H[k+1,s+t,t] = min(H[k+1,s+t,t],
                   H[k,s,o] + (o==t ? pY : step))
count(k,s) = (k-s)*c0+s*c1
```

Chỉ giữ trạng thái không vượt chiều cao, lưu cha để dựng `rowPlan`. Với R hàng, thời gian và bộ nhớ O(R²) trong mô hình hai pha. Chọn count cao nhất; mã hiện tại ưu tiên nhiều hàng khi hòa. Thử đảo pha toàn bộ để chọn cách bắt đầu thích hợp.

Tròn: thử theo hai trục. Oval: thử hướng tem và trục vùng in, thêm ứng viên xếp hộp chữ nhật. Kết quả là tốt nhất trong mô hình này, không phải mọi cấu hình tọa độ. Oval có gap phải qua kiểm tra mục 5.

### A10. DP nhiều pha / hàng linh hoạt — bổ sung

Cho mỗi hàng chọn lệch ngang từ một tập ứng viên hữu hạn và, nếu phù hợp, chọn hướng oval. Tính số tem hợp lệ theo mỗi pha, tìm khoảng cách dọc tối thiểu bằng kiểm tra hình học.

Không sao chép máy móc trạng thái chỉ giữ hàng cuối của A09: khi bước hàng hoặc chiều cao khác nhau, hàng mới có thể va chạm hàng trước nữa. Trạng thái phải giữ toàn bộ các hàng còn có thể tương tác, hoặc validator phải kiểm với mọi hình liên quan. Beam Search thường dễ giới hạn tài nguyên hơn DP đầy đủ.

### A11. Xếp tròn/oval bằng tọa độ tự do — bổ sung

Thiết kế khởi tạo từ các bố cục A08/A09, sau đó thử chèn thêm một vật. Sinh điểm tiếp xúc gần biên, gần hai vật đã đặt, hoặc điểm lấy mẫu trong vùng trống. Dùng tối ưu cục bộ để dịch các tâm và, nếu cho phép, xoay oval.

Với N hình tròn bằng nhau, mô hình khả thi gồm tâm trong vùng cho phép và mọi cặp cách ít nhất `d+g`. Có thể tối thiểu hóa hàm phạt vi phạm, nhưng giá trị phạt nhỏ **không phải chứng nhận hợp lệ**. Chỉ nhận sau validator độc lập. Thử nhiều seed; không tìm được N+1 không chứng minh N là tối ưu.

### A12. No-Fit Polygon / Inner-Fit Polygon — bổ sung

Với A cố định và B di chuyển, NFP biểu diễn vùng vị trí tham chiếu gây giao nhau, liên quan tổng Minkowski `A ⊕ (-B)`. IFP biểu diễn vị trí B nằm trọn trong tờ. Tìm vị trí trong IFP và ngoài các vùng cấm NFP; chọn theo góc thấp hoặc điểm đánh giá khác.

Offset đường viền theo gap trước khi tính; cache theo cặp hình, góc, gap, dung sai. Hình lõm, lỗ và nhiều thành phần cần thư viện hình học bền vững. NFP là công cụ hình học, vẫn cần chiến lược chọn thứ tự/vị trí. Tham khảo kết hợp NFP và tìm kiếm thứ tự trong [SVGnest](https://github.com/Jack000/SVGnest).

## 8. Tìm kiếm và cải thiện bố cục

Những cơ chế dưới đây là thiết kế bổ sung cho dự án đích. Một “bước di chuyển” có thể thay góc, thứ tự vật, cách chia vùng hoặc loại thuật toán cho vùng, không bắt buộc phải thao tác trực tiếp từng tọa độ.

### A13. Multi-start / nhiều lần khởi tạo

Thử thứ tự theo diện tích, cạnh dài, tỷ lệ cạnh, số lượng và các hoán vị ngẫu nhiên có seed. Với một loại tem đồng cỡ, đảo thứ tự không tạo khác biệt; cần thay hướng, pattern, vị trí chia hoặc pha hàng. Giữ tập ứng viên đa dạng đã xác minh.

### A14. Beam Search

Mỗi trạng thái gồm placements, số lượng còn lại, vùng trống, thông tin cắt và điểm. Mở rộng bằng một vật hoặc khối; lọc trạng thái trùng và giữ B trạng thái hứa hẹn. Giữ đa dạng hình dạng vùng dư để tránh mọi nhánh trở thành cùng một kiểu. Cắt bớt nhánh làm mất bảo đảm tối ưu.

Tìm kiếm theo cây và theo khối/vùng trống cực đại là các hướng thực tế; xem [PackingSolver rectangle algorithms](https://fontanf.github.io/packingsolver/internals/rectangle.html).

### A15. Local Search / compact / refill

Thử dịch nhóm về biên, đổi góc một vật, đổi cách xếp một dải, hoặc di chuyển vật chắn khoảng trống lớn. Sau mỗi thay đổi, chạy lấp phần trống. Chỉ cập nhật kết quả công bố khi hợp lệ và tốt hơn theo mục tiêu; giữ nguyên nghiệm tốt nhất nếu thử nghiệm thất bại.

### A16. Large Neighborhood Search — LNS

Chọn một vùng, tháo các vật ảnh hưởng và đưa số lượng về hàng đợi. Giữ phần còn lại làm vật cản; dùng MaxRects, DP, NFP hoặc bộ giải chính xác để xây lại vùng. Thử các vùng gần ranh giới, vùng thưa hoặc một dải xuyên tờ. Đây là cách trực tiếp phối hợp nhiều thuật toán trên cùng bố cục.

### A17. Simulated Annealing — SA

Giữ trạng thái hiện hành riêng với nghiệm hợp lệ tốt nhất. Với đại lượng cần tối thiểu hóa E, nhận cải thiện; một bước xấu hơn có thể được nhận với xác suất `exp(-(Enew-Eold)/T)`. Giảm T theo lịch và giới hạn vòng lặp. Chuẩn hóa E theo mục tiêu đã chọn; bố cục trung gian có vi phạm không được xuất PDF.

### A18. Genetic Algorithm — GA

Chromosome mã hóa thứ tự vật, góc xoay, chia vùng hoặc lựa chọn thuật toán. Decoder tạo bố cục thực từ chromosome rồi validator xác minh. Chọn lọc, lai ghép, đột biến, giữ elite; sửa hoặc loại cá thể có số lượng sai. Với một mẫu đồng cỡ, chromosome chỉ là hoán vị các bản sao thường vô ích. SVGnest là ví dụ tham khảo về kết hợp tìm kiếm di truyền với hình học nesting, không phải mã đã có trong module nguồn.

### A19. Tabu Search / Iterated Local Search

Tabu lưu các thay đổi vừa thử để tránh quay vòng; cho phép ngoại lệ nếu tìm được nghiệm tốt nhất mới. Iterated Local Search luân phiên cải thiện cục bộ và perturbation để thoát vùng nghiệm hiện tại. Cần cache, seed và giới hạn tài nguyên. Đây là lựa chọn mở rộng, không yêu cầu chạy đồng thời với mọi metaheuristic khác.

### A20. Bộ giải chính xác: Branch-and-Bound, CP-SAT, MILP

Với chữ nhật 0°/90°, dùng biến vị trí, biến hướng, biến hiện diện hoặc số tờ; ràng buộc nằm trong tờ và không chồng. Có thể dùng ràng buộc `NoOverlap2D` của bộ giải phù hợp hoặc disjunction cho mỗi cặp:

```text
left(i,j) OR right(i,j) OR above(i,j) OR below(i,j)
```

Gap, bleed, vùng cấm và số lượng phải nằm trong mô hình. Với CP-SAT, chuyển kích thước sang số nguyên; đối với MILP, các hằng số big-M cần chặn đúng miền, không chọn quá lớn tùy tiện.

Giải bài toán “xếp được N+1 hay không” sau khi heuristic tìm được N. Chỉ kết luận không thể xếp khi bộ giải chứng minh vô nghiệm trong **đúng mô hình đó**; timeout/unknown không phải vô nghiệm. Giới hạn góc hay làm tròn tọa độ có thể làm chứng minh chỉ đúng với mô hình hạn chế.

Phân biệt trạng thái nghiệm hợp lệ và đã chứng minh tối ưu theo [OR-Tools CP-SAT](https://developers.google.com/optimization/cp/cp_solver). Tham khảo thuật toán tìm kiếm chính xác trong [Huang–Korf, Optimal Rectangle Packing](https://arxiv.org/abs/1402.0557). Không dùng ràng buộc hình chữ nhật để tuyên bố tối ưu hình tròn/oval tự do.

### A21. Cutting-stock / chọn các mẫu bình cho toàn đơn

Sau khi có thư viện pattern hợp lệ, gọi `a[i,p]` là số mẫu i trong pattern p và `z[p]` là số lần in pattern. Mô hình đề xuất:

```text
minimize sum(cost[p] * z[p])
subject to sum(a[i,p] * z[p]) >= demand[i] for every item i
           sum(a[i,p] * z[p]) <= demand[i] + allowedExtra[i]
           z[p] nonnegative integer
```

Nếu không cho in dư thì dùng bằng nhu cầu. Có thể thêm chi phí tạo mẫu bình bằng biến nhị phân pattern được dùng. Tập pattern ít chỉ cho tối ưu trên tập ấy. Column generation là hướng mở rộng để sinh pattern theo nhu cầu; nghiệm relaxation không tự trở thành nghiệm nguyên tối ưu.

## 9. Phối hợp nhiều thuật toán trong MỘT lần xếp

### 9.1. Portfolio: chạy nhiều cách, chọn bố cục

Chạy các thuật toán phù hợp với hình và ràng buộc, normalize về cùng placements, validate, giữ top K đa dạng. Đây là chạy nhiều phương án hoàn chỉnh. Có thể chạy tuần tự hoặc trong worker; “nhiều thuật toán” không bắt buộc “nhiều luồng”.

### 9.2. Region hybrid: một tờ, nhiều vùng, nhiều thuật toán

Sinh một số cách chia tờ. Ví dụ oval: vùng trái DP so le, vùng phải xếp oval xoay 90° theo lưới/MaxRects; thử thêm vùng dưới dùng hướng khác. Chọn vùng chỉ là chiến lược tìm kiếm, không thay đổi các ràng buộc thật.

Phải kiểm tra tương tác qua ranh giới vùng. Nếu vùng bao trọn footprint đã mở rộng thì có thể ghép bảo thủ; nếu chia theo trim bounds thì kiểm tra gap/bleed liên vùng. Với nhiều mẫu, vùng sau chỉ nhận số lượng còn lại.

### 9.3. Sequential hybrid: xếp → lấp → tháo/xếp lại

```text
DP hoặc pattern blocks tạo bố cục ban đầu
    ↓
MaxRects/NFP tìm chỗ cho nhu cầu còn lại
    ↓
LNS tháo một dải hoặc cụm gần vùng trống
    ↓
Thuật toán khác xây lại với phần cố định là vật cản
    ↓
Compact + refill + kiểm tra toàn tờ
```

MaxRects chỉ thấy khoảng trống chữ nhật; để khai thác khoảng cong giữa các oval phải dùng collision hình thật/NFP. Không đặt một tờ mới lên tọa độ cũ rồi cộng số con của hai nghiệm.

### 9.4. Bộ điều phối đề xuất

```text
solve(job, policy):
  normalized = validateAndNormalize(job, policy)
  requestKey = immutable hash(normalized)
  pool = empty diverse candidate pool
  best = null

  for sheetType in compatible sheet types:
    addIfValid(pool, baselineStrategies(normalized, sheetType))
    for strategy in applicableStrategies(normalized):
      if global budget exhausted: break
      addIfValid(pool, strategy.run(normalized, sheetType, remainingBudget))

    for seedLayout in selected diverse pool for this sheet:
      addIfValid(pool, splitRegionsAndSolve(seedLayout))
      addIfValid(pool, refillFreeSpace(seedLayout))
      addIfValid(pool, destroyRepairAndCompact(seedLayout))

  if job has finite/mixed demand:
    best = buildCompleteProductionPlan(pool, exact quantities policy)
  else:
    best = selectBestValid(pool)

  if exact mode and budget remains:
    best = improveOrProve(best, normalized, remainingBudget)

  verifyWholePlan(best, normalized)
  attach termination, provenance, proof scope, input hash
  return best
```

Các hàm trong mã giả là trách nhiệm cần triển khai, không phải API có sẵn. `addIfValid` không nhận ứng viên chỉ có count; cần tọa độ thực. Luôn giữ nghiệm hợp lệ tốt nhất, không mất nghiệm cũ khi nhánh nâng cao hết giờ.

### 9.5. Điều kiện không giảm chất lượng

Với cùng input, footprint, gap và mục tiêu, đưa nghiệm nền **hợp lệ** vào tập ứng viên và chỉ nhận kết quả tốt hơn hoặc bằng. Không giữ nghiệm nền sai hình học chỉ để giữ số con cũ; khi oval cần khe hở thật lớn hơn, số con hợp lệ có thể giảm so với công thức nguồn.

## 10. Chặn trên, dừng và hiệu năng

### 10.1. Chứng nhận

Một mẫu có diện tích trim A trên vùng dùng được S: `floor(S/A)` là chặn trên đơn giản nếu các trim không chồng và đều nằm trong vùng đó. Nó có thể rất lỏng vì bỏ qua gap/bleed. Vùng cấm phải tính diện tích hợp, không trừ trùng.

Không lấy mật độ lưới lục giác của mặt phẳng vô hạn làm chặn trên máy móc cho số hình tròn trên mọi tờ hữu hạn. Không lấy tổng diện tích free rectangles của MaxRects làm diện tích trống.

Nếu nghiệm hợp lệ đạt chặn trên đúng, có thể chứng minh tối ưu số con. Nếu chỉ là “không tìm được tốt hơn”, ghi `heuristic`. Chứng minh trên lưới tọa độ/góc giới hạn phải ghi rõ trong `proofScope`.

### 10.2. Ngân sách khởi điểm đề xuất

| Chế độ | Ngân sách gợi ý | Chiến lược |
|---|---:|---|
| Nhanh | 100–300 ms | Baseline, DP giới hạn, ít pattern/MaxRects |
| Cân bằng | 1–3 giây | Portfolio, chia vùng, beam nhỏ, refill |
| Kỹ | 5–20 giây | Nhiều seed, beam lớn hơn, LNS/SA, exact có giới hạn |

Các số này là cấu hình khởi điểm để benchmark, **không phải cam kết hiệu năng đã đo**. Giới hạn đồng thời thời gian, số nút, số ứng viên, bộ nhớ và độ lớn bảng DP. Tem quá nhỏ có thể tạo R rất lớn trong DP nguồn.

Chạy tác vụ nặng trong worker; cho hủy và trả nghiệm tốt nhất. Mỗi kết quả gắn request ID để tránh input mới bị kết quả cũ ghi đè. Dùng seed và giới hạn số vòng cố định cho kiểm thử tái lập; chỉ cùng seed nhưng khác lịch worker/timeout chưa chắc cùng kết quả.

Cache theo toàn bộ dữ liệu ảnh hưởng hình học: kích thước, đường viền, góc, bleed, gap, vùng cấm, lề, chính sách, dung sai, phiên bản thuật toán. Không cache chỉ theo W×H của tem.

## 11. Tích hợp với PDF Imposing

### 11.1. Tách ba lớp

```text
PDF parser / chuẩn hóa trang
          ↓
Packing engine: chỉ tính hình học và kế hoạch
          ↓
Page assignment + PDF renderer: gán trang, biến đổi, clip, marks
```

Preview và PDF xuất dùng **cùng placements và cùng ma trận biến đổi**. Không tính lại bố cục bằng một công thức đơn giản hơn ở renderer. Xuất hình vector/text của PDF gốc khi thư viện cho phép; raster chỉ dành cho preview hoặc chế độ được chọn rõ.

### 11.2. Đọc và chuẩn hóa trang

Đọc MediaBox, CropBox, TrimBox, BleedBox, `/Rotate`, `/UserUnit` và gốc tọa độ của box được chọn. Khi thiếu TrimBox, dùng fallback theo chính sách dự án và báo rõ kích thước đang dùng. Không tự suy ra hình bế từ khoảng trắng của trang nếu không có chế độ nhận dạng riêng.

Chuẩn hóa origin và rotation đúng một lần. Thao tác xoay nội dung và thay đổi page box là hai việc khác nhau; cần kiểm tra kết quả với trang gốc có sẵn rotation. Tham khảo [pypdf: Cropping and Transforming PDFs](https://pypdf.readthedocs.io/en/stable/user/cropping-and-transforming.html).

### 11.3. Đơn vị và ma trận

Ở PDF output đã chuẩn hóa về `/UserUnit=1`:

```text
1 mm = 72/25.4 pt
X_pt = X_mm * 72/25.4
Y_pt = (sheetHeight_mm - Y_mm) * 72/25.4   // đổi một ĐIỂM
```

Với hình chữ nhật không xoay, đặt bằng lower-left thì `Y=(sheetH-y-h)*72/25.4`. Với hình xoay, dùng ma trận và biến đổi các đỉnh; không trừ một chiều cao chưa xoay.

Quy ước affine `[a,b,c,d,e,f]`: `x'=a*x+c*y+e`, `y'=b*x+d*y+f`. Ghép phép chuẩn hóa trang nguồn, scale được phép, rotation, bù bounding box, tịnh tiến vào tờ và đổi hệ tọa độ. Thứ tự gọi API có thể khác nhau giữa thư viện; kiểm thử bốn góc và một dấu định hướng bất đối xứng để xác minh, không đoán thứ tự ma trận.

Giữ clipping đúng footprint đã xếp. Với nguồn có `/UserUnit` khác 1, chuyển sang kích thước vật lý trước khi đưa vào engine.

### 11.4. In hai mặt

Tạo bố cục trước, ánh xạ vị trí mặt sau theo chế độ lật đã định nghĩa bằng trục vật lý của tờ. Trong hệ nhìn đã chuẩn hóa, phản xạ vị trí qua trục dọc của tờ cho bounding box không xoay là `xBack=W-x-w`; qua trục ngang là `yBack=H-y-h`. Góc và nội dung mặt sau còn phụ thuộc cách nạp/lật máy.

Không đồng nhất phản xạ **vị trí ô** với mirror **nội dung chữ**. Nội dung thông thường cần đọc được, `allowMirror=false`. Không mặc định “lật cạnh dài” luôn là một công thức X cho mọi orientation. Chốt mapping bằng tờ thử có số ô và mũi tên rồi đưa profile máy vào dữ liệu.

### 11.5. Bình sách và cut-and-stack

Gán trang là bước riêng sau hoặc cùng ràng buộc bố cục. Với ví dụ booklet 8 trang, hai ô mỗi mặt, đóng giữa, cách đọc trái→phải theo một quy ước phổ biến: tờ ngoài trước `[8,1]`, sau `[2,7]`; tờ trong trước `[6,3]`, sau `[4,5]`. Góc mặt sau vẫn phải theo profile lật máy.

Không dùng công thức ví dụ cho mọi kiểu gấp/signature. Xác định chiều đóng, số trang tay sách, trang trắng, creep, cut-and-stack và hướng nạp. Kiểm tra mô phỏng gấp hoặc tờ mẫu trước khi chốt.

### 11.6. Dấu cắt, dấu bế, màu và output

- Chừa vùng marks trước khi xếp; không vẽ marks vào artwork đã chiếm chỗ.
- Dùng path bế đúng transform của từng tem; layer/spot color theo yêu cầu thiết bị đích.
- Với nhiều sản phẩm trên một tờ, page-level TrimBox không biểu diễn riêng mọi đường thành phẩm: dùng manifest placements và marks/path tương ứng.
- Kiểm tra thư viện có giữ font, transparency, spot color, overprint, ICC và nội dung vector cần thiết; không tuyên bố PDF/X nếu chưa kiểm tra chuẩn tương ứng.
- Tái sử dụng page/Form XObject khi thư viện hỗ trợ để giảm dung lượng; tránh tích lũy transform trên cùng trang mutable qua các lần đặt.
- Output đề xuất gồm PDF, manifest JSON và thông tin số lượng theo mẫu; ghi phiên bản engine, input hash và trạng thái xác minh.

## 12. Bộ kiểm thử nghiệm thu

### 12.1. Ca nền có số kỳ vọng

| Ca | Input | Kỳ vọng |
|---|---|---|
| Lưới vừa khít | Tem 50×30, vùng 154×62, gap 2, không xoay | 3×2 = 6 |
| Tròn hỗn hợp | Đường kính 90, vùng 314×342, gap 2 | Mã nguồn cho 11 con, hàng 3–2–3–3 |
| Tròn lưới tốt | Đường kính 90, vùng 314×314, gap 2 | Mã nguồn cho 9 con |
| Một con | Tròn 310, vùng 314×314 | 1 con |
| Quá khổ | Tròn 400, vùng 314×314 | 0 con |
| Lề bất đối xứng | Tờ 330×480, trái 12/phải 8/trên 15/dưới 25 | Origin (12,15), vùng 310×440 |
| PDF A4 | 210×297 mm, UserUnit output 1 | Khoảng 595.276×841.890 pt |

Các số DP trên là hồi quy của engine nguồn, không phải chứng minh tối ưu toàn cục. Ví dụ 11 con dùng vùng cao **342 mm** và gap 2; không sao chép nhầm ví dụ 340 mm trong comment cũ ở phụ lục.

### 12.2. Kiểm tra bất biến

1. Mọi placement trong vùng cho phép, không đè vùng cấm.
2. Không chồng trim và đáp ứng đúng gap; artwork/bleed tuân thủ chính sách riêng.
3. Count bằng số instance thực; produced/unplaced/extra khớp nhu cầu.
4. Không dùng hướng xoay, mirror hay scale ngoài quyền cho phép.
5. Phối hợp vùng không nhân đôi instance và không thiếu kiểm tra ở ranh giới.
6. Đổi thứ tự thuật toán không làm mất nghiệm hợp lệ tốt nhất đã lưu.
7. Nghiệm nâng cao không kém baseline hợp lệ cùng ràng buộc.
8. Timeout vẫn trả nghiệm hợp lệ đã tìm thấy; không gắn nhãn proven.
9. Export giữ đúng vị trí, kích thước vật lý, page ID và mặt trước/sau.
10. Renderer không tạo sai khác bằng làm tròn riêng tọa độ preview.

### 12.3. Các ca bắt buộc ngoài lưới đơn giản

- Oval dài/hẹp với gap dương; kiểm khe hở gần vị trí tiếp xúc chéo.
- Bleed bất đối xứng xoay 90°; hai artwork có bleed lớn hơn khoảng bế.
- Tem tròn trong PDF có nền chữ nhật chưa clip.
- Hai vùng lai gặp nhau tại biên; dấu đăng ký nằm trong vùng trống tưởng hợp lệ.
- Nhiều mẫu có số lượng lệch nhau, thiếu đúng một con, cấm in dư.
- PDF nguồn có box origin khác 0, Rotate 90/180/270, UserUnit khác 1.
- Trang có chữ và mũi tên bất đối xứng để phát hiện mirror/rotation sai.
- Tờ cuối không đầy; booklet cần trang trắng; cut-and-stack sau cắt đúng thứ tự.
- Tem rất nhỏ, kích thước bằng 0/âm, NaN/Infinity, gap âm; từ chối dữ liệu sai trước solver.
- Cùng seed và giới hạn vòng lặp cho kết quả tái lập; kết quả worker cũ không ghi đè request mới.

### 12.4. Benchmark và chứng nhận

Lập bộ kích thước thực tế của xưởng; so count, số tờ, in dư, chi phí, runtime, bộ nhớ và tỷ lệ nghiệm không hợp lệ giữa từng chiến lược. Báo trường hợp hòa hoặc kém, không chỉ chọn ca thắng. So với bộ giải chính xác ở tập nhỏ để đo khoảng cách chất lượng. Kiểm tra hình học độc lập với mã sinh bố cục.

Render PDF mẫu để kiểm trực quan; đồng thời đọc lại kích thước/transform/manifest để kiểm số học. Kiểm tra ảnh preview đơn thuần không đủ chứng minh khe hở nhỏ hoặc kích thước in thật.

## 13. Thứ tự triển khai đề xuất

1. Chốt dữ liệu, footprint, gap, validator và ma trận PDF.
2. Tách mã nền ở phụ lục thành module, thêm adapter trả placements; giữ hồi quy.
3. Bổ sung Guillotine mở rộng, MaxRects, block patterns và portfolio.
4. Bổ sung region hybrid, refill, Beam Search và LNS.
5. Bổ sung geometry oval/contour, NFP và tìm kiếm tọa độ tự do theo nhu cầu.
6. Bổ sung kế hoạch nhiều mẫu/nhiều tờ, sau đó exact mode cho tập bài toán phù hợp.
7. Nghiệm thu PDF thực tế, hai mặt, thứ tự trang và quy trình cắt/gấp.

Không cần chạy mọi thuật toán cho mọi job. Rectangle có thể bỏ nhánh NFP; booklet không dùng xếp tự do nếu vị trí đã bị ràng buộc; hình vuông đồng cỡ có thể dừng khi đạt chặn trên đúng.

## 14. Chỉ dẫn chuyển giao cho dự án đích

Có thể dùng đoạn dưới làm yêu cầu triển khai:

> Xây dựng engine PDF Imposing theo hợp đồng và ràng buộc trong tài liệu này. Tách geometry/packing khỏi đọc và xuất PDF. Bắt đầu bằng validator độc lập, adapter mã nền và các ca hồi quy. Triển khai các thuật toán bổ sung theo thứ tự mục 13, ghi rõ thuật toán nào đã có mã chạy và thuật toán nào mới là thiết kế. Hỗ trợ phối hợp nhiều thuật toán theo vùng và theo giai đoạn, giữ nghiệm hợp lệ tốt nhất trong ngân sách. Không công bố tối ưu tuyệt đối nếu chưa có chứng minh đúng phạm vi. Preview và PDF xuất phải dùng cùng placements/transform. Không tự thu nhỏ artwork, mirror chữ, bỏ bleed hoặc thay đổi số lượng để tăng mật độ. Báo kết quả benchmark và các giới hạn còn lại trước nghiệm thu.

## 15. Tài liệu tham khảo

Các liên kết là nguồn kỹ thuật để triển khai sâu, không phải dependency bắt buộc. Kiểm tra phiên bản và giấy phép khi lấy mã bên ngoài.

- [Jukka Jylänki — RectangleBinPack và khảo sát các heuristic](https://github.com/juj/RectangleBinPack).
- [PackingSolver — cây tìm kiếm và maximal spaces](https://fontanf.github.io/packingsolver/internals/rectangle.html).
- [SVGnest — nesting đường viền và kết hợp tìm kiếm](https://github.com/Jack000/SVGnest).
- [Google OR-Tools — CP-SAT và trạng thái chứng minh](https://developers.google.com/optimization/cp/cp_solver).
- [Huang & Korf — Optimal Rectangle Packing: An Absolute Placement Approach](https://arxiv.org/abs/1402.0557).
- [pypdf — Cropping and Transforming PDFs](https://pypdf.readthedocs.io/en/stable/user/cropping-and-transforming.html).

## Phụ lục A. Toàn bộ mã nguồn nền đang sử dụng

Mã bên dưới được sao nguyên từ `src/modules/decal/engine/layout.js` tại thời điểm lập tài liệu. Có thể lưu khối mã thành `legacy-layout.mjs`; không cần React hoặc thư viện ngoài. API export gồm `findPrintSheet`, `packRectangles`, `calculateStickersPerSheet`, `calculateSheetsPerPrintSheet`.

Đầu vào cấu hình tối thiểu cho các ca đơn giản:

```js
const config = { stickerGap: 2, marginShortSide: 0, marginLongSide: 0 };
const machine = { marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 };
// calculateStickersPerSheet(90, 90, 314, 342, 'circle', config, machine).count === 11
```

Đây là bản tương thích hành vi cũ. Cần thêm kiểm tra đầu vào, giới hạn tài nguyên, geometry oval/gap, bleed và adapter PDF trước khi dùng trong hệ thống mới. Comment cũ về vùng 314×340 không phải ca nghiệm thu; ca đúng ở mục 12 dùng 314×342. Giữ comment nguyên để không làm sai lệch bản sao nguồn.

<!-- BEGIN LEGACY SOURCE -->
```js
// Decal engine — layout helpers + public layout API.
//
// Tách từ src/utils/decalCalculator.js ở TASK-0004 (extract decal engine).
// KHÔNG đổi behavior — chỉ tổ chức lại theo cấu trúc module mới.
//
// Pure functions: chỉ phụ thuộc input + config object, không React/DOM/IO.

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

// Tìm khổ giấy in khớp w&h trong printSheetSizes (để lấy percent riêng của khổ).
export function findPrintSheet(config, w, h) {
    return (config.printSheetSizes || []).find((s) => s.w === w && s.h === h) || null;
}

// Get printable area from sheet dimensions and margins (vùng bế).
// - Máy khai báo 4 cạnh (marginTop/Bottom/Left/Right) → trừ từng cạnh:
//     pw = W − trái − phải ; ph = H − trên − dưới.
// - Ngược lại (không máy / máy kiểu cũ / global) → giữ logic cũ short/long (gộp 1 số/trục).
function getPrintableArea(sheetW, sheetH, config, machine) {
    if (machine && typeof machine.marginTop === 'number') {
        const left = machine.marginLeft || 0;
        const right = machine.marginRight || 0;
        const top = machine.marginTop || 0;
        const bottom = machine.marginBottom || 0;
        return {
            w: Math.max(0, sheetW - left - right),
            h: Math.max(0, sheetH - top - bottom),
        };
    }
    const mShort =
        machine && typeof machine.marginShort === 'number'
            ? machine.marginShort
            : config.marginShortSide;
    const mLong =
        machine && typeof machine.marginLong === 'number'
            ? machine.marginLong
            : config.marginLongSide;
    let pw, ph;
    if (sheetW < sheetH) {
        pw = sheetW - mShort;
        ph = sheetH - mLong;
    } else if (sheetH < sheetW) {
        pw = sheetW - mLong;
        ph = sheetH - mShort;
    } else {
        pw = sheetW - mShort;
        ph = sheetH - mLong;
    }
    return { w: Math.max(0, pw), h: Math.max(0, ph) };
}

// Uniform grid trong 1 vùng (đếm số ô + cols/rows). Không xoay.
function uniformGrid(iw, ih, areaW, areaH, gap) {
    if (iw <= 0 || ih <= 0 || iw > areaW || ih > areaH) return { count: 0, cols: 0, rows: 0 };
    const cols = Math.floor((areaW + gap) / (iw + gap));
    const rows = Math.floor((areaH + gap) / (ih + gap));
    return { count: cols * rows, cols, rows };
}

// Xếp tem HỖN HỢP (guillotine đệ quy có giới hạn depth) — tối đa số con trong vùng in.
// Trả { count, blocks:[{x,y,iw,ih,cols,rows}] } (toạ độ mm, gốc góc trên-trái vùng in).
// Luôn ≥ lưới đồng nhất (best khởi tạo từ lưới, extras ≥ 0). Cho phép xoay 90° từng khối.
export function packRectangles(w, h, areaW, areaH, gap, depth = 4) {
    if (areaW <= 0 || areaH <= 0) return { count: 0, blocks: [] };
    let best = { count: 0, blocks: [] };
    const orientations =
        w === h
            ? [[w, h]]
            : [
                  [w, h],
                  [h, w],
              ];
    for (const [iw, ih] of orientations) {
        const g = uniformGrid(iw, ih, areaW, areaH, gap);
        if (g.count <= 0) continue;
        const mainBlock = { x: 0, y: 0, iw, ih, cols: g.cols, rows: g.rows };
        let count = g.count;
        let blocks = [mainBlock];
        if (depth > 0) {
            const usedW = g.cols * (iw + gap) - gap;
            const usedH = g.rows * (ih + gap) - gap;
            const rightW = areaW - usedW - gap;
            const bottomH = areaH - usedH - gap;
            if (rightW > 0) {
                const r = packRectangles(w, h, rightW, areaH, gap, depth - 1);
                count += r.count;
                blocks = blocks.concat(r.blocks.map((b) => ({ ...b, x: b.x + usedW + gap })));
            }
            if (bottomH > 0) {
                const r = packRectangles(w, h, usedW, bottomH, gap, depth - 1);
                count += r.count;
                blocks = blocks.concat(r.blocks.map((b) => ({ ...b, y: b.y + usedH + gap })));
            }
        }
        if (count > best.count) best = { count, blocks };
    }
    return best;
}

// Xếp tem TRÒN / OVAL — TRỘN hàng thẳng và hàng so le để tối đa số con.
//
// Mỗi hàng nằm ở 1 trong 2 vị trí ngang: thẳng (lệch 0) hoặc so le (lệch dW/2).
//   - 2 hàng CÙNG vị trí  → phải cách nhau dH
//   - 2 hàng KHÁC vị trí  → chỉ cần cách dH×√3/2 (tiết kiệm ~13% chiều cao)
//   - hàng thẳng chứa cols_full con, hàng so le chứa cols_staggered con
// ⇒ mỗi hàng so le thường mất 1 con nhưng tiết kiệm chiều cao. Trộn khéo thì
//   nhét thêm được cả một hàng, hơn CẢ lưới thuần lẫn so le thuần.
//   Vd tròn 90mm trên vùng in 314×340: lưới 9, so le 10, TRỘN 11 (3+3+2+3).
//
// Hằng số √3 suy từ hình học ellipse: hai ellipse lệch ngang nửa bề rộng thì
// khoảng cách dọc tối thiểu là √3 × nửa chiều cao. itemW = itemH ⇒ đúng công
// thức hình tròn cũ.
//
// Cách này BAO TRÙM 2 kiểu cũ: s = 0 là lưới thẳng, s xen kẽ tối đa là so le
// thuần — nên số con chỉ có thể tăng hoặc giữ nguyên, không bao giờ giảm.
function calculateStaggeredLayout(itemW, itemH, areaW, areaH, gap) {
    if (itemW <= 0 || itemH <= 0 || itemW > areaW || itemH > areaH) return { count: 0 };
    const dW = itemW + gap;
    const dH = itemH + gap;
    const vertSpacing = (dH * Math.sqrt(3)) / 2;
    if (vertSpacing <= 0) return { count: 0 };

    const cols_full = Math.floor((areaW + gap) / dW);
    const cols_staggered = Math.floor((areaW - dW / 2 + gap) / dW);
    if (cols_full <= 0) return { count: 0 };

    const maxRows = Math.floor((areaH - itemH) / vertSpacing) + 1;

    // Quy hoạch động: minH[k][s][o] = chiều cao nhỏ nhất để xếp k hàng, trong đó
    // s hàng ở vị trí so le, hàng cuối ở vị trí o (0 = thẳng, 1 = so le).
    // Truy vết `par` để dựng lại vị trí THẬT của từng hàng.
    const INF = Infinity;
    const minH = [];
    const par = [];
    for (let k = 0; k <= maxRows; k++) {
        minH.push(Array.from({ length: maxRows + 2 }, () => [INF, INF]));
        par.push(Array.from({ length: maxRows + 2 }, () => [null, null]));
    }
    minH[1][0][0] = itemH;
    minH[1][1][1] = itemH;

    for (let k = 1; k < maxRows; k++) {
        for (let s = 0; s <= k; s++) {
            for (let o = 0; o < 2; o++) {
                const h = minH[k][s][o];
                if (h === INF) continue;
                for (let o2 = 0; o2 < 2; o2++) {
                    const nh = h + (o === o2 ? dH : vertSpacing);
                    if (nh > areaH + 1e-9) continue;
                    const s2 = s + o2;
                    if (nh < minH[k + 1][s2][o2] - 1e-12) {
                        minH[k + 1][s2][o2] = nh;
                        par[k + 1][s2][o2] = { k, s, o };
                    }
                }
            }
        }
    }

    let best = null;
    for (let k = 1; k <= maxRows; k++) {
        for (let s = 0; s <= k; s++) {
            for (let o = 0; o < 2; o++) {
                if (minH[k][s][o] > areaH + 1e-9) continue;
                const count = (k - s) * cols_full + s * cols_staggered;
                // Hoà số con thì ưu tiên nhiều hàng hơn (xếp xen kẽ dày hơn) —
                // giữ đúng kiểu so le cổ điển ở các ca mà so le vốn đã tối ưu.
                if (!best || count > best.count || (count === best.count && k > best.k)) {
                    best = { count, k, s, o };
                }
            }
        }
    }
    if (!best || best.count <= 0) return { count: 0 };

    // Truy vết ngược ra dãy vị trí của từng hàng.
    const offsets = [];
    let cur = { k: best.k, s: best.s, o: best.o };
    while (cur) {
        offsets.unshift(cur.o);
        cur = par[cur.k][cur.s][cur.o];
    }

    const buildPlan = (offs) => {
        const plan = [];
        let y = 0;
        for (let i = 0; i < offs.length; i++) {
            if (i > 0) y += offs[i] === offs[i - 1] ? dH : vertSpacing;
            plan.push({
                y,
                offsetX: offs[i] === 1 ? dW / 2 : 0,
                cols: offs[i] === 1 ? cols_staggered : cols_full,
            });
        }
        return plan;
    };
    const countOf = (plan) => plan.reduce((a, r) => a + r.cols, 0);

    // Lật toàn bộ (thẳng ↔ so le) cũng là một cách xếp hợp lệ, cùng chiều cao.
    // Chọn bản nhiều con hơn; hoà thì lấy bản BẮT ĐẦU BẰNG HÀNG THẲNG cho đẹp.
    let rowPlan = buildPlan(offsets);
    const flipped = buildPlan(offsets.map((o) => 1 - o));
    if (
        countOf(flipped) > countOf(rowPlan) ||
        (countOf(flipped) === countOf(rowPlan) && offsets[0] === 1)
    ) {
        rowPlan = flipped;
    }

    const planCount = countOf(rowPlan);
    return {
        type: 'hexagonal',
        count: planCount,
        rows: rowPlan.length,
        cols_full,
        cols_staggered,
        // Giữ field cũ cho nhánh vẽ / test cũ; rowPlan mới mới là nguồn chính xác.
        pattern: rowPlan[0] && rowPlan[0].offsetX > 0 ? 'staggered_first' : 'full_first',
        rowPlan,
        itemW,
        itemH,
    };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Calculate stickers per sheet, trying both orientations
export function calculateStickersPerSheet(
    stickerW,
    stickerH,
    sheetW,
    sheetH,
    shape,
    config,
    machine
) {
    const pa = getPrintableArea(sheetW, sheetH, config, machine);
    const gap = config.stickerGap;

    if (shape === 'circle' || shape === 'oval') {
        // Tròn: dùng đường kính (hộp vuông bao ngoài). Oval: giữ đúng W×H.
        const iw = shape === 'circle' ? Math.max(stickerW, stickerH) : stickerW;
        const ih = shape === 'circle' ? Math.max(stickerW, stickerH) : stickerH;

        // Ứng viên xếp trộn (đã bao trùm lưới thẳng + so le thuần).
        // `swapped` = tính trong hệ toạ độ xoay 90° của VÙNG IN → so le theo trục
        // còn lại. Khác hẳn việc xoay CON TEM (chỉ có nghĩa với oval).
        // Phần vẽ sơ đồ dựa vào cờ này để hoán đổi x/y, nên phải tách bạch.
        const mk = (w2, h2, swapped) => {
            const aw = swapped ? pa.h : pa.w;
            const ah = swapped ? pa.w : pa.h;
            return {
                ...calculateStaggeredLayout(w2, h2, aw, ah, gap),
                swapped,
                orientation: swapped ? 'horizontal' : 'vertical',
            };
        };
        const cands = [mk(iw, ih, false), mk(iw, ih, true)];
        if (iw !== ih) cands.push(mk(ih, iw, false), mk(ih, iw, true));
        // Oval còn có thể lợi hơn khi xếp theo hộp chữ nhật bao ngoài (guillotine).
        if (shape === 'oval') {
            const packed = packRectangles(stickerW, stickerH, pa.w, pa.h, gap);
            if (packed.count > 0) {
                cands.push({
                    type: 'packed',
                    count: packed.count,
                    blocks: packed.blocks,
                    itemW: stickerW,
                    itemH: stickerH,
                    orientation: 'mixed',
                });
            }
        }

        const best = cands.reduce((a, b) => (b.count > a.count ? b : a), { count: 0 });
        if (!best || best.count <= 0) return { count: 0, printableW: pa.w, printableH: pa.h };
        return { ...best, printableW: pa.w, printableH: pa.h };
    } else {
        // Xếp hỗn hợp (guillotine) — tối đa số con/tờ.
        const packed = packRectangles(stickerW, stickerH, pa.w, pa.h, gap);
        const base = {
            count: packed.count,
            blocks: packed.blocks,
            printableW: pa.w,
            printableH: pa.h,
        };
        if (packed.blocks.length === 1) {
            const b = packed.blocks[0];
            return {
                ...base,
                type: 'grid',
                cols: b.cols,
                rows: b.rows,
                itemW: b.iw,
                itemH: b.ih,
                orientation: b.iw === stickerW ? 'vertical' : 'horizontal',
            };
        }
        return {
            ...base,
            type: 'packed',
            itemW: stickerW,
            itemH: stickerH,
            orientation: 'mixed',
        };
    }
}

// Calculate sticker sheet items per print sheet
export function calculateSheetsPerPrintSheet(
    sheetW,
    sheetH,
    printSheetW,
    printSheetH,
    config,
    machine
) {
    const pa = getPrintableArea(printSheetW, printSheetH, config, machine);
    const gap = config.stickerGap;
    // Xếp hỗn hợp (guillotine) — tối đa số tờ sticker/tờ in.
    const packed = packRectangles(sheetW, sheetH, pa.w, pa.h, gap);
    const orientation =
        packed.blocks.length === 1
            ? packed.blocks[0].iw === sheetW
                ? 'vertical'
                : 'horizontal'
            : 'mixed';
    return {
        count: packed.count,
        blocks: packed.blocks,
        orientation,
        printableW: pa.w,
        printableH: pa.h,
    };
}
```
<!-- END LEGACY SOURCE -->
