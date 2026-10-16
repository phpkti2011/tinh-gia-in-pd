// Spiral (sổ đóng lò xo) config — schema version & metadata.

export const SPIRAL_MODULE_NAME = 'spiral';

//   1.1.0 - them LAMINATION_FILMS (optional): loai mang can (Mo/Bong/...),
//           phu thu % cong tren tien can mang. Thieu field = mac dinh Mo/Bong 0%
//           => gia khong doi.

//   1.2.0 - them SPIRAL_CONFIG.linerSizeFactors (optional): he so chia gia bia kinh
//           (gia nhap la gia A4; A5 chia 1.5, A6 chia 2.5). Thieu field = bang mac dinh.

export const SPIRAL_CONFIG_SCHEMA_VERSION = '1.2.0';

export const SPIRAL_CONFIG_LAST_UPDATED = '2026-10-16';
