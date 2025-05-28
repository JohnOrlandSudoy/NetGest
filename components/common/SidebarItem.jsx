import React from 'react';
import Link from "next/link";
import Icon from "./Icon";

const SidebarItem = ({ route, isActive, onClick }) => {
    return (
        <Link
            href={route.path}
            onClick={onClick}
            className={`
                ${isActive 
                    ? "bg-sky-800 text-white" 
                    : "text-white hover:bg-sky-800 hover:bg-opacity-70"}
                group flex items-center px-3 py-3 text-base font-medium rounded-md transition-all duration-200
                relative overflow-hidden
            `}
            title={route.name}
        >
            <div className="flex items-center w-full min-w-0">
                <div className="flex-shrink-0 h-6 w-6 mr-3">
                    <Icon name={route.icon} />
                </div>
                <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis">
                    {route.name}
                </span>
            </div>
            
            {/* Active indicator */}
            {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r"></div>
            )}
        </Link>
    );
};

export default SidebarItem;