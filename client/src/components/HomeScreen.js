import React, { useState, useEffect } from "react";
import Chart from "./Chart";
import axios from "axios";
import { FaThermometerHalf, FaWater, FaSeedling } from "react-icons/fa";

function HomeScreen({ message }) {
  const [thresholds, setThresholds] = useState({ nhietdo: 30, doamoxi: 50, doam: 30 });
  const gardenId = localStorage.getItem("gardenId");

  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const response = await axios.get(`/api/v1/condition/${gardenId}`);
        const condition = response.data[0];
        setThresholds({
          nhietdo: condition.condition_Temp,
          doamoxi: condition.condition_Humid,
          doam: condition.condition_Amdat,
        });
      } catch (error) {
        console.error(error);
      }
    };
    fetchThresholds();
  }, [gardenId]);

  const cards = [
    {
      title: "Nhiệt độ",
      icon: <FaThermometerHalf size={32} className="text-purple-600" />,
      value: `${message.air_temperature ?? "?"} °C (<${thresholds.nhietdo} °C)`,
    },
    {
      title: "Độ ẩm không khí",
      icon: <FaWater size={32} className="text-purple-600" />,
      value: `${message.air_humid ?? "?"} % (>${thresholds.doamoxi} %)`,
    },
    {
      title: "Độ ẩm đất",
      icon: <FaSeedling size={32} className="text-purple-600" />,
      value: `${message.soil_moisture ?? "60.2"} % (>${thresholds.doam} %)`,
    },
  ];

  return (
    <div className="w-full min-h-[calc(100vh-120px)] flex justify-center">
      <div className="w-full max-w-7xl px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Chào mừng đến với hệ thống nông nghiệp thông minh
          </h1>
          <div className="flex items-center gap-4">
            <img src="/img/user.jpg" alt="User" className="w-12 h-12 rounded-full border-2 border-purple-400" />
            <div className="text-right">
              <p className="font-semibold text-gray-800">User</p>
              <p className="text-green-500 text-xs">Online</p>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {cards.map((item, idx) => (
            <div key={idx} className="bg-white border border-purple-300 rounded-2xl shadow-md p-8 flex flex-col items-center text-center hover:shadow-lg transition">
              <div className="mb-4">{item.icon}</div>
              <h2 className="text-lg font-semibold text-gray-700">{item.title}</h2>
              <p className="text-2xl font-bold text-purple-600 mt-2">{item.value}</p>
              <span className="text-xs text-gray-400 mt-3">Cập nhật mỗi 40s</span>
            </div>
          ))}
        </div>

        {/* Chart (không cần bọc card nữa) */}
        <Chart />
      </div>
    </div>
  );
}

export default HomeScreen;
