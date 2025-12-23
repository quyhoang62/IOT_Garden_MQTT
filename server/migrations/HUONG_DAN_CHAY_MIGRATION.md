# 📋 HƯỚNG DẪN CHẠY MIGRATION SQL

## 🎯 Mục đích
Tạo bảng `tbl_irrigation_schedule` để lưu trữ lịch tưới tự động trong database.

---

## 📌 THÔNG TIN DATABASE

Dựa vào file `config.js`, thông tin kết nối database của bạn:
- **Host:** `localhost`
- **User:** `root`
- **Password:** (để trống)
- **Database:** `iot_garden`
- **Port:** `3306` (mặc định)

---

## 🔧 PHƯƠNG PHÁP 1: Sử dụng MySQL Command Line (Khuyến nghị)

### Bước 1: Mở Command Prompt hoặc Terminal

**Windows:**
- Nhấn `Win + R`, gõ `cmd` và nhấn Enter
- Hoặc tìm "Command Prompt" trong Start Menu

**Mac/Linux:**
- Mở Terminal

### Bước 2: Kết nối đến MySQL

```bash
mysql -u root -p
```

**Lưu ý:** 
- Nếu password để trống, chỉ cần nhấn Enter khi được hỏi password
- Nếu có password, nhập password và nhấn Enter

### Bước 3: Chọn database

```sql
USE iot_garden;
```

### Bước 4: Chạy migration SQL

**Cách 1: Copy và paste trực tiếp**

1. Mở file `server/migrations/create_irrigation_schedules.sql`
2. Copy toàn bộ nội dung (Ctrl+C)
3. Paste vào MySQL command line (Ctrl+V)
4. Nhấn Enter để thực thi

**Cách 2: Sử dụng source command**

```sql
SOURCE f:/Tai Lieu/Tai_lieu_bk/DoAn/IOT_Garden_Web/server/migrations/create_irrigation_schedules.sql;
```

**Lưu ý:** Đường dẫn phải là đường dẫn tuyệt đối và sử dụng dấu `/` thay vì `\`

### Bước 5: Kiểm tra kết quả

```sql
SHOW TABLES LIKE 'tbl_irrigation_schedule';
```

Nếu thấy bảng trong kết quả, migration đã thành công!

```sql
DESCRIBE tbl_irrigation_schedule;
```

Lệnh này sẽ hiển thị cấu trúc bảng để bạn xác nhận.

### Bước 6: Thoát MySQL

```sql
EXIT;
```

---

## 🖥️ PHƯƠNG PHÁP 2: Sử dụng MySQL Workbench

### Bước 1: Mở MySQL Workbench

1. Khởi động MySQL Workbench
2. Kết nối đến server MySQL (thường là "Local instance MySQL80" hoặc tương tự)

### Bước 2: Chọn database

1. Trong panel bên trái, click vào database `iot_garden`
2. Hoặc chạy lệnh: `USE iot_garden;` trong query tab

### Bước 3: Mở file SQL

1. Click **File** → **Open SQL Script**
2. Điều hướng đến: `server/migrations/create_irrigation_schedules.sql`
3. Click **Open**

### Bước 4: Chạy script

1. Click nút **Execute** (⚡) trên thanh toolbar
2. Hoặc nhấn `Ctrl + Shift + Enter`
3. Kiểm tra kết quả trong panel "Output" ở phía dưới

### Bước 5: Kiểm tra bảng đã tạo

1. Trong panel bên trái, refresh database `iot_garden`
2. Mở rộng **Tables**
3. Tìm bảng `tbl_irrigation_schedule`
4. Click chuột phải → **Select Rows** để xem dữ liệu (sẽ trống lúc đầu)

---

## 🌐 PHƯƠNG PHÁP 3: Sử dụng phpMyAdmin

### Bước 1: Mở phpMyAdmin

1. Mở trình duyệt
2. Truy cập: `http://localhost/phpmyadmin`
3. Đăng nhập với:
   - **Username:** `root`
   - **Password:** (để trống hoặc nhập password của bạn)

### Bước 2: Chọn database

1. Click vào database `iot_garden` trong danh sách bên trái

### Bước 3: Chạy SQL

1. Click tab **SQL** ở phía trên
2. Mở file `server/migrations/create_irrigation_schedules.sql`
3. Copy toàn bộ nội dung và paste vào ô SQL
4. Click nút **Go** để thực thi

### Bước 4: Kiểm tra kết quả

1. Refresh trang
2. Kiểm tra trong danh sách bảng có `tbl_irrigation_schedule`

---

## 💻 PHƯƠNG PHÁP 4: Sử dụng Command Line (Windows)

### Bước 1: Mở Command Prompt

Nhấn `Win + R`, gõ `cmd`, nhấn Enter

