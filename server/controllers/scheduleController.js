/**
 * ============================================================================
 * FILE: controllers/scheduleController.js
 * MÔ TẢ: Controller xử lý các API requests liên quan đến lịch tưới
 * ============================================================================
 */

const scheduleModel = require('../models/scheduleModel');
const deviceModel = require('../models/deviceModel');

/**
 * Lấy tất cả lịch tưới theo Device ID
 */
const getSchedules = async (req, res) => {
  try {
    const { deviceId } = req.params;
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const schedules = await scheduleModel.getSchedulesByDeviceId(deviceId);
    
    // Format schedules để frontend dễ sử dụng
    // schedule_Duration được lưu bằng giây, cần convert sang phút
    const formattedSchedules = schedules.map(schedule => {
      // schedule_Duration is stored in seconds, convert to minutes
      const durationInSeconds = schedule.schedule_Duration;
      const durationInMinutes = Math.floor(durationInSeconds / 60);
      
      console.log(`[SCHEDULE] Schedule ID ${schedule.schedule_ID}: duration=${durationInSeconds}s (${durationInMinutes} minutes)`);
      
      return {
        id: schedule.schedule_ID,
        time: schedule.schedule_Time,
        days: schedule.schedule_Days,
        pump: schedule.schedule_Pump,
        duration: `${durationInMinutes} phút`, // Convert seconds to minutes
        status: schedule.schedule_Status === 1 ? 'active' : 'paused'
      };
    });

    res.json(formattedSchedules);
  } catch (error) {
    console.error('Error getting schedules:', error);
    res.status(500).json({ error: 'Failed to get schedules' });
  }
};

/**
 * Tạo lịch tưới mới
 */
const createSchedule = async (req, res) => {
  try {
    console.log('[SCHEDULE] Create schedule request body:', req.body);
    const { deviceId, pump, days, hour, minute, ampm, duration } = req.body;

    // Validate required fields với logging chi tiết
    const missingFields = [];
    if (!deviceId) missingFields.push('deviceId');
    if (!pump) missingFields.push('pump');
    if (!days || (Array.isArray(days) && days.length === 0)) missingFields.push('days');
    if (hour === undefined || hour === null) missingFields.push('hour');
    if (minute === undefined || minute === null) missingFields.push('minute');
    if (!ampm) missingFields.push('ampm');
    if (!duration || duration === 0) missingFields.push('duration');

    if (missingFields.length > 0) {
      console.error('[SCHEDULE] Missing required fields:', missingFields);
      return res.status(400).json({ 
        error: 'Missing required fields',
        missingFields: missingFields,
        received: {
          deviceId: !!deviceId,
          pump: !!pump,
          days: days,
          hour: hour,
          minute: minute,
          ampm: ampm,
          duration: duration
        }
      });
    }

    // Kiểm tra device có tồn tại không
    const device = await deviceModel.getDeviceById(deviceId);
    if (!device) {
      console.error('[SCHEDULE] Device not found:', deviceId);
      return res.status(400).json({ 
        error: 'Thiết bị không tồn tại. Vui lòng chọn thiết bị hợp lệ.',
        errorCode: 'DEVICE_NOT_FOUND',
        deviceId: deviceId,
        suggestion: 'Vui lòng vào phần Cài đặt để kiểm tra thiết bị.'
      });
    }
    console.log('[SCHEDULE] Using deviceId:', deviceId);

    // Convert AM/PM to 24h format
    let hour24 = parseInt(hour);
    if (ampm === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (ampm === 'AM' && hour24 === 12) {
      hour24 = 0;
    }

    // Format time string
    const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;
    
    // Format days
    const daysArray = Array.isArray(days) ? days : days.split(',').map(d => d.trim());
    const daysString = daysArray.length === 7 ? 'Hàng ngày' : daysArray.join(', ');

    const scheduleData = {
      deviceId: parseInt(deviceId),
      pump,
      days: daysString,
      time: timeString,
      hour24,
      minute: parseInt(minute),
      duration: parseInt(duration) * 60, // Convert minutes to seconds
      status: 1
    };

    console.log('[SCHEDULE] Creating schedule with data:', scheduleData);

    const newSchedule = await scheduleModel.createSchedule(scheduleData);
    console.log('[SCHEDULE] Schedule created successfully:', newSchedule);

    res.status(201).json({
      id: newSchedule.id,
      time: timeString,
      days: daysString,
      pump,
      duration: `${duration} phút`,
      status: 'active'
    });
  } catch (error) {
    console.error('[SCHEDULE] Error creating schedule:', error);
    console.error('[SCHEDULE] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create schedule',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Cập nhật lịch tưới
 */
const updateSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { pump, days, hour, minute, ampm, duration, status } = req.body;

    const schedule = await scheduleModel.getScheduleById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Convert AM/PM to 24h format if provided
    let hour24 = schedule.schedule_Hour24;
    if (hour !== undefined && minute !== undefined && ampm) {
      hour24 = parseInt(hour);
      if (ampm === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (ampm === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
    }

    const timeString = hour !== undefined && minute !== undefined && ampm
      ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`
      : schedule.schedule_Time;

    const daysArray = days ? (Array.isArray(days) ? days : days.split(',').map(d => d.trim())) : null;
    const daysString = daysArray && daysArray.length === 7 ? 'Hàng ngày' : (daysArray ? daysArray.join(', ') : schedule.schedule_Days);

    const scheduleData = {
      pump: pump || schedule.schedule_Pump,
      days: daysString,
      time: timeString,
      hour24,
      minute: minute !== undefined ? parseInt(minute) : schedule.schedule_Minute,
      duration: duration !== undefined ? parseInt(duration) * 60 : schedule.schedule_Duration,
      status: status !== undefined ? (status === 'active' ? 1 : 0) : schedule.schedule_Status
    };

    await scheduleModel.updateSchedule(scheduleId, scheduleData);

    res.json({
      id: parseInt(scheduleId),
      time: timeString,
      days: daysString,
      pump: scheduleData.pump,
      duration: `${Math.floor(scheduleData.duration / 60)} phút`,
      status: scheduleData.status === 1 ? 'active' : 'paused'
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
};

/**
 * Xóa lịch tưới
 */
const deleteSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    await scheduleModel.deleteSchedule(scheduleId);
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
};

/**
 * Toggle status của lịch (Active/Paused)
 */
const toggleScheduleStatus = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    await scheduleModel.toggleScheduleStatus(scheduleId);
    
    const schedule = await scheduleModel.getScheduleById(scheduleId);
    res.json({
      id: schedule.schedule_ID,
      status: schedule.schedule_Status === 1 ? 'active' : 'paused'
    });
  } catch (error) {
    console.error('Error toggling schedule status:', error);
    res.status(500).json({ error: 'Failed to toggle schedule status' });
  }
};

module.exports = {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleScheduleStatus
};

