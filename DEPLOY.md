# WORD SHOOTER — Chạy và triển khai

## Vị trí các file chính

- `index.html`: màn hình và luồng giao diện.
- `css/main.css`: theme, menu, form và layout chung.
- `css/game.css`: sân chơi, HUD, ô nhập, súng và bàn phím ảo.
- `js/app.js`: điều phối ứng dụng.
- `js/game-engine.js`: vòng lặp game, mục tiêu rơi, bắn và tính điểm.
- `js/vocab-manager.js`: từ vựng.
- `js/sentence-manager.js`: câu mẫu cho chế độ nghe chép chính tả.
- `sw.js`: cache PWA/offline.

Không cần tạo thêm thư mục build. Đây là website HTML/CSS/JavaScript tĩnh; các file chạy trực tiếp từ thư mục gốc repository.

## Chạy local

```bash
python3 -m http.server 8080
```

Mở `http://localhost:8080`.

## GitHub Pages

Repository đã cấu hình Pages từ nhánh `main`, thư mục `/`.

URL:

```text
https://quantrantran692004-spec.github.io/gametuvung/
```

Sau khi push commit mới, GitHub Pages có thể mất một lúc để build. Nếu điện thoại còn giữ bản cũ, hãy tải lại trang hoặc mở cửa sổ riêng tư.

## Lưu ý dữ liệu

Dữ liệu hồ sơ, từ vựng và thống kê được lưu trong IndexedDB của từng trình duyệt/thiết bị. Dữ liệu trên điện thoại không tự đồng bộ với máy tính. Nếu trình duyệt chặn IndexedDB, ứng dụng dùng bộ nhớ tạm trong phiên và sẽ thông báo rõ.
