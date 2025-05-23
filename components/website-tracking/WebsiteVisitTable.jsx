"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

const WebsiteVisitTable = ({ limit = 10 }) => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const base_url = process.env.NEXT_PUBLIC_API_URL;

  const fetchRecentVisits = async () => {
    try {
      setLoading(true);
      
      // Get the token from cookies
      const token = Cookies.get("accessToken");
      
      // Make the request with the authorization header
      const response = await axios.get(`${base_url}/website-visits/recent`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      });
      
      setVisits(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching website visits:", err);
      
      if (err.response?.status === 401) {
        setError("Authentication required. Please log in again.");
      } else {
        setError(err.response?.data?.message || "Failed to fetch recent website visits");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentVisits();
    
    // Set up auto refresh every 60 seconds
    const interval = setInterval(() => {
      fetchRecentVisits();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Function to format time in a user-friendly way
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Function to format URL (shorten if too long)
  const formatUrl = (url) => {
    if (url.length > 50) {
      return url.substring(0, 47) + '...';
    }
    return url;
  };

  if (loading && visits.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 w-full">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Website Visits</h2>
        <div className="flex justify-center items-center h-40">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading website visits...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 w-full">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Website Visits</h2>
        <div className="text-center p-8">
          <p className="text-red-500 text-lg mb-2">Error: {error}</p>
          <p className="text-gray-600">Unable to fetch website visits. This feature requires authentication.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Recent Website Visits</h2>
        <button 
          onClick={fetchRecentVisits}
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition duration-300"
        >
          Refresh
        </button>
      </div>
      
      {visits.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No website visits recorded yet.</p>
          <p className="text-sm mt-2">Visit tracking will begin automatically as you browse.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domain
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Page Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visit Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visits.slice(0, limit).map((visit) => (
                <tr key={visit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {visit.domain}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {visit.title || 'Untitled Page'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs overflow-hidden text-ellipsis">
                    <a href={visit.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      {formatUrl(visit.url)}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTime(visit.visit_time)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {visits.length > limit && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Showing {limit} of {visits.length} recent visits
          </p>
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-400 text-center">
        Auto-refreshes every 60 seconds
      </div>
    </div>
  );
};

export default WebsiteVisitTable;
