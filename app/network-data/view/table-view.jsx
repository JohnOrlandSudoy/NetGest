"use client"; // This is a client component

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation"; // Import hooks

// Add some basic styling (adapt to your CSS solution)
const styles = {
    container: {
        padding: '20px',
        fontFamily: 'sans-serif',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    title: {
        textAlign: 'center',
        marginBottom: '20px',
    },
    dataTable: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '20px',
    },
    tableHeader: {
        backgroundColor: '#ffff',
        textAlign: 'left',
        padding: '10px',
        borderBottom: '1px solid #ddd',
    },
    tableCell: {
        padding: '10px',
        borderBottom: '1px solid #ddd',
        fontSize: '14px',
    },
    loading: {
        textAlign: 'center',
        fontSize: '18px',
    },
    error: {
        textAlign: 'center',
        color: 'red',
        fontSize: '18px',
    },
    pagination: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '15px',
    },
    paginationButton: {
        padding: '8px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'background-color 0.2s ease',
    },
    paginationButtonDisabled: {
        backgroundColor: '#ccc',
        cursor: 'not-allowed',
    },
    paginationInfo: {
        fontSize: '14px',
    }
};

function NetworkDataTableView() {
    const router = useRouter(); // Hook to programmatically navigate
    const searchParams = useSearchParams(); // Hook to access query parameters
    const dateParam = searchParams.get("date"); // Retrieve the "date" query parameter

    // State for data and pagination
    const [data, setData] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20); // Default page size, will update from API response

    // State for loading and error
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Add a refresh interval state (in milliseconds)
    const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default
    const [autoRefresh, setAutoRefresh] = useState(true); // Auto-refresh enabled by default

    // Effect to fetch data whenever dateParam or currentPage changes
    useEffect(() => {
        // Ensure dateParam exists before fetching
        if (!dateParam) {
            setError("No date specified in the URL.");
            setLoading(false);
            return; // Stop execution if no date
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null); // Clear previous errors

            try {
                // Construct the API URL with date and page parameters
                const apiUrl = `http://0.0.0.0:8080/data_logger/getDataPerPage?date=${encodeURIComponent(dateParam)}&page=${currentPage}`;

                const response = await fetch(apiUrl);

                if (!response.ok) {
                    // Handle non-2xx responses
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                // Update state with fetched data and pagination info
                setData(result.data);
                setTotalItems(result.total);
                setCurrentPage(result.page); // Use page number from API response
                setPageSize(result.page_size); // Use page size from API response

            } catch (err) {
                console.error("Failed to fetch network data:", err);
                setError("Failed to load network data. Please try again later.");
                setData([]); // Clear data on error
                setTotalItems(0);
                setPageSize(20); // Reset to default on error
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Dependencies for the effect: re-run when dateParam or currentPage changes
    }, [dateParam, currentPage, router, searchParams]); // Added router, searchParams as dependencies as recommended by Next.js lint rules

    // Add useEffect for auto-refresh functionality
    useEffect(() => {
        // Only set up auto-refresh if enabled and we have a date parameter
        if (autoRefresh && dateParam) {
            const intervalId = setInterval(() => {
                fetchData(); // Reuse the existing fetchData function
            }, refreshInterval);
            
            // Clean up interval on component unmount or when dependencies change
            return () => clearInterval(intervalId);
        }
    }, [dateParam, currentPage, refreshInterval, autoRefresh]);

    // Add a function to toggle auto-refresh
    const toggleAutoRefresh = () => {
        setAutoRefresh(prev => !prev);
    };

    // Add a function to change refresh interval
    const changeRefreshInterval = (newInterval) => {
        setRefreshInterval(newInterval);
    };

    // Calculate total pages
    const totalPages = Math.ceil(totalItems / pageSize);

    // Handle pagination button clicks
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            // Update the URL with the new page number without adding to history
            router.replace(`/network-data/view?date=${encodeURIComponent(dateParam)}&page=${newPage}`);
            // Updating `currentPage` state in the useEffect dependencies will trigger refetch
            // setCurrentPage(newPage); // No need to set state here, useEffect will pick up the URL change
        }
    };

     // Read the current page from the URL on component render/re-render
     // This ensures the state stays in sync if the user navigates back/forward
     useEffect(() => {
        const pageFromUrl = parseInt(searchParams.get('page') || '1', 10);
        // Only update internal state if it differs from URL to avoid infinite loops
        if (currentPage !== pageFromUrl) {
             setCurrentPage(pageFromUrl);
        }
     }, [searchParams]); // Re-run if searchParams (URL query) changes


    if (!dateParam && !loading) {
         return <div style={styles.error}>Error: No date provided in the URL query parameters.</div>;
    }

    if (loading) {
        return <div style={styles.loading}>Loading data for {dateParam || 'selected date'}...</div>;
    }

    if (error) {
        return <div style={styles.error}>{error}</div>;
    }

     if (data.length === 0 && totalItems === 0) {
         return <div style={styles.loading}>No data available for {dateParam}.</div>;
     }


    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Network Data for {dateParam}</h1>
            
            {/* Auto-refresh controls */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px'
            }}>
                <div>
                    <button 
                        onClick={toggleAutoRefresh}
                        style={{
                            ...styles.paginationButton,
                            backgroundColor: autoRefresh ? '#28a745' : '#6c757d'
                        }}
                    >
                        {autoRefresh ? 'Auto-Refresh: ON' : 'Auto-Refresh: OFF'}
                    </button>
                    {autoRefresh && (
                        <span style={{marginLeft: '10px'}}>
                            Refreshing every {refreshInterval/1000} seconds
                        </span>
                    )}
                </div>
                <div>
                    <select 
                        value={refreshInterval} 
                        onChange={(e) => changeRefreshInterval(Number(e.target.value))}
                        style={{
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ced4da'
                        }}
                    >
                        <option value={5000}>5 seconds</option>
                        <option value={10000}>10 seconds</option>
                        <option value={30000}>30 seconds</option>
                        <option value={60000}>1 minute</option>
                        <option value={300000}>5 minutes</option>
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <table style={styles.dataTable}>
                <thead>
                    <tr>
                        <th style={styles.tableHeader}>Timestamp</th>
                        <th style={styles.tableHeader}>Packet Loss (%)</th>
                        <th style={styles.tableHeader}>Latency (ms)</th>
                        <th style={styles.tableHeader}>Speed (Mbps)</th>
                         {/* Note: API provides OverallUnusedUtilizationPercent (100 - Actual Util) */}
                        <th style={styles.tableHeader}>Utilization (%)</th>
                         {/* Display configured Max Speed if available */}
                        <th style={styles.tableHeader}>Configured Max Speed (Mbps)</th>
                        <th style={styles.tableHeader}>Source IP</th>
                        <th style={styles.tableHeader}>Destination IP</th>
                        <th style={styles.tableHeader}>Protocol</th>
                        <th style={styles.tableHeader}>Size (bytes)</th>
                        <th style={styles.tableHeader}>Info</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, index) => (
                        // Using a combination of date_time and index as a key is usually safer
                        // if timestamps might not be perfectly unique within a page,
                        // or if you refetch the same data (though unlikely here).
                        // If date_time is guaranteed unique across all data, it's fine.
                         <tr key={`${item.date_time}-${index}`}>
                            <td style={styles.tableCell}>{item.date_time}</td>
                            <td style={styles.tableCell}>{item.packet_loss.toFixed(2)}</td>
                            <td style={styles.tableCell}>{item.latency.toFixed(2)}</td>
                            <td style={styles.tableCell}>{item.internet_speed.toFixed(2)}</td>
                             {/* Calculate actual utilization from unused percentage */}
                            <td style={styles.tableCell}>{(100 - item.network_utilization).toFixed(2)}</td>
                            <td style={styles.tableCell}>{item.max_speed_mbps ? item.max_speed_mbps.toFixed(2) : 'N/A'}</td>
                             <td style={styles.tableCell}>{item.source_ip}</td>
                             <td style={styles.tableCell}>{item.destination_ip}</td>
                             <td style={styles.tableCell}>{item.protocol}</td>
                             <td style={styles.tableCell}>{item.size}</td>
                             <td style={styles.tableCell}>{item.info}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination Controls */}
             {totalItems > 0 && ( // Only show pagination if there are items
                <div style={styles.pagination}>
                    <button
                        style={currentPage <= 1 ? {...styles.paginationButton, ...styles.paginationButtonDisabled} : styles.paginationButton}
                         // Add basic hover effect (optional)
                         onMouseOver={(e) => currentPage > 1 && (e.target.style.backgroundColor = styles.buttonHover?.backgroundColor || '#0056b3')}
                         onMouseOut={(e) => currentPage > 1 && (e.target.style.backgroundColor = styles.paginationButton.backgroundColor)}
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        Previous
                    </button>
                    <span style={styles.paginationInfo}>
                        Page {currentPage} of {totalPages} (Total: {totalItems} items)
                    </span>
                    <button
                        style={currentPage >= totalPages ? {...styles.paginationButton, ...styles.paginationButtonDisabled} : styles.paginationButton}
                        // Add basic hover effect (optional)
                        onMouseOver={(e) => currentPage < totalPages && (e.target.style.backgroundColor = styles.buttonHover?.backgroundColor || '#0056b3')}
                        onMouseOut={(e) => currentPage < totalPages && (e.target.style.backgroundColor = styles.paginationButton.backgroundColor)}
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}

export default NetworkDataTableView;
