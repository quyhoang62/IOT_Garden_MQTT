-- ============================================================================
-- FILE: iot_garden_database_device_only.sql
-- MÔ TẢ: Database schema - CHỈ QUẢN LÝ BẰNG DEVICE, BỎ GARDEN
-- THIẾT KẾ MỚI:
-- - Bỏ tbl_garden hoàn toàn
-- - Bỏ tbl_user (không cần authentication)
-- - Bỏ tbl_light (không dùng cảm biến ánh sáng)
-- - Tất cả các bảng tham chiếu trực tiếp đến device
-- ============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- ============================================================================
-- XÓA TẤT CẢ BẢNG CŨ (NẾU CÓ)
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `tbl_irrigation_schedule`;
DROP TABLE IF EXISTS `tbl_notification_settings`;
DROP TABLE IF EXISTS `tbl_watering_threshold`;
DROP TABLE IF EXISTS `tbl_water_pump`;
DROP TABLE IF EXISTS `tbl_soil_moisture`;
DROP TABLE IF EXISTS `tbl_dht20`;
DROP TABLE IF EXISTS `tbl_condition`;
DROP TABLE IF EXISTS `tbl_device`;
DROP TABLE IF EXISTS `tbl_garden`;
DROP TABLE IF EXISTS `tbl_user`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- TẠO BẢNG: tbl_device (Thiết bị ESP32 - BẢNG CHÍNH)
-- ============================================================================

