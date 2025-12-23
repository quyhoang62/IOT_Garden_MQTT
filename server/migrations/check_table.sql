-- ============================================================================
-- SCRIPT KIỂM TRA: Kiểm tra xem bảng tbl_irrigation_schedule đã tồn tại chưa
-- ============================================================================

-- Kiểm tra bảng có tồn tại không
SHOW TABLES LIKE 'tbl_irrigation_schedule';

-- Nếu bảng tồn tại, hiển thị cấu trúc
DESCRIBE tbl_irrigation_schedule;

-- Kiểm tra foreign keys
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

