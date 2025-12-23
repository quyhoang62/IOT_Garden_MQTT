import React from "react";
import { Tab } from "@headlessui/react";

export default function CustomTabHeader({ children }) {
  return (
    <Tab
      className={({ selected }) =>
        `px-5 py-2 text-sm font-medium rounded-md border ${
          selected
            ? "border-purple-500 text-purple-600 bg-purple-50"
            : "border-gray-300 text-gray-500 hover:text-purple-600 hover:border-purple-400"
        } transition`
      }
    >
      {children}
    </Tab>
  );
}
