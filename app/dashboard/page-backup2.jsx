"use client";

import Authenticated from "@/components/layouts/Authenticated";
import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/AuthProvider";
import { useRouter } from "next/navigation";
import axios from "axios";
import DataTable from "../../components/common/DataTable";

const AUTO_REFRESH_INTERVAL = 30000; // Define auto-refresh interval as a constant

const HomePage = () => {
    const { userDetails } = useContext(AuthContext);
    const router = useRouter();

    // State to store fetched data
    const [packets, setPackets] = useState([]); // Ensure it's always an array
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const base_url = process.env.NEXT_PUBLIC_API_URL;

    // Function to fetch data from API
    const fetchPackets = async () => {
        try {
            setLoading(true); // Set loading to true for better UI feedback
            await axios.get(`${base_url}/packet/capture/Wifi/3`);

            const response = await axios.get(`${base_url}/packet/get_recent_packets`);
            console.log("API Response:", response.data); // Debug API response

            setPackets(response.data.data || []); // Ensure packets is always an array
            setError(null); // Clear any existing error
        } catch (err) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false); // Stop spinner after the request is completed
        }
    };

    useEffect(() => {
        fetchPackets(); // Fetch data initially

        // Set up auto-refresh with a clean interval management
        const interval = setInterval(() => {
            fetchPackets(); // Fetch new data periodically
            console.log(AUTO_REFRESH_INTERVAL);
        }, AUTO_REFRESH_INTERVAL);

        return () => clearInterval(interval); // Cleanup interval on component unmount
    }, []);

    const goToDashboard = () => {
        router.push("/dashboard");
    };

    // Define columns for the DataTable
    const columns = React.useMemo(
        () => [
            { Header: "No.", accessor: "id" },
            {
                Header: "Date",
                accessor: "updated_at",
                Cell: ({ value }) =>
                    new Date(value).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                    }),
            },
            { Header: "Source", accessor: "source_ip" },
            { Header: "Destination", accessor: "destination_ip" },
            { Header: "Protocol", accessor: "protocol" },
            { Header: "Length", accessor: "length" },
            { Header: "Info", accessor: "info" },
        ],
        []
    );

    return (
        <Authenticated>
            <div className="flex flex-col items-center h-screen">
                <p className="text-[70px] text-white mb-8 text-center">
                    Welcome to NETGEST <b>{userDetails.name}</b>!
                </p>
                <button
                    className="px-8 py-4 bg-gray-400 text-black text-xl font-semibold rounded-md hover:bg-gray-500 transition duration-300 mb-8"
                    onClick={goToDashboard}
                >
                    Dashboard
                </button>

                {/* Table Section */}
                <div
                    className="bg-white rounded-lg shadow-lg p-6 mb-8 overflow-auto"
                    style={{ width: "90%", maxWidth: "1200px", maxHeight: "400px" }}
                >
                    <p className="text-lg font-semibold text-gray-800 mb-4 text-center">
                        Network Statistics
                    </p>
                    {/* Loading and Error Handling */}
                    {loading ? (
                        <div className="flex justify-center items-center h-20">
                            {/* Spinner */}
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : error ? (
                        <p className="text-center text-red-500">Error: {error}</p>
                    ) : (
                        <DataTable columns={columns} data={packets || []} theme="light" />
                    )}
                </div>
            </div>
        </Authenticated>
    );
};

export default HomePage;
