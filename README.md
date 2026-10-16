# ⚡ WORD SHOOTER — CYBERPUNK VOCABULARY DEFENSE

> Game học từ vựng tiếng Anh bắn chữ phong cách Cyberpunk Neon (PWA Offline-First).  
> **Repository:** [quantrantran692004-spec/gametuvung](https://github.com/quantrantran692004-spec/gametuvung)

---

## 🎮 Giới thiệu Trò chơi
**WORD SHOOTER** là ứng dụng web PWA kết hợp việc ghi nhớ từ vựng tiếng Anh với lối chơi bắn chữ tốc độ cao:
- **Lối chơi bắn chữ:** Các từ vựng/nghĩa xuất hiện và rơi xuống từ phía trên. Người chơi gõ câu trả lời chính xác để pháo laser bắn nổ từ tương ứng.
- **Phong cách đồ họa:** Cyberpunk Neon, Canvas 2D mượt mà, hiệu ứng nổ hạt sáng (particles) và tia laser rực rỡ.
- **Local-First & PWA:** Lưu trữ toàn bộ dữ liệu từ vựng, hồ sơ và thành tích offline bằng **IndexedDB**. Có thể cài đặt lên máy tính, Android, iOS.
- **Âm thanh & Phát âm:** Tích hợp Web Audio API (âm thanh procedural không cần tải file ngoài) và SpeechSynthesis API (phát âm từ vựng tiếng Anh chuẩn giọng).

---

## 🚀 Các Tính Năng Đã Triển Khai (Giai Đoạn 1)
- [x] **Trò chơi cốt lõi (Game Engine):**
  - Vòng lặp game Canvas 2D 60FPS.
  - Pháo laser ngắm và bắn trúng từ vựng khi nhập đúng.
  - Hiệu ứng nổ hạt sáng Neon (Cyberpunk Particle Explosions).
  - Hệ thống tính điểm, hệ số Combo tăng dần, số mạng (Hearts) và thời gian đếm ngược.
  - 3 chế độ chơi: **Sinh tồn (Survival)**, **Tính giờ (Timed)**, **Luyện tập (Practice)**.
  - Hỗ trợ đổi chiều từ: **Tiếng Anh ➔ Tiếng Việt** hoặc **Tiếng Việt ➔ Tiếng Anh**.
- [x] **Kiểm tra đáp án thông minh (Answer Checker):**
  - Không phân biệt hoa/thường, tự chuẩn hóa khoảng trắng và dấu câu.
  - Thuật toán Levenshtein Distance chấp nhận lỗi gõ phím nhỏ (Fuzzy matching).
- [x] **Quản lý từ vựng (Vocab Manager):**
  - Lưu trữ qua IndexedDB, dữ liệu tồn tại vĩnh viễn trên máy không sợ mất.
  - Tích hợp sẵn bộ 15 từ vựng mẫu chủ đề Công nghệ / Cyberpunk.
  - Thêm từ mới, phân loại Unit/Chủ đề, xem phiên âm IPA.
  - Xóa mềm (Soft delete) an toàn đưa vào thùng rác.
- [x] **Hồ sơ người chơi (Profiles):**
  - Hỗ trợ nhiều người chơi trên cùng một thiết bị.
  - Hồ sơ khách (Guest) và hồ sơ tùy chỉnh tên + Avatar.
  - Cài đặt cấu hình riêng cho từng hồ sơ.
- [x] **Cài đặt & Hiệu năng (Accessibility & Settings):**
  - 3 chế độ hiệu năng: Low-power (máy yếu), Balanced (cân bằng), Visual Max (hiệu ứng tối đa).
  - Tùy chỉnh tốc độ rơi, số mạng bắt đầu, bật/tắt âm thanh và giọng đọc phát âm.
- [x] **PWA & Offline:**
  - File `manifest.json` chuẩn PWA.
  - Service Worker `sw.js` cache tài nguyên chạy offline 100%.

---

## 🛠 Hướng Dẫn Chạy & Cài Đặt

### Cách 1: Chơi trực tiếp trên GitHub Pages
Bật GitHub Pages tại repo Settings -> Pages -> Source: `Deploy from a branch` (nhánh `main`) -> Save.

### Cách 2: Chạy trên máy tính (Local Server)
```bash
# Cài đặt hoặc mở bằng bất kỳ web server tĩnh nào:
# Dùng Python:
python -m http.server 8080

# Hoặc dùng Node.js npx:
npx serve .
```
Mở trình duyệt truy cập: `http://localhost:8080`

---

## 📜 Giấy Phép
Dự án được phân phối dưới giấy phép **MIT License**.
