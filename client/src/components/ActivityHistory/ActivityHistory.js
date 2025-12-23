import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { HiOutlineFilter, HiOutlineDownload, HiOutlineCalendar } from 'react-icons/hi';

function ActivityHistory({ gardenId }) {
  const [activeTab, setActiveTab] = useState('all');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');

  const tabs = [
    { id: 'all', name: 'Tất cả' },
    { id: 'irrigation', name: 'Tưới nước' },
    { id: 'sensor', name: 'Dữ liệu cảm biến' },
    { id: 'alert', name: 'Cảnh báo' },
  ];

  useEffect(() => {
    const fetchActivities = async () => {
      // Sử dụng gardenId từ props, fallback sang 1 nếu không có
      const currentGardenId = gardenId || localStorage.getItem('gardenId') || '1';
      
      setLoading(true);
      try {
        // Lấy deviceId từ gardenId
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
          try {
            const devicesRes = await axios.get(`/api/v1/devices/garden/${currentGardenId}`);
            if (devicesRes.data && devicesRes.data.length > 0) {
              deviceId = devicesRes.data[0].device_ID;
              localStorage.setItem('deviceId', deviceId);
            } else {
              deviceId = '1'; // Fallback
            }
          } catch (err) {
            console.error('Error fetching devices:', err);
            deviceId = '1'; // Fallback
          }
        }
        
        // Fetch water pump history với deviceId
        let pumpRes = await axios.get(`/api/v1/water-pump/${deviceId}?limit=50`);
        let dhtRes = await axios.get(`/api/v1/dht20/${deviceId}?limit=50`);
        let soilRes = await axios.get(`/api/v1/soil-moisture/${deviceId}?limit=50`);

        // Transform pump data
        const pumpActivities = pumpRes.data.map(item => ({
          id: `pump-${item.water_pump_Time}`,
          time: formatDateTime(item.water_pump_Time),
          type: 'irrigation',
          activity: item.water_pump_Value === 1 ? 'Tưới nước tự động' : 'Tắt máy bơm',
          details: `Thời lượng: 5 phút, Chế độ: Hẹn giờ`,
          status: 'completed'
        }));

        // Transform DHT data (select some as sensor readings)
        const sensorActivities = dhtRes.data.slice(0, 10).map(item => ({
          id: `dht-${item.dht_Time}`,
          time: formatDateTime(item.dht_Time),
          type: 'sensor',
          activity: 'Ghi nhận cảm biến',
          details: `Nhiệt độ: ${item.dht_Temp}°C, Độ ẩm không khí: ${item.dht_Humid}%`,
          status: 'logged'
        }));

        // Create some alert activities based on thresholds
        const alertActivities = soilRes.data
          .filter(item => item.soil_moisture_Value < 30)
          .slice(0, 5)
          .map(item => ({
            id: `alert-${item.soil_moisture_Time}`,
            time: formatDateTime(item.soil_moisture_Time),
            type: 'alert',
            activity: 'Cảnh báo độ ẩm thấp',
            details: `Độ ẩm đất dưới ngưỡng: ${item.soil_moisture_Value}%`,
            status: 'viewed'
          }));

        // Combine and sort by time
        const allActivities = [...pumpActivities, ...sensorActivities, ...alertActivities]
          .sort((a, b) => new Date(b.time) - new Date(a.time));

        setActivities(allActivities);
      } catch (error) {
        console.error('Error fetching activities:', error);
        // Set mock data if API fails
        setActivities([
          {
            id: 1,
            time: '14:30 - 25/10/2023',
            type: 'irrigation',
            activity: 'Tưới nước tự động',
            details: 'Thời lượng: 5 phút, Chế độ: Hẹn giờ',
            status: 'completed'
          },
          {
            id: 2,
            time: '14:00 - 25/10/2023',
            type: 'sensor',
            activity: 'Ghi nhận cảm biến',
            details: 'Nhiệt độ: 28°C, Độ ẩm đất: 65%, Độ ẩm không khí: 70%',
            status: 'logged'
          },
          {
            id: 3,
            time: '12:15 - 25/10/2023',
            type: 'alert',
            activity: 'Cảnh báo độ ẩm thấp',
            details: 'Độ ẩm đất dưới ngưỡng 40%',
            status: 'viewed'
          },
          {
            id: 4,
            time: '08:00 - 25/10/2023',
            type: 'irrigation',
            activity: 'Tưới nước thủ công',
            details: 'Thời lượng: 2 phút, Chế độ: Thủ công',
            status: 'completed'
          },
          {
            id: 5,
            time: '07:00 - 25/10/2023',
            type: 'sensor',
            activity: 'Ghi nhận cảm biến',
            details: 'Nhiệt độ: 25°C, Độ ẩm đất: 75%, Độ ẩm không khí: 80%',
            status: 'logged'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [gardenId]);

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(',', ' -');
  };

  const filteredActivities = activities.filter(activity => {
    if (activeTab === 'all') return true;
    return activity.type === activeTab;
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-600';
      case 'logged':
        return 'bg-gray-100 text-gray-600';
      case 'viewed':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Hoàn thành';
      case 'logged':
        return 'Đã ghi nhận';
      case 'viewed':
        return 'Đã xem';
      default:
        return status;
    }
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Thời gian', 'Hoạt động', 'Chi tiết', 'Trạng thái'];
    const rows = filteredActivities.map(a => [
      a.time,
      a.activity,
      a.details,
      getStatusText(a.status)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lich-su-hoat-dong-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Lịch sử hoạt động</h1>
        <p className="text-gray-500">Xem lại nhật ký chi tiết về các hoạt động tưới nước và dữ liệu cảm biến.</p>
      </div>

      {/* Tabs and Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-green-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
              <HiOutlineFilter className="w-5 h-5" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
              <HiOutlineCalendar className="w-5 h-5" />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-all"
            >
              <HiOutlineDownload className="w-5 h-5" />
              <span>Xuất báo cáo</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 bg-gray-50">
                  <th className="px-6 py-4 font-medium">Thời gian</th>
                  <th className="px-6 py-4 font-medium">Hoạt động</th>
                  <th className="px-6 py-4 font-medium">Chi tiết</th>
                  <th className="px-6 py-4 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map(activity => (
                  <tr key={activity.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-600">{activity.time}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{activity.activity}</td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className={activity.type === 'alert' ? 'text-red-500' : ''}>
                        {activity.details}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(activity.status)}`}>
                        {getStatusText(activity.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && filteredActivities.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>Không có hoạt động nào trong danh mục này</p>
            </div>
          )}
        </div>

        {/* Pagination (optional) */}
        {filteredActivities.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Hiển thị {filteredActivities.length} hoạt động
            </span>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-gray-500 hover:bg-gray-100 rounded-lg text-sm">
                Trước
              </button>
              <button className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm">
                1
              </button>
              <button className="px-3 py-1 text-gray-500 hover:bg-gray-100 rounded-lg text-sm">
                2
              </button>
              <button className="px-3 py-1 text-gray-500 hover:bg-gray-100 rounded-lg text-sm">
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityHistory;


