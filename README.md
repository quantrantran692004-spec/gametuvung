# WORD SHOOTER

Game luyện phản xạ từ vựng tiếng Anh theo phong cách space arcade. Người chơi nhìn nghĩa tiếng Việt và từ tiếng Anh đang rơi, nghe phát âm, gõ đáp án rồi bắn phá mục tiêu.

## Vòng chơi

1. Từ tiếng Anh hiện đầy đủ trên mục tiêu đang rơi và được đọc thành tiếng.
2. Người chơi gõ bằng bàn phím máy tính hoặc bàn phím ảo; chữ gõ chỉ xuất hiện trong ô nhập.
3. Phi thuyền bắn tia năng lượng vào đúng mục tiêu, tạo nổ hạt sáng, điểm và combo.
4. Từ hụt được đưa vào lượt ôn tiếp theo.

Có chế độ luyện tập, ôn từ sai, tính giờ và sinh tồn. Hồ sơ, kho từ và kết quả được lưu trên thiết bị bằng IndexedDB. PWA giữ ứng dụng và asset đồ họa để chơi offline sau lần tải đầu.

## Công nghệ

- React + TypeScript + Vite cho UI và build.
- PixiJS cho cảnh đấu trường 2D; game logic hiện tại được giữ trong module JavaScript.
- Tailwind CSS, Motion và GSAP cho lớp giao diện/chuyển động.
- Howler.js cho hiệu ứng âm thanh; SpeechSynthesis đọc từ vựng.
- vite-plugin-pwa cho service worker và cache offline.

## Chạy cục bộ

```bash
npm ci
npm run dev
```

## Build và triển khai

```bash
npm run build
npm run preview
```

Vite tạo website tĩnh trong `dist/`. GitHub Pages cần publish thư mục build `dist` (GitHub Actions hoặc Pages artifact); không phục vụ trực tiếp mã nguồn `src/`.

## Kho từ

Thêm từ trong Kho từ hoặc nhập CSV, TXT, XLSX hay JSON. Có thể xuất JSON để sao lưu. Dữ liệu trên điện thoại không tự đồng bộ với máy tính.
