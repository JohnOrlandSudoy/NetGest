"use client";

import React, { useState, useEffect } from 'react';
import { FaNetworkWired, FaExclamationTriangle, FaClock, FaTachometerAlt, FaSync } from 'react-icons/fa';

const DailySummaryCards = ({ 
    packetLoss = 0, 
    latency = 0, 
    downloadSpeed = 0,
    uploadSpeed = 0,
    isLoading = false,
    isRealtime = false
}) => {
    const [forceLoaded, setForceLoaded] = useState(false);
    
    useEffect(() => {
        // Force data to display after 3 seconds even if loading is still true
        const timer = setTimeout(() => {
            setForceLoaded(true);
        }, 3000);
        
        return () => clearTimeout(timer);
    }, []);
    
    // Show loading state only if we're loading AND we haven't force loaded yet
    const showLoading = isLoading && !forceLoaded;
    
    // Define the metrics cards data
    const metrics = [
        {
            title: "Packet Loss",
            value: packetLoss,
            unit: "%",
            icon: <FaExclamationTriangle className="h-8 w-8 text-red-500" />,
            color: "bg-red-50 border-red-200",
            textColor: "text-red-700"
        },
        {
            title: "Latency",
            value: latency,
            unit: "ms",
            icon: <FaClock className="h-8 w-8 text-amber-500" />,
            color: "bg-amber-50 border-amber-200",
            textColor: "text-amber-700"
        },
        {
            title: "Download Speed",
            value: downloadSpeed,
            unit: "Mbps",
            icon: <FaTachometerAlt className="h-8 w-8 text-green-500" />,
            color: "bg-green-50 border-green-200",
            textColor: "text-green-700"
        },
        {
            title: "Upload Speed",
            value: uploadSpeed,
            unit: "Mbps",
            icon: <FaTachometerAlt className="h-8 w-8 text-blue-500" />,
            color: "bg-blue-50 border-blue-200",
            textColor: "text-blue-700"
        }
    ];

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric, index) => (
                    <div 
                        key={index} 
                        className={`rounded-lg border ${metric.color} p-4 shadow-sm transition-all hover:shadow-md ${isRealtime ? 'border-l-4' : ''}`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center">
                                    <p className="text-sm font-medium text-gray-500">{metric.title}</p>
                                    {isRealtime && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            <FaSync className="mr-1 h-2 w-2 animate-spin" />
                                            Live
                                        </span>
                                    )}
                                </div>
                                <div className="mt-1">
                                    {showLoading ? (
                                        <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
                                    ) : (
                                        <p className={`text-2xl font-semibold ${metric.textColor}`}>
                                            {typeof metric.value === 'number' ? metric.value.toLocaleString(undefined, {maximumFractionDigits: 2}) : metric.value}
                                            <span className="text-sm ml-1">{metric.unit}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="p-2 rounded-full bg-white shadow-sm">
                                {metric.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DailySummaryCards;




