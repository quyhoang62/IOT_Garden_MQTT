-- ============================================================================
-- MIGRATION: Create irrigation_schedules table
-- MÔ TẢ: Tạo bảng lưu trữ lịch tưới tự động
-- ============================================================================

CREATE TABLE IF NOT EXISTS `tbl_irrigation_schedule` (
  `schedule_ID` INT(11) NOT NULL AUTO_INCREMENT,
  `schedule_GardenID` INT(11) NOT NULL,
  `schedule_DeviceID` INT(11) NOT NULL,
  `schedule_Pump` VARCHAR(10) NOT NULL COMMENT 'Bơm 1 hoặc Bơm 2',
  `schedule_Days` VARCHAR(50) NOT NULL COMMENT 'T2,T4,T6 hoặc Hàng ngày',
  `schedule_Time` VARCHAR(10) NOT NULL COMMENT 'HH:MM AM/PM format',
  `schedule_Hour24` INT(2) NOT NULL COMMENT 'Giờ 24h format (0-23)',
  `schedule_Minute` INT(2) NOT NULL COMMENT 'Phút (0-59)',
  `schedule_Duration` INT(11) NOT NULL COMMENT 'Thời lượng tưới (giây)',
  `schedule_Status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Active, 0=Paused',
  `schedule_CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `schedule_UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`schedule_ID`),
  KEY `idx_garden_device` (`schedule_GardenID`, `schedule_DeviceID`),
  KEY `idx_status` (`schedule_Status`),
  KEY `idx_time` (`schedule_Hour24`, `schedule_Minute`),
  CONSTRAINT `fk_schedule_garden` FOREIGN KEY (`schedule_GardenID`) REFERENCES `tbl_garden` (`garden_ID`) ON DELETE CASCADE,
  CONSTRAINT `fk_schedule_device` FOREIGN KEY (`schedule_DeviceID`) REFERENCES `tbl_device` (`device_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