### Bước 2: Chạy lệnh MySQL

```bash
mysql -u root -p iot_garden < "f:\Tai Lieu\Tai_lieu_bk\DoAn\IOT_Garden_Web\server\migrations\create_irrigation_schedules.sql"
```

**Lưu ý:** 
- Nếu có password, nhập password khi được hỏi
- Nếu không có password, sử dụng: `mysql -u root iot_garden < "đường_dẫn\đến\file.sql"`

### Bước 3: Kiểm tra

```bash
mysql -u root -p iot_garden -e "SHOW TABLES LIKE 'tbl_irrigation_schedule';"
```

---

## ✅ KIỂM TRA SAU KHI CHẠY MIGRATION

### 1. Kiểm tra bảng đã tồn tại

```sql
SHOW TABLES LIKE 'tbl_irrigation_schedule';
```

**Kết quả mong đợi:**
```
+----------------------------------+
| Tables_in_iot_garden (tbl_irrigation_schedule) |
+----------------------------------+
| tbl_irrigation_schedule          |
+----------------------------------+
```

### 2. Kiểm tra cấu trúc bảng

```sql
DESCRIBE tbl_irrigation_schedule;
```

**Kết quả mong đợi:** Hiển thị các cột:
- `schedule_ID`
- `schedule_GardenID`
- `schedule_DeviceID`
- `schedule_Pump`
- `schedule_Days`
- `schedule_Time`
- `schedule_Hour24`
- `schedule_Minute`
- `schedule_Duration`
- `schedule_Status`
- `schedule_CreatedAt`
- `schedule_UpdatedAt`

### 3. Kiểm tra Foreign Keys

```sql
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    TABLE_SCHEMA = 'iot_garden'
    AND TABLE_NAME = 'tbl_irrigation_schedule'
    AND REFERENCED_TABLE_NAME IS NOT NULL;
```

**Kết quả mong đợi:** Hiển thị 2 foreign keys:
- `fk_schedule_garden` → `tbl_garden.garden_ID`
- `fk_schedule_device` → `tbl_device.device_ID`

---

## ⚠️ XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi 1: "Table already exists"

**Nguyên nhân:** Bảng đã được tạo trước đó

**Giải pháp:**
```sql
DROP TABLE IF EXISTS tbl_irrigation_schedule;
```
Sau đó chạy lại migration.

### Lỗi 2: "Unknown database 'iot_garden'"

**Nguyên nhân:** Database chưa được tạo

**Giải pháp:**
```sql
CREATE DATABASE IF NOT EXISTS iot_garden;
USE iot_garden;
```
Sau đó chạy lại migration.

### Lỗi 3: "Access denied for user 'root'@'localhost'"

**Nguyên nhân:** Sai username hoặc password

**Giải pháp:**
- Kiểm tra lại thông tin đăng nhập trong `config.js`
- Hoặc sử dụng user khác có quyền:
```bash
mysql -u your_username -p
```

### Lỗi 4: "Cannot add foreign key constraint"

**Nguyên nhân:** Bảng `tbl_garden` hoặc `tbl_device` chưa tồn tại

**Giải pháp:**
1. Kiểm tra các bảng đã tồn tại:
```sql
SHOW TABLES;
```

2. Nếu thiếu, tạo các bảng cần thiết trước khi chạy migration này.

---

## 🚀 SAU KHI MIGRATION THÀNH CÔNG

1. **Khởi động lại server Node.js:**
   ```bash
   cd server
   npm start
   ```

2. **Kiểm tra log:**
   - Server sẽ hiển thị: `[SCHEDULE] Starting schedule job - checking every minute`
   - Điều này xác nhận scheduled job đã được khởi động

3. **Test tạo lịch tưới:**
   - Mở ứng dụng frontend
   - Vào phần "Quản lý tưới" → Tab "Tưới theo lịch"
   - Tạo một lịch tưới mới
   - Kiểm tra xem lịch có được lưu vào database không

---

## 📝 GHI CHÚ

- Migration này sử dụng `CREATE TABLE IF NOT EXISTS`, nên có thể chạy nhiều lần mà không gây lỗi
- Foreign keys sẽ tự động xóa dữ liệu liên quan khi xóa garden hoặc device (ON DELETE CASCADE)
- Bảng sử dụng InnoDB engine để hỗ trợ transactions và foreign keys
- Charset utf8mb4 hỗ trợ đầy đủ các ký tự Unicode, bao gồm emoji

---

## 🆘 CẦN HỖ TRỢ?

Nếu gặp vấn đề, hãy:
1. Kiểm tra log MySQL để xem lỗi chi tiết
2. Đảm bảo MySQL service đang chạy
3. Kiểm tra quyền của user MySQL
4. Xem lại thông tin kết nối trong `config.js`

