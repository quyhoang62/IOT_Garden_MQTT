/**
 * ============================================================================
 * FILE: services/scheduleService.js
 * MÔ TẢ: Service để kiểm tra và thực thi lịch tưới tự động
 * ============================================================================
 */

const scheduleModel = require('../models/scheduleModel');
const mqttController = require('../controllers/mqttController');

/**
 * Kiểm tra và thực thi lịch tưới
 * Chạy mỗi phút để kiểm tra xem có lịch nào cần thực thi không
 */
const checkAndExecuteSchedules = async () => {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Map day number to Vietnamese day abbreviation
    const dayMap = {
      0: 'CN', // Sunday
      1: 'T2', // Monday
      2: 'T3', // Tuesday
      3: 'T4', // Wednesday
      4: 'T5', // Thursday
      5: 'T6', // Friday
      6: 'T7'  // Saturday
    };
    const currentDayVN = dayMap[currentDay];

    // Lấy tất cả lịch đang active
    const activeSchedules = await scheduleModel.getActiveSchedules();

    for (const schedule of activeSchedules) {
      // Kiểm tra thời gian
      if (schedule.schedule_Hour24 === currentHour && schedule.schedule_Minute === currentMinute) {
        // Kiểm tra ngày áp dụng
        let shouldExecute = false;
        
        if (schedule.schedule_Days === 'Hàng ngày') {
          shouldExecute = true;
        } else {
          const daysArray = schedule.schedule_Days.split(',').map(d => d.trim());
          shouldExecute = daysArray.includes(currentDayVN);
        }

        if (shouldExecute) {
          // Xác định relay(s) dựa trên pump
          // Hỗ trợ: 'Bơm 1', 'Bơm 2', 'Cả hai' (hoặc chứa 'Cả')
          let relays = [];
          if (schedule.schedule_Pump === 'Bơm 1') relays = ['V1'];
          else if (schedule.schedule_Pump === 'Bơm 2') relays = ['V2'];
          else if (typeof schedule.schedule_Pump === 'string' && schedule.schedule_Pump.includes('Cả')) relays = ['V1', 'V2'];
          else {
            // Fallback: try to parse common values
            relays = schedule.schedule_Pump && schedule.schedule_Pump.toLowerCase().includes('1') ? ['V1'] : ['V2'];
          }
          const duration = schedule.schedule_Duration; // Đã là giây

          console.log(`[SCHEDULE] Executing schedule ${schedule.schedule_ID}: ${schedule.schedule_Pump} at ${schedule.schedule_Time}`);

          // Thực thi lịch tưới
          try {
            // Gọi controlRelay thông qua mqttController
            const mockReq = {
              body: {
                relay: relays,
                deviceId: schedule.schedule_DeviceID,
                duration: duration,
                mode: 'SCHEDULED'
              }
            };
            const mockRes = {
              json: (data) => {
                console.log(`[SCHEDULE] Successfully executed schedule ${schedule.schedule_ID}:`, data);
              },
              status: (code) => ({
                json: (data) => {
                  console.error(`[SCHEDULE] Error executing schedule ${schedule.schedule_ID} (${code}):`, data);
                }
              })
            };

            await mqttController.controlRelay(mockReq, mockRes);
          } catch (error) {
            console.error(`[SCHEDULE] Error executing schedule ${schedule.schedule_ID}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('[SCHEDULE] Error checking schedules:', error);
  }
};

/**
 * Khởi động scheduled job
 * Chạy mỗi phút để kiểm tra lịch
 */
const startScheduleJob = () => {
  console.log('[SCHEDULE] Starting schedule job - checking every minute');
  
  // Chạy ngay lập tức để kiểm tra
  checkAndExecuteSchedules();
  
  // Sau đó chạy mỗi phút (60000ms)
  setInterval(() => {
    checkAndExecuteSchedules();
  }, 60000); // 1 minute
};

module.exports = {
  checkAndExecuteSchedules,
  startScheduleJob
};

