"use client";

import Authenticated from "@/components/layouts/Authenticated";
import {useContext, useEffect, useState} from "react";
import {AuthContext} from "@/context/AuthProvider";
import {useRouter} from "next/navigation";
import axios from "axios";

// fetch("https://api.ipify.org?format=json")
//     .then(response => response.json())
//     .then(data => {
//         // Display the IP address on the screen
//         console.log(data.ip);
//     })
//     .catch(error => {
//         console.error("Error fetching IP address:", error);
//     });

const HomePage = () => {
    const {userDetails} = useContext(AuthContext);
    const router = useRouter();

    // State to store fetched data
    const [packets, setPackets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const base_url = process.env.NEXT_PUBLIC_API_URL;

    // Function to fetch data from API
    const fetchPackets = async () => {
        try {
            const response = await axios.get(`${base_url}/packet/get_all`); // Make the API call
            setPackets(response.data.data); // Assuming your Laravel API returns data in { data: [...] } format
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchPackets(); // Fetch data when component mounts
    }, []);

    const goToDashboard = () => {
        router.push("/dashboard");
    };

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
                    style={{width: "90%", maxWidth: "1200px", maxHeight: "400px"}}
                >
                    <p className="text-lg font-semibold text-gray-800 mb-4 text-center">
                        Network Statistics
                    </p>
                    {/* Loading and Error Handling */}
                    {loading ? (
                        <p className="text-center text-gray-500">Loading...</p>
                    ) : error ? (
                        <p className="text-center text-red-500">Error: {error}</p>
                    ) : (
                        <table className="table-auto w-full border-collapse border border-gray-300 text-sm text-left">
                            <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 px-4 py-2 text-center">No.</th>
                                <th className="border border-gray-300 px-4 py-2 text-center">Time</th>
                                <th className="border border-gray-300 px-4 py-2 text-center">Source</th>
                                <th className="border border-gray-300 px-4 py-2 text-center">Destination</th>
                                <th className="border border-gray-300 px-4 py-2 text-center">Protocol</th>
                                <th className="border border-gray-300 px-4 py-2 text-center">Length</th>
                                <th className="border border-gray-300 px-4 py-2 text-center">Info</th>
                            </tr>
                            </thead>
                            <tbody>
                            {packets.map((packet, index) => (
                                <tr key={index}>
                                    <td className="border border-gray-300 px-4 py-2">{packet.id}</td>
                                    <td className="border border-gray-300 px-4 py-2">{new Date(packet.created_at).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}</td>
                                    <td className="border border-gray-300 px-4 py-2">{packet.source_ip}</td>
                                    <td className="border border-gray-300 px-4 py-2">{packet.destination_ip}</td>
                                    <td className="border border-gray-300 px-4 py-2">{packet.protocol}</td>
                                    <td className="border border-gray-300 px-4 py-2">{packet.length}</td>
                                    <td className="border border-gray-300 px-4 py-2">{packet.info}</td>
                                </tr>
                            //     <tr key={packet.id}>
                            // <td className="border border-gray-300 px-4 py-2">{packet.interface_name}</td>
                            // <td className="border border-gray-300 px-4 py-2">{packet.packet_details}</td>
                            // <td className="border border-gray-300 px-4 py-2">
                            //             {new Date(packet.created_at).toLocaleDateString('en-US', {
                            //                 year: 'numeric',
                            //                 month: 'short',
                            //                 day: '2-digit',
                            //             })}
                            //         </td>
                            //         <td className="border border-gray-300 px-4 py-2">
                            //             {new Date(packet.created_at).toLocaleTimeString([], {
                            //                 hour: '2-digit',
                            //                 minute: '2-digit'
                            //             })}
                            //         </td>
                            //     </tr>
                            ))}
                            </tbody>
                        </table>
                    )
                    }
                </div>
            </div>
        </Authenticated>
    )
        ;
};

export default HomePage;
