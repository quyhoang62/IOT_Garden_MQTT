import React from "react";
import { Tab } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';

// Animation configuration (gọn gàng, tái sử dụng dễ)
const slideInTransition = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
};

export default function AnimatedTabPanel({ children, keyName }) {
    return (
        <Tab.Panel className="p-0">
            <AnimatePresence mode="wait">
                <motion.div
                    key={keyName}
                    variants={slideInTransition}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeOut" }}
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        </Tab.Panel>
    );
}
