import React, { useEffect, useState } from "react";
import axios from "axios";
import moment from "moment";

const DataDisplay = ({ gardenId }) => {
  const limit = 20;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    soilMoistureData: [],
    dht20Data: [],
    waterPumpData: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      // Sử dụng gardenId từ props, fallback sang 1 nếu không có
      const currentGardenId = gardenId || localStorage.getItem('gardenId') || '1';
      
      if (!currentGardenId) {
        setError("Chưa chọn vườn");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
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
        
        let soilRes, dhtRes, pumpRes;
        
        // Lấy data với deviceId
        [soilRes, dhtRes, pumpRes] = await Promise.all([
          axios.get(`/api/v1/soil-moisture/${deviceId}?limit=${limit}`),
          axios.get(`/api/v1/dht20/${deviceId}?limit=${limit}`),
          axios.get(`/api/v1/water-pump/${deviceId}?limit=${limit}`)
        ]);

        const soilMoistureData = Array.isArray(soilRes.data) ? soilRes.data : [];
        const dht20Data = Array.isArray(dhtRes.data) ? dhtRes.data : [];
        const waterPumpData = Array.isArray(pumpRes.data) ? pumpRes.data : [];

        const formattedSoilMoistureData = soilMoistureData.map(item => ({
          ...item,
          soil_moisture_Time: moment(item.soil_moisture_Time).format("YYYY-MM-DD HH:mm:ss"),
        }));

        const formattedDht20Data = dht20Data.map(item => ({
          ...item,
          dht_Time: moment(item.dht_Time).format("YYYY-MM-DD HH:mm:ss"),
        }));

        const formattedWaterPumpData = waterPumpData.map(item => ({
          ...item,
          water_pump_Time: moment(item.water_pump_Time).format("YYYY-MM-DD HH:mm:ss"),
        }));

        setData({
          soilMoistureData: formattedSoilMoistureData,
          dht20Data: formattedDht20Data,
          waterPumpData: formattedWaterPumpData,
        });

        console.log("✅ Loaded sensor data:", { formattedSoilMoistureData, formattedDht20Data, formattedWaterPumpData });
      } catch (err) {
        console.error("❌ Fetch error:", err);
        setError("Không thể tải dữ liệu. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [gardenId]);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[300px]">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600"></div>
    </div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-[300px]">
      <div className="text-center">
        <p className="text-red-500 mb-2">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Thử lại
        </button>
      </div>
    </div>;
  }

  const renderTable = (columns, records, rowKey) => {
    const safeRecords = Array.isArray(records) ? records : [];
    
    return (
      <div className="overflow-x-auto max-h-[400px]">
        <table className="min-w-full text-sm text-left text-gray-600">
          <thead className="sticky top-0 bg-purple-100 text-purple-700 font-semibold">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3">{col.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {safeRecords.length > 0 ? (
              safeRecords.map((record, idx) => (
                <tr key={record[rowKey] ?? idx} className="border-b hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-2">{record[col.dataIndex]}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr><td className="px-4 py-4 text-center text-gray-500" colSpan={columns.length}>Không có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="bg-white border border-purple-300 rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold text-purple-700 mb-4">Soil Moisture</h2>
        {renderTable([
          { title: "Time", dataIndex: "soil_moisture_Time", key: "time" },
          { title: "Value", dataIndex: "soil_moisture_Value", key: "value" }
        ], data.soilMoistureData, "soil_moisture_Time")}
      </div>

      <div className="bg-white border border-purple-300 rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold text-purple-700 mb-4">DHT20 (Temp & Humid)</h2>
        {renderTable([
          { title: "Time", dataIndex: "dht_Time", key: "time" },
          { title: "Temp", dataIndex: "dht_Temp", key: "temp" },
          { title: "Humidity", dataIndex: "dht_Humid", key: "humid" }
        ], data.dht20Data, "dht_Time")}
      </div>

      <div className="bg-white border border-purple-300 rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold text-purple-700 mb-4">Water Pump</h2>
        {renderTable([
          { title: "Time", dataIndex: "water_pump_Time", key: "time" }
        ], data.waterPumpData, "water_pump_Time")}
      </div>
    </div>
  );
};

export default DataDisplay;
