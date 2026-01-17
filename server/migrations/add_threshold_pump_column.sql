-- ============================================================================
-- MIGRATION: Add threshold_Pump column to tbl_watering_threshold
-- MÔ TẢ: Thêm cột threshold_Pump để lưu thông tin bơm nào được sử dụng (V1, V2, hoặc ALL)
-- ============================================================================

USE iot_garden;

-- Kiểm tra xem cột đã tồn tại chưa, nếu chưa thì thêm
SET @dbname = DATABASE();
SET @tablename = 'tbl_watering_threshold';
SET @columnname = 'threshold_Pump';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1', -- Column exists, do nothing
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(10) DEFAULT "V1" COMMENT "Bơm sử dụng: V1, V2, hoặc ALL"')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Kiểm tra kết quả
DESCRIBE tbl_watering_threshold;
