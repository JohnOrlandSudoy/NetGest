'use client';

import React, { useContext, useEffect, useState } from "react";
import { NetworkMetricsContext } from "@/context/NetworkMetricsProvider";
import NetworkDashboard from "./network-dashboard";
import DailySummaryCards from "./metric-card";
import ErrorBoundary from '@/components/common/ErrorBoundary';
import InterfaceSelector from '@/components/network/InterfaceSelector';
import Authenticated from "@/components/layouts/Authenticated";
import RealtimeInterfaceMonitor from '@/components/dashboard/RealtimeInterfaceMonitor';

// Define the HomePage component
const HomePage = () => {
    // Get network metrics context
    const {
        packetLossHistory,
        latencyHistory,
        speedHistory,
        loadingHistory,
        avgPacketLoss,
        avgLatency,
        internetSpeed,
        uploadSpeed,
        selectedInterface,
        setSelectedInterface,
        interfaces = [], // Provide default empty array
        fetchInterfaces,
        refreshMetrics,
        loading
    } = useContext(NetworkMetricsContext) || {}; // Provide default empty object

    const [isClient, setIsClient] = useState(false);
    // Add offline detection and waiting state
    const [isOffline, setIsOffline] = useState(false);
    const [waitingForConnection, setWaitingForConnection] = useState(false);
    const [dashboardLoaded, setDashboardLoaded] = useState(false);

    // Set isClient to true when component mounts (client-side only)
    useEffect(() => {
        setIsClient(true);
        
        // Check online status
        setIsOffline(!navigator.onLine);
        
        // Add event listeners for online/offline status
        const handleOnline = () => {
            setIsOffline(false);
            if (waitingForConnection) {
                refreshMetrics();
                setWaitingForConnection(false);
            }
        };
        
        const handleOffline = () => {
            setIsOffline(true);
            setWaitingForConnection(true);
        };
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Force dashboard to load after a timeout if it's taking too long
        const timer = setTimeout(() => {
            setDashboardLoaded(true);
        }, 3000);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearTimeout(timer);
        };
    }, [refreshMetrics, waitingForConnection]);

    // Fetch interfaces when component mounts
    useEffect(() => {
        if (isClient && fetchInterfaces) {
            fetchInterfaces();
        }
        
        // Force dashboard to load after interfaces are fetched or after timeout
        const timer = setTimeout(() => {
            setDashboardLoaded(true);
        }, 3000);
        
        return () => {
            clearTimeout(timer);
        };
    }, [isClient, fetchInterfaces]);

    // Handle interface change
    const handleInterfaceChange = (interfaceName) => {
        if (setSelectedInterface) {
            // Ensure interfaceName is a string
            const safeInterfaceName = typeof interfaceName === 'string' 
                ? interfaceName 
                : interfaceName && interfaceName.name 
                    ? interfaceName.name 
                    : String(interfaceName || '');
            
            setSelectedInterface(safeInterfaceName);
            // Reset dashboard loaded state when interface changes
            setDashboardLoaded(false);
            // Force dashboard to load after a timeout
            setTimeout(() => {
                setDashboardLoaded(true);
            }, 2000);
        }
    };

    // If not client-side yet, return null
    if (!isClient) {
        return null;
    }

    return (
        <Authenticated title="Dashboard">
            <div className="w-full">
                {/* Interface Selection */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-3 text-gray-800">Select Network Interface</h2>
                    <ErrorBoundary
                        fallbackTitle="Interface Selection Limited"
                        fallbackMessage="Some interface features are limited while offline."
                    >
                        <InterfaceSelector 
                            interfaces={interfaces || []} // Ensure interfaces is always an array
                            selectedInterface={selectedInterface || ''} // Ensure selectedInterface is always a string
                            onSelectInterface={handleInterfaceChange}
                            isLoading={!interfaces || interfaces.length === 0} // Safe check for interfaces
                        />
                    </ErrorBoundary>
                </div>

                {/* Offline Warning */}
                {isOffline && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                        <div className="flex flex-col items-center justify-center">
                            <svg className="h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <h2 className="text-xl font-semibold text-red-800 mb-2">You are currently offline</h2>
                            <p className="text-red-700 text-center mb-4">Waiting for network connection to be restored...</p>
                        </div>
                    </div>
                )}

                {/* Daily Summary Cards */}
                {!isOffline && selectedInterface && (
                    <DailySummaryCards 
                        packetLoss={avgPacketLoss || 0}
                        latency={avgLatency || 0}
                        downloadSpeed={internetSpeed?.download || 0}
                        uploadSpeed={internetSpeed?.upload || uploadSpeed || 0}
                        isLoading={loading && !dashboardLoaded}
                    />
                )}

                {/* Network Dashboard */}
                {!isOffline && (
                    <NetworkDashboard 
                        metrics={[
                            { name: 'Packet Loss', value: avgPacketLoss || 0, unit: '%' },
                            { name: 'Latency', value: avgLatency || 0, unit: 'ms' },
                            { name: 'Download Speed', value: internetSpeed?.download || 0, unit: 'Mbps' },
                            { name: 'Upload Speed', value: internetSpeed?.upload || uploadSpeed || 0, unit: 'Mbps' }
                        ]}
                        packetLossHistory={packetLossHistory || []}
                        latencyHistory={latencyHistory || []}
                        speedHistory={speedHistory || []}
                        loadingHistory={loadingHistory && !dashboardLoaded}
                        loading={loading && !dashboardLoaded}
                        error={null}
                        refreshMetrics={refreshMetrics}
                    />
                )}
            </div>
        </Authenticated>
    );
};

export default HomePage;
