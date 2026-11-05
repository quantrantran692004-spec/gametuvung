# WORD SHOOTER — Chạy và triển khai

## Chạy trong lúc phát triển

Cần Node.js 20.19+ hoặc 22.12+ để dùng Vite hiện tại.

```bash
npm ci
npm run dev
```

## Tạo bản phát hành

```bash
npm run build
npm run preview
```

Vite tạo bản static trong `dist/`. GitHub Pages phải deploy artifact `dist` bằng GitHub Actions hoặc Pages artifact; cấu hình “Deploy from a branch / root” không chạy được mã `src/` trực tiếp.

## Dữ liệu

Hồ sơ, kho từ và thống kê được lưu trong IndexedDB của từng trình duyệt. Dữ liệu không tự đồng bộ giữa điện thoại và máy tính. Service worker do vite-plugin-pwa tạo sẽ cache app, giao diện và asset để dùng offline sau lần tải đầu.
