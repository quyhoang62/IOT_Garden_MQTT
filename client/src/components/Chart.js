import React, { useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const Chart = () => {
  const [data] = useState({
    temperature: [28, 29, 30, 29, 29.5, 29],
    humidity: [50, 55, 56, 59, 60, 61],
    soilHumidity: [60, 61, 63, 65, 61, 67],
  });

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const chartConfigs = [
    { title: "NHIỆT ĐỘ", dataKey: "temperature", color: "rgba(255, 99, 132, 1)" },
    { title: "ĐỘ ẨM", dataKey: "humidity", color: "rgba(54, 162, 235, 1)" },
    { title: "ĐỘ ẨM ĐẤT", dataKey: "soilHumidity", color: "rgba(75, 192, 192, 1)" },
  ];

  const renderChart = ({ title, dataKey, color }, index) => {
    const chartData = {
      labels: labels,
      datasets: [
        {
          label: title,
          data: data[dataKey],
          borderColor: color,
          backgroundColor: color,
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    };

    return (
      <div key={index} className="bg-white border border-purple-300 rounded-2xl shadow-md p-6 h-[350px] flex flex-col">
        <h3 className="text-center text-lg font-bold text-gray-700 mb-4">{title}</h3>
        <div className="flex-grow">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {chartConfigs.map((cfg, idx) => renderChart(cfg, idx))}
    </div>
  );
};

export default Chart;