CREATE TABLE `tbl_device` (
  `device_ID` int(11) NOT NULL AUTO_INCREMENT,
  `device_Name` varchar(255) NOT NULL COMMENT 'Tên thiết bị (VD: ESP32 Vườn trước)',
  `device_MQTT_ID` int(11) NOT NULL COMMENT 'Device ID trong MQTT topic (VD: 1 cho IOTGARDEN1)',
  `device_Status` enum('ACTIVE','INACTIVE','OFFLINE') NOT NULL DEFAULT 'ACTIVE',
  `device_Location` varchar(255) DEFAULT NULL COMMENT 'Vị trí lắp đặt',
  `device_Description` text DEFAULT NULL,
  `device_Email` varchar(255) DEFAULT NULL COMMENT 'Email để nhận thông báo',
  `device_CreatedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `device_UpdatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`device_ID`),
  UNIQUE KEY `unique_mqtt_id` (`device_MQTT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TẠO BẢNG: tbl_irrigation_schedule (Lịch tưới tự động)
-- ============================================================================

CREATE TABLE `tbl_irrigation_schedule` (
  `schedule_ID` int(11) NOT NULL AUTO_INCREMENT,
  `schedule_DeviceID` int(11) NOT NULL,
  `schedule_Pump` varchar(10) NOT NULL COMMENT 'Bơm 1 hoặc Bơm 2',
  `schedule_Days` varchar(50) NOT NULL COMMENT 'T2,T4,T6 hoặc Hàng ngày',
  `schedule_Time` varchar(10) NOT NULL COMMENT 'HH:MM AM/PM format',
  `schedule_Hour24` int(2) NOT NULL COMMENT 'Giờ 24h format (0-23)',
  `schedule_Minute` int(2) NOT NULL COMMENT 'Phút (0-59)',
  `schedule_Duration` int(11) NOT NULL COMMENT 'Thời lượng tưới (giây)',
  `schedule_Status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1=Active, 0=Paused',
  `schedule_CreatedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `schedule_UpdatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`schedule_ID`),
  KEY `idx_device` (`schedule_DeviceID`),
  KEY `idx_status` (`schedule_Status`),
  KEY `idx_time` (`schedule_Hour24`, `schedule_Minute`),
  CONSTRAINT `fk_schedule_device` FOREIGN KEY (`schedule_DeviceID`) REFERENCES `tbl_device` (`device_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TẠO BẢNG: tbl_watering_threshold (Ngưỡng tưới tự động)
-- ============================================================================

CREATE TABLE `tbl_watering_threshold` (
  `threshold_ID` int(11) NOT NULL AUTO_INCREMENT,
  `threshold_DeviceID` int(11) NOT NULL COMMENT 'Device ID',
  `threshold_Temp_Min` decimal(5,2) DEFAULT NULL COMMENT 'Nhiệt độ tối thiểu để tưới',
  `threshold_Temp_Max` decimal(5,2) DEFAULT NULL COMMENT 'Nhiệt độ tối đa để tưới',
  `threshold_Humidity_Min` decimal(5,2) DEFAULT NULL COMMENT 'Độ ẩm không khí tối thiểu',
  `threshold_Humidity_Max` decimal(5,2) DEFAULT NULL COMMENT 'Độ ẩm không khí tối đa',
  `threshold_SoilMoisture_Min` int(11) DEFAULT NULL COMMENT 'Độ ẩm đất tối thiểu (%)',
  `threshold_SoilMoisture_Max` int(11) DEFAULT NULL COMMENT 'Độ ẩm đất tối đa (%)',
  `threshold_Enabled` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Bật/tắt tưới tự động',
  `threshold_Duration` int(11) NOT NULL DEFAULT 10 COMMENT 'Thời lượng tưới (giây)',
  `threshold_CreatedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `threshold_UpdatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`threshold_ID`),
  UNIQUE KEY `unique_device_threshold` (`threshold_DeviceID`),
  CONSTRAINT `fk_threshold_device` FOREIGN KEY (`threshold_DeviceID`) REFERENCES `tbl_device` (`device_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TẠO BẢNG: tbl_dht20 (Dữ liệu cảm biến nhiệt độ và độ ẩm không khí)
-- ============================================================================

CREATE TABLE `tbl_dht20` (
  `dht_ID` int(11) NOT NULL AUTO_INCREMENT,
  `dht_Time` timestamp NOT NULL DEFAULT current_timestamp(),
  `dht_Temp` varchar(255) NOT NULL,
  `dht_Humid` varchar(255) NOT NULL,
  `dht_DeviceID` int(11) NOT NULL COMMENT 'Device ID thay vì GardenID',
  PRIMARY KEY (`dht_ID`),
  KEY `dht_DeviceID` (`dht_DeviceID`),
  CONSTRAINT `tbl_dht20_ibfk_1` FOREIGN KEY (`dht_DeviceID`) REFERENCES `tbl_device` (`device_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TẠO BẢNG: tbl_soil_moisture (Dữ liệu cảm biến độ ẩm đất)
-- ============================================================================

CREATE TABLE `tbl_soil_moisture` (
  `soil_moisture_ID` int(11) NOT NULL AUTO_INCREMENT,
  `soil_moisture_Time` timestamp NOT NULL DEFAULT current_timestamp(),
  `soil_moisture_Value` varchar(255) NOT NULL,
  `soil_moisture_DeviceID` int(11) NOT NULL COMMENT 'Device ID thay vì GardenID',
  PRIMARY KEY (`soil_moisture_ID`),
  KEY `soil_moisture_DeviceID` (`soil_moisture_DeviceID`),
  CONSTRAINT `tbl_soil_moisture_ibfk_1` FOREIGN KEY (`soil_moisture_DeviceID`) REFERENCES `tbl_device` (`device_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TẠO BẢNG: tbl_water_pump (Lịch sử bơm nước)
-- ============================================================================

CREATE TABLE `tbl_water_pump` (
  `water_pump_ID` int(11) NOT NULL AUTO_INCREMENT,
  `water_pump_Time` timestamp NOT NULL DEFAULT current_timestamp(),
  `water_pump_Value` varchar(255) NOT NULL,
  `water_pump_DeviceID` int(11) NOT NULL COMMENT 'Device ID thay vì GardenID',
  PRIMARY KEY (`water_pump_ID`),
  KEY `water_pump_DeviceID` (`water_pump_DeviceID`),
  CONSTRAINT `tbl_water_pump_ibfk_1` FOREIGN KEY (`water_pump_DeviceID`) REFERENCES `tbl_device` (`device_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TẠO BẢNG: tbl_condition (Điều kiện tự động - có thể không dùng)
-- ============================================================================

CREATE TABLE `tbl_condition` (
  `condition_ID` int(11) NOT NULL AUTO_INCREMENT,
  `condition_Amdat` varchar(255) NOT NULL,
  `condition_Temp` varchar(255) NOT NULL,
  `condition_Humid` varchar(255) NOT NULL,
  `condition_DeviceID` int(11) NOT NULL COMMENT 'Device ID thay vì GardenID',
  PRIMARY KEY (`condition_ID`),
  KEY `condition_DeviceID` (`condition_DeviceID`),
  CONSTRAINT `tbl_condition_ibfk_1` FOREIGN KEY (`condition_DeviceID`) REFERENCES `tbl_device` (`device_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DỮ LIỆU MẪU
-- ============================================================================

-- Tạo device mẫu
INSERT INTO `tbl_device` (`device_ID`, `device_Name`, `device_MQTT_ID`, `device_Status`, `device_Location`, `device_Description`, `device_Email`) VALUES
(1, 'ESP32 - Vườn 1', 1, 'ACTIVE', 'Vườn ban công', 'Thiết bị ESP32 chính', 'user@example.com');

-- ============================================================================
-- RESET AUTO_INCREMENT
-- ============================================================================

ALTER TABLE `tbl_device` AUTO_INCREMENT = 2;
ALTER TABLE `tbl_irrigation_schedule` AUTO_INCREMENT = 1;
ALTER TABLE `tbl_watering_threshold` AUTO_INCREMENT = 1;
ALTER TABLE `tbl_dht20` AUTO_INCREMENT = 1;
ALTER TABLE `tbl_soil_moisture` AUTO_INCREMENT = 1;
ALTER TABLE `tbl_water_pump` AUTO_INCREMENT = 1;
ALTER TABLE `tbl_condition` AUTO_INCREMENT = 1;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- ============================================================================
-- HOÀN TẤT
-- ============================================================================
-- 
-- Database đã được tạo với:
-- ✅ Bỏ tbl_garden hoàn toàn
-- ✅ Bỏ tbl_user (không cần authentication)
-- ✅ Bỏ tbl_light (không dùng cảm biến ánh sáng)
-- ✅ tbl_device là bảng chính, tất cả tham chiếu đến device
-- ✅ Tất cả các bảng sensor tham chiếu device_ID thay vì garden_ID
-- ✅ Foreign keys và constraints
-- ✅ Indexes để tối ưu performance
-- ✅ Dữ liệu mẫu (1 device)
-- ============================================================================

