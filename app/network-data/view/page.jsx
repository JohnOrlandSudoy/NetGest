"use client";

import {useSearchParams} from "next/navigation"; // Import useSearchParams
import React, {Suspense, useContext, useEffect, useState} from "react";
import axios from "axios";
import DataTable from "@/components/common/DataTable";
import Authenticated from "@/components/layouts/Authenticated";
import Link from "next/link";
import NetworkDataTableView from "./table-view";

const ViewPage = () => {
    const searchParams = useSearchParams(); // Hook to access query parameters
    const dateParam = searchParams.get("date"); // Retrieve the "date" query parameter
    
    // Ensure we have a valid date parameter
    const [date, setDate] = useState(null);
    const [packets, setPackets] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        total: 0,
        per_page: 100,
        current_page: 1,
        last_page: 1
    });
    const base_url = process.env.NEXT_PUBLIC_API_URL;

    // Initialize date from URL parameter or sessionStorage
    useEffect(() => {
        let selectedDate = dateParam;
        
        // If no date in URL, try to get from sessionStorage
        if (!selectedDate && typeof window !== 'undefined') {
            selectedDate = sessionStorage.getItem('selected_network_date');
        }
        
        // Ensure we have a valid date format (YYYY-MM-DD)
        if (selectedDate) {
            console.log("Setting active date:", selectedDate);
            setDate(selectedDate);
        } else {
            setError("No date specified. Please select a date from the network data page.");
            setLoading(false);
        }
    }, [dateParam]);

    // Format packet data to ensure latency and packet loss are properly displayed with units
    const formatPacketData = (packets) => {
        if (!packets || !Array.isArray(packets)) return [];
        
        return packets.map(packet => ({
            ...packet,
            // Ensure timestamp is properly formatted
            created_at: packet.created_at,
            // Ensure other fields are properly formatted
            id: packet.id,
            source_ip: packet.source_ip,
            destination_ip: packet.destination_ip,
            protocol: packet.protocol,
            length: packet.length,
            latency: packet.latency || 0,
            packet_loss: packet.packet_loss || 0,
            info: packet.info
        }));
    };

    // Function to fetch data from API with pagination - improved for reliability
    const fetchPackets = async (page = 1, limit = 100) => {
        try {
            setLoading(true);
            
            // Create a timeout promise to cancel the request if it takes too long
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timed out after 15 seconds')), 15000);
            });
            
            // Create the fetch promise with proper URL encoding
            const encodedDate = encodeURIComponent(date);
            const fetchPromise = axios.get(`${base_url}/packet/get_all_by_date/${encodedDate}?page=${page}&limit=${limit}`, {
                // Add CORS headers to the request
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache' // Prevent caching issues
                },
                withCredentials: true // Important for CORS with credentials
            });
            
            // Race the promises - either get the response or timeout
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            // Validate response data structure
            if (!response.data || !response.data.data) {
                throw new Error("Invalid data format received from server");
            }
            
            // Extract data and pagination info
            const data = response.data.data;
            
            // Format the packet data to ensure latency and packet loss are displayed correctly
            const formattedPackets = formatPacketData(data.data);
            
            // Ensure pagination data is properly set
            const paginationData = {
                total: parseInt(data.pagination.total) || 0,
                per_page: parseInt(data.pagination.per_page) || 100,
                current_page: parseInt(data.pagination.current_page) || 1,
                last_page: parseInt(data.pagination.last_page) || 1
            };
            
            console.log("Pagination data:", paginationData);
            
            setPackets(formattedPackets);
            setPagination(paginationData);
            
            setLoading(false);
            setError(null);
            
        } catch (error) {
            console.error("Error fetching packets:", error);
            setError(error.message || "Failed to load packets. Please try again.");
            setLoading(false);
        }
    };

    // Load data when page or date changes - with error retry
    useEffect(() => {
        if (date) {
            console.log("Fetching packets for date:", date);
            fetchPackets(1);
            
            // If loading takes too long, retry once after 5 seconds with a smaller limit
            const timeoutId = setTimeout(() => {
                if (loading) {
                    console.log("Retrying data fetch with smaller batch...");
                    fetchPackets(1, 50); // Try with a smaller limit
                }
            }, 5000);
            
            return () => clearTimeout(timeoutId);
        }
    }, [date]);

    // Handle page change
    const handlePageChange = (page) => {
        console.log("Changing to page:", page);
        fetchPackets(page);
    };

    const getProtocolColor = (protocol) => {
        switch (protocol) {
            case 'TCP':
                return '#3498db';
            case 'UDP':
                return '#f1c40f';
            case 'ICMP':
                return '#e74c3c';
            default:
                return '#2ecc71';
        }
    };

    return (
        <Authenticated title="View Network Data">
            <NetworkDataTableView/>
        </Authenticated>
    );
};

const V = () => <Suspense><ViewPage /></Suspense>

export default V;
