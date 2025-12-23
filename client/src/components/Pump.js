import React from 'react'
import { useLocation } from 'react-router-dom'
import moment from 'moment'
import axios from 'axios'

const Pump = () => {
    const location = useLocation().state.location
    const pumpD = JSON.parse(localStorage.getItem('datePump')) || []

    const handlePump = async (e) => {
        e.preventDefault()
        const timestamp = `Ngày tưới cây cuối cùng ${moment().format('HH')} Giờ ${moment().format('mm')} phút ngày ${moment().format('DD')} tháng ${moment().format('MM')} năm ${moment().format('YYYY')}`;
        const newLog = { type: location.name, date: timestamp }
        localStorage.setItem('datePump', JSON.stringify([newLog, ...pumpD]))

        try {
            await axios.post('/startPump', { pump: location.name })
        } catch (err) {
            console.error("Pump error", err)
        }

        window.location.reload()
    }

    return (
  <div className="w-full max-w-5xl mx-auto mt-10 p-8 rounded-2xl shadow-xl border-2 border-purple-300 bg-white space-y-8">
    <h1 className="text-4xl font-bold text-center text-purple-700">{location.name}</h1>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Thông tin */}
      <div className="space-y-4 text-lg text-gray-700">
        <div className="flex justify-between border-b pb-2">
          <span>Nhiệt độ:</span>
          <span className="text-purple-700 font-semibold">{location.temperature} °C</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span>Độ ẩm đất:</span>
          <span className="text-purple-700 font-semibold">{location.humidity} %</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span>Độ ẩm không khí:</span>
          <span className="text-purple-700 font-semibold">{location.humidityOxi} %</span>
        </div>
        <div className="flex justify-between">
          <span>Thời gian tưới:</span>
          <span className="bg-purple-100 px-3 py-1 rounded text-purple-700">{location.timePump}</span>
        </div>

        <button
          onClick={handlePump}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-lg transition"
        >
          Tưới cây
        </button>
      </div>

      {/* Lịch sử tưới */}
      <div>
        <h4 className="text-xl font-semibold text-purple-800 mb-4">Lịch sử tưới gần đây</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          {pumpD.filter(item => item.type === location.name).slice(0, 5).map((item, idx) => (
            <li key={idx}>{item.date}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>
)

}

export default Pump;
