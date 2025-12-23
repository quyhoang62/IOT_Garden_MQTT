import React, { useState, useEffect, useRef } from 'react';
import { Tab } from '@headlessui/react';
import ProfileDetails from './ProfileDetails';
import axios from 'axios';
import ProfileOverview from './ProfileOverview';
import ProfileSiteSetting from './ProfileSiteSetting';
import AnimatedTabPanel from './AnimatedTabPanel';

const Profile = React.memo(function () {
    const [user, setUser] = useState(null);
    const userId = parseInt(localStorage.getItem('userId'));

    const userDetails = [
        { label: 'Name', value: 'user_Name' },
        { label: 'Username', value: 'user_Username' },
        { label: 'Role', value: 'user_Role' },
        { label: 'Address', value: 'user_Address' },
        { label: 'Email', value: 'user_Email' },
        { label: 'Phone', value: 'user_Phone' },
    ];

    const initialRender = useRef(true);
    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
        } else {
            if (!isNaN(userId) && user === null) {
                axios.get(`/api/v1/users/${userId}`)
                    .then(response => setUser(response.data))
                    .catch(console.log);
            }
        }
    }, [userId, user]);

    return (
        <div className="w-full flex justify-center px-4 py-8">
            <div className="w-full max-w-5xl">
                <Tab.Group>
                    <Tab.List className="flex space-x-10 border-b border-gray-300 mb-10">
                        {['Overview', 'Details', 'Site Settings'].map((tab, index) => (
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
                            <ProfileOverview userDetails={userDetails} user={user} />
                        </AnimatedTabPanel>
                        <AnimatedTabPanel keyName="details">
                            <ProfileDetails userDetails={userDetails} user={user} setUser={setUser} />
                        </AnimatedTabPanel>
                        <AnimatedTabPanel keyName="settings">
                            <ProfileSiteSetting user={user} />
                        </AnimatedTabPanel>
                    </Tab.Panels>
                </Tab.Group>
            </div>
        </div>
    );
});

export default Profile;
