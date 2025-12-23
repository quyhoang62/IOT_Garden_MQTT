-- ============================================================================
-- MIGRATION: Add Device Management and Update Database Structure
-- MÔ TẢ: Thêm quản lý thiết bị, bỏ admin, cập nhật cấu trúc
-- LƯU Ý: Chạy file này trên database đã có dữ liệu, KHÔNG chạy lại file gốc
-- ============================================================================

-- 1. Tạo bảng quản lý thiết bị (ESP32)
CREATE TABLE IF NOT EXISTS `tbl_device` (
  `device_ID` int(11) NOT NULL AUTO_INCREMENT,
  `device_Name` varchar(255) NOT NULL COMMENT 'Tên thiết bị (VD: ESP32 Vườn trước)',
  `device_MQTT_ID` int(11) NOT NULL COMMENT 'Device ID trong MQTT topic (VD: 1 cho IOTGARDEN1)',
  `device_GardenID` int(11) NOT NULL COMMENT 'Garden ID mà thiết bị thuộc về',
  `device_Status` enum('ACTIVE','INACTIVE','OFFLINE') NOT NULL DEFAULT 'ACTIVE',
  `device_Location` varchar(255) DEFAULT NULL COMMENT 'Vị trí lắp đặt',
  `device_Description` text DEFAULT NULL,
  `device_CreatedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `device_UpdatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`device_ID`),
  UNIQUE KEY `unique_mqtt_id` (`device_MQTT_ID`),
  KEY `fk_device_garden` (`device_GardenID`),
  CONSTRAINT `fk_device_garden` FOREIGN KEY (`device_GardenID`) REFERENCES `tbl_garden` (`garden_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Thêm cột device_ID vào tbl_garden (chỉ thêm nếu chưa có)
SET @dbname = DATABASE();
SET @tablename = 'tbl_garden';
SET @columnname = 'garden_DeviceID';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' int(11) DEFAULT NULL COMMENT ''Device ID mặc định cho garden này''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Thêm index và foreign key cho garden_DeviceID (nếu chưa có)
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (constraint_name = 'fk_garden_device')
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD KEY fk_garden_device (garden_DeviceID), ADD CONSTRAINT fk_garden_device FOREIGN KEY (garden_DeviceID) REFERENCES tbl_device (device_ID) ON DELETE SET NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 3. Tạo bảng ngưỡng tưới tự động
CREATE TABLE IF NOT EXISTS `tbl_watering_threshold` (
  `threshold_ID` int(11) NOT NULL AUTO_INCREMENT,
  `threshold_GardenID` int(11) NOT NULL,
  `threshold_Temp_Min` decimal(5,2) DEFAULT NULL COMMENT 'Nhiệt độ tối thiểu để tưới',
  `threshold_Temp_Max` decimal(5,2) DEFAULT NULL COMMENT 'Nhiệt độ tối đa để tưới',
  `threshold_Humidity_Min` decimal(5,2) DEFAULT NULL COMMENT 'Độ ẩm không khí tối thiểu',
  `threshold_Humidity_Max` decimal(5,2) DEFAULT NULL COMMENT 'Độ ẩm không khí tối đa',
  `threshold_SoilMoisture_Min` int(11) DEFAULT NULL COMMENT 'Độ ẩm đất tối thiểu (%)',
  `threshold_SoilMoisture_Max` int(11) DEFAULT NULL COMMENT 'Độ ẩm đất tối đa (%)',
  `threshold_Enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Bật/tắt tưới tự động',
  `threshold_Duration` int(11) NOT NULL DEFAULT 10 COMMENT 'Thời lượng tưới (giây)',
  `threshold_CreatedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `threshold_UpdatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`threshold_ID`),
  UNIQUE KEY `unique_garden_threshold` (`threshold_GardenID`),
  CONSTRAINT `fk_threshold_garden` FOREIGN KEY (`threshold_GardenID`) REFERENCES `tbl_garden` (`garden_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Cập nhật tbl_user: Bỏ role ADMIN, chỉ giữ USER (chỉ sửa nếu cần)
-- LƯU Ý: Dòng này có thể gây lỗi nếu đang có user với role ADMIN
-- Nếu có lỗi, bỏ qua dòng này hoặc cập nhật thủ công
-- ALTER TABLE `tbl_user` MODIFY COLUMN `user_Role` enum('USER') NOT NULL DEFAULT 'USER';

-- 5. Xóa dữ liệu admin (nếu có) - Bỏ qua nếu không có bảng tbl_admin
-- DELETE FROM `tbl_admin` WHERE 1=1;

-- 6. Thêm device mặc định cho garden hiện có (nếu chưa có)
INSERT INTO `tbl_device` (`device_Name`, `device_MQTT_ID`, `device_GardenID`, `device_Status`, `device_Location`)
SELECT 
  CONCAT('ESP32 - ', COALESCE(g.garden_Name, CONCAT('Garden ', g.garden_ID))),
  g.garden_ID, -- MQTT ID = Garden ID (có thể thay đổi sau)
  g.garden_ID,
  'ACTIVE',
  COALESCE(g.garden_Location, 'Default location')
FROM `tbl_garden` g
WHERE NOT EXISTS (
  SELECT 1 FROM `tbl_device` d WHERE d.device_GardenID = g.garden_ID
);

-- 7. Cập nhật garden_DeviceID cho các garden hiện có
UPDATE `tbl_garden` g
INNER JOIN `tbl_device` d ON d.device_GardenID = g.garden_ID
SET g.garden_DeviceID = d.device_ID
WHERE g.garden_DeviceID IS NULL;

-- 8. Tạo ngưỡng mặc định cho các garden (nếu chưa có)
INSERT INTO `tbl_watering_threshold` (`threshold_GardenID`, `threshold_Temp_Min`, `threshold_Temp_Max`, `threshold_Humidity_Min`, `threshold_Humidity_Max`, `threshold_SoilMoisture_Min`, `threshold_SoilMoisture_Max`, `threshold_Enabled`, `threshold_Duration`)
SELECT 
  g.garden_ID,
  25.0,  -- Nhiệt độ tối thiểu
  35.0,  -- Nhiệt độ tối đa
  30.0,  -- Độ ẩm không khí tối thiểu
  80.0,  -- Độ ẩm không khí tối đa
  30,    -- Độ ẩm đất tối thiểu (%)
  70,    -- Độ ẩm đất tối đa (%)
  0,     -- Tắt mặc định (user bật sau)
  10     -- 10 giây
FROM `tbl_garden` g
WHERE NOT EXISTS (
  SELECT 1 FROM `tbl_watering_threshold` t WHERE t.threshold_GardenID = g.garden_ID
);








