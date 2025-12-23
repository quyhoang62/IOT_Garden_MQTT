# Hướng dẫn cấu hình Email cho IOT Garden

## Bước 1: Tạo App Password cho Gmail

1. Đăng nhập vào tài khoản Gmail của bạn
2. Vào **Google Account Settings** > **Security**
3. Bật **2-Step Verification** (nếu chưa bật)
4. Sau khi bật 2-Step Verification, vào **App passwords**: 
   - URL: https://myaccount.google.com/apppasswords
5. Chọn **Select app** > **Mail**
6. Chọn **Select device** > **Other (Custom name)** > Nhập "IOT Garden"
7. Click **Generate**
8. Copy mật khẩu 16 ký tự được tạo ra

## Bước 2: Cấu hình trong file .env

Thêm các biến sau vào file `.env` trong thư mục `server`:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
```

**Lưu ý:**
- `EMAIL_USER`: Email Gmail của bạn
- `EMAIL_PASS`: App Password 16 ký tự (không phải mật khẩu thường)

## Bước 3: Khởi động lại server

```bash
cd server
npm run dev
```

## Kiểm tra

Sau khi cấu hình xong:
1. Vào **Cài đặt** > **Thông báo** trong ứng dụng
2. Nhập email nhận thông báo
3. Bấm **Gửi test**
4. Kiểm tra hộp thư đến (và cả Spam)

## Troubleshooting

### Lỗi "Invalid login"
- Kiểm tra lại App Password đã đúng chưa
- Đảm bảo 2-Step Verification đã bật

### Lỗi "Less secure apps"
- Google không còn hỗ trợ "Less secure apps"
- Bạn PHẢI sử dụng App Password

### Email vào Spam
- Thêm email gửi vào danh bạ
- Đánh dấu "Not spam" cho email đầu tiên








