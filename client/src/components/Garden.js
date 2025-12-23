import React, { useState, useEffect, useRef } from "react";
import { Tab } from '@headlessui/react';
import AnimatedTabPanel from "./AnimatedTabPanel";
import axios from "axios";
import GardenOverview from "./GardenOverview";
import GardenEdit from './GardenEdit';

const Garden = React.memo(function () {
    const [garden, setGarden] = useState(null);
    const userId = parseInt(localStorage.getItem('userId'));

    const gardenDetails = [
        { label: 'Location', value: 'garden_Location' },
        { label: 'Status', value: 'garden_Status' },
        { label: 'Name', value: 'garden_Name' },
        { label: 'Description', value: 'garden_Description' },
        { label: 'Area', value: 'garden_Area' },
        { label: 'Image', value: 'garden_Image' },
    ];

    const initialRender = useRef(true);
    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
        } else {
            if (!isNaN(userId) && garden === null) {
                axios.get(`/api/v1/gardens/${userId}`)
                    .then(response => setGarden(response.data))
                    .catch(console.log);
            }
        }
    }, [userId, garden]);

    return (
        <div className="w-full flex justify-center px-4 py-8">
            <div className="w-full max-w-5xl">
                <Tab.Group>
                    <Tab.List className="flex space-x-10 border-b border-gray-300 mb-10">
                        {['Overview', 'Edit Garden'].map((tab, index) => (
                            <Tab key={index} className={({ selected }) =>
                                `relative pb-2 text-lg font-semibold transition duration-300 
                                ${selected ? "text-purple-600" : "text-gray-500 hover:text-purple-600"}`
                            }>
                                {({ selected }) => (
                                    <>
                                        {tab}
                                        <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 transition-transform duration-300 
                                            ${selected ? "scale-x-100" : "scale-x-0"} origin-left`}></span>
                                    </>
                                )}
                            </Tab>
                        ))}
                    </Tab.List>

                    <Tab.Panels>
                        <AnimatedTabPanel keyName="overview">
                            <GardenOverview gardenDetails={gardenDetails} garden={garden} />
                        </AnimatedTabPanel>
                        <AnimatedTabPanel keyName="edit">
                            <GardenEdit gardenDetails={gardenDetails} garden={garden} setGarden={setGarden} />
                        </AnimatedTabPanel>
                    </Tab.Panels>
                </Tab.Group>
            </div>
        </div>
    );
});

export default Garden;
