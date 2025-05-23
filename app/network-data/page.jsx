"use client";

import Authenticated from "@/components/layouts/Authenticated";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipLoader } from "react-spinners";
import DailySummaryList from "./list-data";
import { ErrorBoundary } from "@/utils/errorBoundary";

const NetworkUtilization = () => {
    const router = useRouter();
    const [dataList, setDataList] = useState([]);
    const [dataSummaries, setDataSummaries] = useState({});
    const [selectedDate, setSelectedDate] = useState("");
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState({});
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    
    // Generate mock dates for demonstration
    const generateMockDates = () => {
        const dates = [];
        const today = new Date();
        
        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            dates.push({
                date: dateStr,
                count: Math.floor(Math.random() * 10000) + 1000
            });
        }
        
        return dates;
    };
    
    // Generate mock summary for a date
    const generateMockSummary = (date) => {
        return {
            avgLatency: Math.round(Math.random() * 80 + 20),
            packetLoss: parseFloat((Math.random() * 3).toFixed(2)),
            networkSpeed: Math.round(Math.random() * 90 + 10),
            criticalEvents: Math.floor(Math.random() * 5)
        };
    };

    // Fetch dates from the API (mock implementation)
    const fetchDates = async () => {
        setLoading(true);
        try {
            // Use mock data instead of API call
            const dates = generateMockDates();
            
            // Sort dates (most recent first)
            const sortedDates = [...dates].sort((a, b) => {
                const dateA = a.date ? new Date(a.date) : new Date(a);
                const dateB = b.date ? new Date(b.date) : new Date(b);
                return dateB - dateA;
            });
            
            setDataList(sortedDates);
            
            // Initialize summary loading states
            const loadingStates = {};
            sortedDates.forEach(item => {
                loadingStates[item.date] = true;
            });
            setSummaryLoading(loadingStates);
            
            // Fetch summary for each date
            sortedDates.forEach(item => {
                fetchDateSummary(item.date);
            });
            
            setError(null);
        } catch (err) {
            console.error("Error fetching dates:", err);
            setError(err.message || "Failed to fetch dates");
        } finally {
            setLoading(false);
        }
    };

    // Fetch summary data for a specific date (mock implementation)
    const fetchDateSummary = async (date) => {
        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
            
            // Generate mock summary data
            const summary = generateMockSummary(date);
            
            setDataSummaries(prev => ({
                ...prev,
                [date]: summary
            }));
        } catch (err) {
            console.error(`Error fetching summary for ${date}:`, err);
            // Set default values for error case
            setDataSummaries(prev => ({
                ...prev,
                [date]: {
                    avgLatency: "N/A",
                    packetLoss: "N/A",
                    networkSpeed: "N/A",
                    criticalEvents: 0
                }
            }));
        } finally {
            setSummaryLoading(prev => ({
                ...prev,
                [date]: false
            }));
        }
    };

    // Fetch dates when the component mounts
    useEffect(() => {
        fetchDates();
    }, []);

    // Handle date selection
    const handleDateSelect = (date) => {
        setSelectedDate(date);
        
        // Store selected date in sessionStorage
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('selected_network_date', date);
        }
        
        // Navigate to the details page
        router.push(`/network-data/view?date=${encodeURIComponent(date)}`);
    };

    // Generate mock CSV data
    const convertToCSV = (data) => {
        if (!data || data.length === 0) return "";

        // Define the specific fields and their order for a well-organized CSV
        const fieldOrder = [
            "id", "created_at", "source_ip", "destination_ip", 
            "protocol", "length", "packet_loss", "latency", "info"
        ];
        
        // Create CSV header row
        const header = fieldOrder.join(",");
        
        // Create CSV data rows
        const rows = data.map(item => {
            return fieldOrder.map(field => {
                // Handle special formatting for certain fields
                if (field === "created_at") {
                    return `"${new Date(item[field]).toISOString()}"`;
                } else if (typeof item[field] === "string") {
                    // Escape quotes in strings and wrap in quotes
                    return `"${item[field].replace(/"/g, '""')}"`;
                } else {
                    return item[field];
                }
            }).join(",");
        }).join("\n");
        
        return header + "\n" + rows;
    };

    // Handle download functionality
    const handleDownload = async (date) => {
        try {
            // Show loading state
            setLoading(true);
            
            // Ensure we have a properly formatted date
            let formattedDate = date;
            if (typeof date === 'object' && date.date) {
                formattedDate = date.date;
            }
            
            console.log("Downloading data for date:", formattedDate);
            
            // Generate mock packet data
            const packets = [];
            for (let i = 0; i < 100; i++) {
                const timestamp = new Date(formattedDate);
                timestamp.setHours(Math.floor(Math.random() * 24));
                timestamp.setMinutes(Math.floor(Math.random() * 60));
                
                packets.push({
                    id: i + 1,
                    created_at: timestamp.toISOString(),
                    source_ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
                    destination_ip: `10.0.0.${Math.floor(Math.random() * 254) + 1}`,
                    protocol: ['TCP', 'UDP', 'ICMP'][Math.floor(Math.random() * 3)],
                    length: Math.floor(Math.random() * 1500) + 64,
                    packet_loss: (Math.random() * 2).toFixed(2),
                    latency: (Math.random() * 100 + 20).toFixed(1),
                    info: 'Sample packet data'
                });
            }
            
            if (packets.length === 0) {
                setError("No data available to download.");
                setLoading(false);
                return;
            }
            
            // Convert packets data to CSV
            const csvContent = convertToCSV(packets);
            
            // Trigger file download
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `network_data_${formattedDate.replace(/[\/\\:*?"<>|]/g, "_")}.csv`);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clear loading state
            setLoading(false);
            
            // Show success message
            setMessage("Data downloaded successfully!");
            setTimeout(() => setMessage(""), 3000);
            
        } catch (err) {
            console.error("Error downloading packets:", err);
            setError("Failed to download packets. " + (err.message || ""));
            setLoading(false);
            
            // Auto-clear error after 5 seconds
            setTimeout(() => setError(""), 5000);
        }
    };

    // Determine status level for color coding - based on the critical events and other metrics
    const getStatusLevel = (summary) => {
        if (!summary) return "gray";
        
        // Extract values, handling both string and numeric formats
        const latency = summary.avgLatency ? 
            (typeof summary.avgLatency === 'string' ? 
                parseFloat(summary.avgLatency.replace(/[^\d.-]/g, '')) : 
                parseFloat(summary.avgLatency)) : 0;
                
        const packetLoss = summary.packetLoss ? 
            (typeof summary.packetLoss === 'string' ? 
                parseFloat(summary.packetLoss.replace(/[^\d.-]/g, '')) : 
                parseFloat(summary.packetLoss)) : 0;
                
        const networkSpeed = summary.networkSpeed ? 
            (typeof summary.networkSpeed === 'string' ? 
                parseFloat(summary.networkSpeed.replace(/[^\d.-]/g, '')) : 
                parseFloat(summary.networkSpeed)) : 0;
                
        const criticalEvents = summary.criticalEvents || 0;
        
        // Critical conditions (red)
        if (
            criticalEvents > 10 || 
            latency > 200 || 
            packetLoss > 5 || 
            (networkSpeed < 5 && networkSpeed > 0)
        ) {
            return "red";
        }
        
        // Warning conditions (orange)
        if (
            criticalEvents > 5 || 
            latency > 100 || 
            packetLoss > 2 || 
            (networkSpeed < 10 && networkSpeed > 0)
        ) {
            return "orange";
        }
        
        // Caution conditions (yellow)
        if (
            criticalEvents > 0 || 
            latency > 50 || 
            packetLoss > 1 || 
            (networkSpeed < 15 && networkSpeed > 0)
        ) {
            return "yellow";
        }
        
        // Good conditions (green)
        return "green";
    };

    return (
        <Authenticated
            title="Network Data"
        >
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-center text-lg font-bold mb-4">Historical Data</div>

                {/* Loading Spinner */}
                <DailySummaryList/>
            </div>
        </Authenticated>
    );
};

export default NetworkUtilization;
