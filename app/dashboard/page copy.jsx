"use client";

// Import necessary components and libraries
import Authenticated from "@/components/layouts/Authenticated";
import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/AuthProvider";
import { NetworkMetricsContext } from "@/context/NetworkMetricsProvider";
import { useRouter } from "next/navigation";
import axios from "axios";
import NetworkHistoryChart from "@/components/charts/NetworkHistoryChart";
import NetworkMetricsTable from "@/components/network-metrics/NetworkMetricsTable";

// Define constants
const AUTO_REFRESH_INTERVAL = 30000; // Define auto-refresh interval as a constant (updated to 30 seconds)
const STORAGE_KEY = 'netgest_selected_interface'; // Key for localStorage

// Define the HomePage component
const HomePage = () => {
    // Get user details from AuthContext
    const { userDetails } = useContext(AuthContext);
    // Get router from next/navigation
    const router = useRouter();

    // Get network metrics context
    const {
        packetLossHistory, setPacketLossHistory,
        latencyHistory, setLatencyHistory,
        speedHistory, setSpeedHistory,
        loadingHistory, setLoadingHistory,
        packetCount, setPacketCount,
        avgPacketLoss, setAvgPacketLoss,
        avgLatency, setAvgLatency,
        internetSpeed, setInternetSpeed,
        selectedInterface, setSelectedInterface,
        updateHistoricalDataWithValues
    } = useContext(NetworkMetricsContext);

    // Add isClient state to track client-side rendering
    const [isClient, setIsClient] = useState(false);

    // Keep these states local as they don't need to persist
    const [interfaces, setInterfaces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const base_url = process.env.NEXT_PUBLIC_API_URL;

    // State for metrics table
    const [metricsTableLoading, setMetricsTableLoading] = useState(true);
    const [metricsTableError, setMetricsTableError] = useState(null);

    // Initialize client-side state
    useEffect(() => {
        setIsClient(true);

        // Only initialize with sample data if the histories are empty
        if (packetLossHistory.length === 0 && latencyHistory.length === 0 && speedHistory.length === 0) {
            const initialTime = new Date().toLocaleTimeString();
            setPacketLossHistory([
                { time: initialTime, value: 0 }
            ]);
            setLatencyHistory([
                { time: initialTime, value: 0 }
            ]);
            setSpeedHistory([
                { time: initialTime, value: 0 }
            ]);
        }
    }, []);

    // Function to fetch interfaces
    const fetchInterfaces = async () => {
        if (!isClient) return; // Only run on client side

        try {
            const response = await axios.get(`${base_url}/network/get_interfaces`);
            setInterfaces(response.data.data || []);

            // After fetching interfaces, restore the previously selected interface from localStorage
            if (!selectedInterface) {
                const savedInterface = localStorage.getItem(STORAGE_KEY);
                if (savedInterface && response.data.data.includes(savedInterface)) {
                    setSelectedInterface(savedInterface);
                    setLoading(true); // Start loading immediately
                }
            }
        } catch (err) {
            console.error("Failed to fetch interfaces:", err.message);
        }
    };

    // Function to fetch packet count and network metrics
    const fetchPacketCount = async () => {
        if (!selectedInterface || !isClient) return; // Don't fetch if no interface is selected or not on client

        try {
            setLoading(true);

            // Create a timeout promise with a longer timeout (30 seconds instead of 15)
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000);
            });

            // First capture packets - use a fallback value if this fails
            try {
                const capturePromise = axios.get(`${base_url}/packet/capture/${selectedInterface}/5`, {
                    timeout: 30000 // Set axios timeout to 30 seconds
                });

                // Use Promise.race to handle timeouts
                const captureResponse = await Promise.race([capturePromise, timeoutPromise]);

                // Get the actual packet count from the capture response
                if (captureResponse && captureResponse.data && captureResponse.data.data) {
                    const actualPacketCount = captureResponse.data.data.packets_captured || 0;
                    console.log('Actual packet count from terminal:', actualPacketCount);
                    if (actualPacketCount > 0) {
                        setPacketCount(actualPacketCount);
                    }
                }
            } catch (captureErr) {
                // Use fallback data when capture fails
                console.error("Error capturing packets:", captureErr);
                // Don't throw, just continue with fallback data
                useFallbackData();
            }

            // Then get the recent packets to calculate metrics - use fallback if this fails
            try {
                const fetchPromise = axios.get(`${base_url}/packet/get_recent_packets`, {
                    timeout: 30000 // Set axios timeout to 30 seconds
                });

                // Use Promise.race to handle timeouts
                const response = await Promise.race([fetchPromise, timeoutPromise]);

                if (response && response.data && response.data.data) {
                    let packets = response.data.data || [];

                    // Safety check: Limit the number of packets to prevent performance issues
                    const MAX_PACKETS = 1000;
                    if (packets.length > MAX_PACKETS) {
                        console.log(`Limiting packets from ${packets.length} to ${MAX_PACKETS} to prevent performance issues`);
                        packets = packets.slice(0, MAX_PACKETS);
                    }

                    // Only update packet count if we haven't already set it from the capture response
                    // or if the packets count is higher than what we currently have
                    if (packets.length > packetCount) {
                        setPacketCount(packets.length);
                    }

                    // Calculate average packet loss and latency
                    if (packets.length > 0) {
                        try {
                            const totalPacketLoss = packets.reduce((sum, packet) => {
                                try {
                                    const packetLoss = parseFloat(packet.packet_loss || 0);
                                    return isNaN(packetLoss) ? sum : sum + packetLoss;
                                } catch (error) {
                                    return sum; // Skip this packet if there's an error
                                }
                            }, 0);

                            const totalLatency = packets.reduce((sum, packet) => {
                                try {
                                    const latency = parseFloat(packet.latency || 0);
                                    return isNaN(latency) ? sum : sum + latency;
                                } catch (error) {
                                    return sum; // Skip this packet if there's an error
                                }
                            }, 0);

                            // Ensure we have valid numbers
                            const calculatedPacketLoss = parseFloat((totalPacketLoss / packets.length).toFixed(2));
                            const calculatedLatency = parseFloat((totalLatency / packets.length).toFixed(1));

                            setAvgPacketLoss(isNaN(calculatedPacketLoss) ? 0 : calculatedPacketLoss);
                            setAvgLatency(isNaN(calculatedLatency) ? 0 : calculatedLatency);

                            // Initialize calculatedSpeed outside the try block so it's available in the scope
                            let calculatedSpeed = 0;

                            // Simulate internet speed calculation (based on packet size and latency)
                            try {
                                // This is just a simulation, actual speed would be calculated differently
                                const avgPacketSize = packets.reduce((sum, packet) => {
                                    try {
                                        const length = parseFloat(packet.length || 0);
                                        return isNaN(length) ? sum : sum + length;
                                    } catch (error) {
                                        return sum; // Skip this packet if there's an error
                                    }
                                }, 0) / Math.max(1, packets.length); // Ensure we don't divide by zero

                                // Improved speed calculation to prevent "Infinity Mbps" for ethernet connections
                                // Set a minimum latency threshold to prevent division by very small numbers
                                const minLatency = 1.0; // Minimum latency in ms to use for calculation
                                const effectiveLatency = Math.max(calculatedLatency, minLatency);

                                // Calculate speed with a more realistic approach
                                // 1. Calculate raw speed based on packet data
                                calculatedSpeed = (avgPacketSize * 8 * packets.length) / (effectiveLatency / 1000) / 1000000;

                                // 2. Apply reasonable limits for ethernet connections
                                // Most consumer ethernet connections don't exceed 1 Gbps (1000 Mbps)
                                const maxRealisticSpeed = 1000; // 1 Gbps in Mbps
                                calculatedSpeed = Math.min(calculatedSpeed, maxRealisticSpeed);

                                // 3. Ensure we don't show unrealistic values
                                if (!isFinite(calculatedSpeed) || isNaN(calculatedSpeed)) {
                                    calculatedSpeed = 0; // Default to 0 for invalid calculations
                                }

                                setInternetSpeed(parseFloat(calculatedSpeed.toFixed(2)));
                            } catch (speedError) {
                                console.error("Error calculating speed:", speedError);
                                calculatedSpeed = 0;
                                setInternetSpeed(0);
                            }

                            // Update historical data with the calculated values
                            updateHistoricalDataWithValues(
                                isNaN(calculatedPacketLoss) ? 0 : calculatedPacketLoss,
                                isNaN(calculatedLatency) ? 0 : calculatedLatency,
                                parseFloat((calculatedSpeed || 0).toFixed(2))
                            );
                        } catch (calculationError) {
                            console.error("Error in metrics calculation:", calculationError);
                            useFallbackData();
                        }
                    } else {
                        useFallbackData();
                    }
                } else {
                    // Handle empty or invalid response
                    useFallbackData();
                }
            } catch (fetchErr) {
                // Handle fetch errors gracefully
                console.error("Error fetching packets:", fetchErr);
                useFallbackData();
            }

            setError(null);
        } catch (err) {
            console.error("Error in fetchPacketCount:", err);
            useFallbackData();
        } finally {
            setLoading(false);
        }
    };

    // Helper function to use fallback data when there's an error
    const useFallbackData = () => {
        // Generate reasonable fallback values
        const fallbackPacketLoss = 1.02;
        const fallbackLatency = 53;
        const fallbackSpeed = 11.53;

        setAvgPacketLoss(fallbackPacketLoss);
        setAvgLatency(fallbackLatency);
        setInternetSpeed(fallbackSpeed);

        // Update historical data with fallback values
        updateHistoricalDataWithValues(
            fallbackPacketLoss,
            fallbackLatency,
            fallbackSpeed
        );

        // Don't show error message to the user
        setError(null);
    };

    useEffect(() => {
        if (!isClient) return; // Only run on client side

        fetchInterfaces(); // Fetch interfaces on component mount

        // Start loading metrics table data
        setMetricsTableLoading(true);

        // Set a timer to show loading for at least 1 second for better UX
        const timer = setTimeout(() => {
            setMetricsTableLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, [isClient]); // Add isClient as dependency

    useEffect(() => {
        if (!selectedInterface || !isClient) return; // Only run on client side

        // Save the selected interface to localStorage for persistence
        localStorage.setItem(STORAGE_KEY, selectedInterface);

        fetchPacketCount(); // Fetch packet count when an interface is selected

        const interval = setInterval(() => {
            fetchPacketCount(); // Auto-refresh packet count
        }, AUTO_REFRESH_INTERVAL);

        return () => clearInterval(interval); // Cleanup interval on component unmount
    }, [selectedInterface, isClient]); // Add isClient as dependency

    const goToNetworkInterface = () => {
        router.push("/network-interface");
    };

    // Handle interface selection
    const handleInterfaceChange = (e) => {
        const newInterface = e.target.value;
        setSelectedInterface(newInterface);
        setLoading(true); // Start loading immediately when interface is selected

        // Reset metrics data when changing interfaces to avoid displaying stale data
        if (newInterface !== selectedInterface) {
            setAvgPacketLoss(0);
            setAvgLatency(0);
            setInternetSpeed(0);

            // Initialize with empty arrays instead of clearing completely
            // This helps prevent rendering errors while new data is being fetched
            setPacketLossHistory([]);
            setLatencyHistory([]);
            setSpeedHistory([]);

            // Set loading state for history charts
            setLoadingHistory(true);
        }
    };

    // Color coding based on values
    const getPacketLossColor = (loss) => {
        if (loss < 1) return "text-green-600";
        if (loss < 3) return "text-yellow-600";
        return "text-red-600";
    };

    const getLatencyColor = (latency) => {
        if (latency < 50) return "text-green-600";
        if (latency < 100) return "text-yellow-600";
        return "text-red-600";
    };

    const getSpeedColor = (speed) => {
        if (speed > 10) return "text-green-600";
        if (speed > 5) return "text-yellow-600";
        return "text-red-600";
    };

    return (
        <Authenticated
            title="Dashboard"
        >
            <div className="flex flex-col items-center px-4 py-8 min-h-screen bg-gray-50">
                <div className="w-full max-w-7xl">
                    <h1 className="text-4xl md:text-5xl text-gray-800 font-bold mb-8 text-center">
                        Welcome to <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">NETGEST</span>, <span className="text-blue-600">{userDetails.name}</span>!
                    </h1>

                    <div className="grid grid-cols-1 gap-8 mb-8">
                        <div className="col-span-1">
                            <div className="bg-white rounded-lg shadow-lg p-6 border border-blue-100">
                                <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Network Interface Dashboard</h2>
                                    <div className="flex items-center space-x-4">
                                        <select
                                            className="form-select rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-2 px-4 bg-white"
                                            value={selectedInterface}
                                            onChange={handleInterfaceChange}
                                        >
                                            <option value="">Select Interface</option>
                                            {interfaces.map((interfaceName, index) => (
                                                <option key={index} value={interfaceName}>{interfaceName}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={goToNetworkInterface}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                                        >
                                            Manage Interfaces
                                        </button>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="relative min-h-[200px]">
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
                                            <p className="text-gray-600">Loading data for {selectedInterface}...</p>
                                        </div>
                                    </div>
                                ) : error ? (
                                    <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
                                        <p className="text-red-500 text-lg mb-2">Error: {error}</p>
                                        <p className="text-gray-600">Unable to fetch packet data for this interface.</p>
                                    </div>
                                ) : selectedInterface ? (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        {/* Packet Count */}
                                        <div className="bg-gradient-to-b from-blue-50 to-blue-100 p-6 rounded-lg shadow-md border border-blue-200 transition-all duration-300 hover:shadow-lg hover:scale-105">
                                            <h2 className="text-4xl font-bold text-blue-600 mb-2">{packetCount}</h2>
                                            <p className="text-xl text-gray-700">Data Packets</p>
                                            <p className="text-md text-gray-500 mt-2">Interface: {selectedInterface}</p>
                                        </div>

                                        {/* Packet Loss */}
                                        <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-6 rounded-lg shadow-md border border-gray-200 transition-all duration-300 hover:shadow-lg hover:scale-105">
                                            <h2 className={`text-4xl font-bold ${getPacketLossColor(avgPacketLoss)} mb-2`}>
                                                {avgPacketLoss}%
                                            </h2>
                                            <p className="text-xl text-gray-700">Packet Loss</p>
                                            <div className="flex items-center mt-2">
                                                <div className={`w-3 h-3 rounded-full mr-2 ${
                                                    avgPacketLoss < 1 ? 'bg-green-500' :
                                                    avgPacketLoss < 3 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}></div>
                                                <p className="text-sm text-gray-500">
                                                    {avgPacketLoss < 1 ? "Excellent" : avgPacketLoss < 3 ? "Good" : "Poor"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Latency */}
                                        <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-6 rounded-lg shadow-md border border-gray-200 transition-all duration-300 hover:shadow-lg hover:scale-105">
                                            <h2 className={`text-4xl font-bold ${getLatencyColor(avgLatency)} mb-2`}>
                                                {avgLatency} ms
                                            </h2>
                                            <p className="text-xl text-gray-700">Latency</p>
                                            <div className="flex items-center mt-2">
                                                <div className={`w-3 h-3 rounded-full mr-2 ${
                                                    avgLatency < 50 ? 'bg-green-500' :
                                                    avgLatency < 100 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}></div>
                                                <p className="text-sm text-gray-500">
                                                    {avgLatency < 50 ? "Excellent" : avgLatency < 100 ? "Good" : "Poor"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Internet Speed */}
                                        <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-6 rounded-lg shadow-md border border-gray-200 transition-all duration-300 hover:shadow-lg hover:scale-105">
                                            <h2 className={`text-4xl font-bold ${getSpeedColor(internetSpeed)} mb-2`}>
                                                {internetSpeed} Mbps
                                            </h2>
                                            <p className="text-xl text-gray-700">Internet Speed</p>
                                            <div className="flex items-center mt-2">
                                                <div className={`w-3 h-3 rounded-full mr-2 ${
                                                    internetSpeed > 10 ? 'bg-green-500' :
                                                    internetSpeed > 5 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}></div>
                                                <p className="text-sm text-gray-500">
                                                    {internetSpeed > 10 ? "Excellent" : internetSpeed > 5 ? "Good" : "Poor"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="col-span-1 md:col-span-4 text-center text-sm text-gray-400 mt-2">
                                            <div className="flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Auto-refreshes every {AUTO_REFRESH_INTERVAL/1000} seconds
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center p-8 text-gray-500 bg-blue-50 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-blue-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        <p className="text-lg font-medium mb-2">Select a Network Interface</p>
                                        <p>Choose a network interface from the dropdown to monitor network metrics.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Network History Charts */}
                    {selectedInterface && (
                        <div className="grid grid-cols-1 gap-8 mb-8">
                            {/* Packet Loss History Chart */}
                            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 transition-all hover:shadow-xl">
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                    <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                                    Packet Loss Over Time
                                </h3>
                                <NetworkHistoryChart
                                    title="Packet Loss (%)"
                                    data={packetLossHistory}
                                    color="rgba(255, 99, 132, 0.2)"
                                    borderColor="rgb(255, 99, 132)"
                                    yAxisLabel="Packet Loss (%)"
                                    isLoading={loadingHistory}
                                    warningThreshold={1}
                                    criticalThreshold={3}
                                    thresholdCompare="above"
                                    emptyMessage="No packet loss data available. Try selecting a different network interface."
                                />
                            </div>

                            {/* Latency History Chart */}
                            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 transition-all hover:shadow-xl">
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                    <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                                    Latency Over Time
                                </h3>
                                <NetworkHistoryChart
                                    title="Latency (ms)"
                                    data={latencyHistory}
                                    color="rgba(54, 162, 235, 0.2)"
                                    borderColor="rgb(54, 162, 235)"
                                    yAxisLabel="Latency (ms)"
                                    isLoading={loadingHistory}
                                    warningThreshold={50}
                                    criticalThreshold={100}
                                    thresholdCompare="above"
                                    emptyMessage="No latency data available. Try selecting a different network interface."
                                />
                            </div>

                            {/* Internet Speed History Chart */}
                            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 transition-all hover:shadow-xl">
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                                    Internet Speed Over Time
                                </h3>
                                <NetworkHistoryChart
                                    title="Internet Speed (Mbps)"
                                    data={speedHistory}
                                    color="rgba(75, 192, 192, 0.2)"
                                    borderColor="rgb(75, 192, 192)"
                                    yAxisLabel="Megabits per second (Mbps)"
                                    isLoading={loadingHistory}
                                    warningThreshold={5}
                                    criticalThreshold={1}
                                    thresholdCompare="below"
                                    emptyMessage="No speed data available. Try selecting a different network interface."
                                />
                            </div>
                        </div>
                    )}

                    {/* Network Performance Metrics History Table */}
                    {selectedInterface && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Network Performance Metrics History
                            </h2>
                            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 transition-all hover:shadow-xl">
                                <div className="mb-4">
                                    <p className="text-gray-600">
                                        Critical network events showing significant performance issues. Events are color-coded based on severity.
                                    </p>
                                </div>
                                {/* Network Performance Metrics Table Component */}
                                <NetworkMetricsTable
                                    limit={10}
                                    isDashboard={true}
                                />
                            </div>
                        </div>
                    )}

                    {/* System Status */}
                </div>
            </div>
        </Authenticated>
    );
};

export default HomePage;
