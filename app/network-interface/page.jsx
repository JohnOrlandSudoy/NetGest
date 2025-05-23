"use client";

import Authenticated from "@/components/layouts/Authenticated";
import { useRouter } from "next/navigation";
import { FaNetworkWired, FaChartLine } from "react-icons/fa";

const Dashboard = () => {
    const router = useRouter();

    const handleNavigation = (path) => {
        router.push(path);
    };

    return (
        <Authenticated title="Network Interface">
            <div className="flex flex-col items-center min-h-[500px] w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                    <button
                        onClick={() => handleNavigation("/network-data")}
                        className="w-full h-64 border border-gray-300 rounded-lg p-6 hover:border-blue-500 bg-white hover:bg-blue-50 shadow-md transition duration-300 flex flex-col items-center justify-center text-center"
                    >
                        <FaNetworkWired className="text-blue-600 text-5xl mb-4" />
                        <p className="font-semibold text-xl mb-3 text-gray-800">Network Data</p>
                        <p className="text-sm text-gray-600">
                            View network resource usage, identify congestion points, and monitor bandwidth consumption to maintain optimal performance.
                        </p>
                    </button>

                    <button
                        onClick={() => handleNavigation("/recommendation")}
                        className="w-full h-64 border border-gray-300 rounded-lg p-6 hover:border-blue-500 bg-white hover:bg-blue-50 shadow-md transition duration-300 flex flex-col items-center justify-center text-center"
                    >
                        <FaChartLine className="text-green-600 text-5xl mb-4" />
                        <p className="font-semibold text-xl mb-3 text-gray-800">Network Recommendation</p>
                        <p className="text-sm text-gray-600">
                            Get prescriptive actions and intelligent recommendations to optimize your network performance and resolve issues.
                        </p>
                    </button>
                </div>
            </div>
        </Authenticated>
    );
};

export default Dashboard;
