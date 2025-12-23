import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faMinus } from '@fortawesome/free-solid-svg-icons'
import axios from 'axios'
import Button from './Button'

const ThresholdSetting = ({ title, value, setValue }) => {
    return (
        <div className='bg-white border-2 border-purple-300 shadow rounded-xl p-4 mb-6 hover:border-purple-500 transition-all'>
            <h2 className='font-semibold text-lg text-purple-700 mb-2'>{title}</h2>
            <div className='flex items-center space-x-4'>
                <span className='text-gray-800'>Giá trị: <strong>{value}</strong></span>
                <button onClick={() => setValue(Math.max(0, value - 1))}
                    className='p-2 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200'>
                    <FontAwesomeIcon icon={faMinus} />
                </button>
                <button onClick={() => setValue(Math.min(100, value + 1))}
                    className='p-2 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200'>
                    <FontAwesomeIcon icon={faPlus} />
                </button>
            </div>
        </div>
    )
}

const parseNumericString = (str) => {
    const num = parseFloat(str)
    return isNaN(num) ? 0 : num
}

const PumpSetting = () => {
    const location = useLocation().state.location
    const gardenId = parseInt(localStorage.getItem('gardenId'))
    const [nhietdo, setNhietdo] = useState(null)
    const [doam, setDoam] = useState(null)
    const [doamoxi, setDoamoxi] = useState(null)

    useEffect(() => {
        if (nhietdo === null || doam === null || doamoxi === null) {
            axios.get(`/api/v1/condition/${gardenId}`)
                .then(res => {
                    const d = res.data[0]
                    setNhietdo(parseNumericString(d.condition_Temp))
                    setDoam(parseNumericString(d.condition_Amdat))
                    setDoamoxi(parseNumericString(d.condition_Humid))
                }).catch(console.log)
        }
    }, [nhietdo, doam, doamoxi, gardenId])

    const handleUpdate = () => {
        axios.put(`/api/v1/condition/${gardenId}`, {
            condition_Temp: nhietdo.toString(),
            condition_Amdat: doam.toString(),
            condition_Humid: doamoxi.toString()
        })
            .then(() => alert('✅ Cập nhật thành công'))
            .catch(error => console.error('Update error: ', error))
    }

    const handleReset = () => {
        setNhietdo(0)
        setDoam(0)
        setDoamoxi(0)
        handleUpdate()
        alert(`Đã reset thông tin cây ở khu vực ${location.title}`)
    }

    return (
        <div className='w-full max-w-6xl mx-auto mt-10 p-6 rounded-xl border-2 border-purple-300 shadow-lg bg-white'>
            <h1 className='text-4xl font-bold text-center text-purple-700 mb-6'>{location.title}</h1>
            <div className='flex flex-col md:flex-row gap-8'>
                <div className='md:w-1/2'>
                    <img
                        className='w-full h-auto rounded-xl border-2 border-purple-200 shadow-md'
                        src={location.link}
                        alt={location.title}
                    />
                </div>
                <div className='md:w-1/2'>
                    <ThresholdSetting title="🌡 Nhiệt độ" value={nhietdo} setValue={setNhietdo} />
                    <ThresholdSetting title="💧 Độ ẩm đất" value={doam} setValue={setDoam} />
                    <ThresholdSetting title="🌫 Độ ẩm không khí" value={doamoxi} setValue={setDoamoxi} />
                    <div className='flex space-x-4 justify-center mt-4'>
                        <Button onClick={handleReset} text="Reset" color="gray" />
                        <Button onClick={handleUpdate} text="Update" color="purple" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PumpSetting
