import Authenticated from "@/components/layouts/Authenticated";
import Image from "next/image";

const AboutPage = () => {
    return (
        <Authenticated title="About">
            <div className="flex flex-col items-center w-full">
                {/* Main Content Container */}
                <div className="w-full max-w-5xl bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                        {/* Logo Section */}
                        <div className="flex flex-col items-center justify-center p-8 md:w-1/3 md:border-r md:border-gray-200">
                            <Image
                                src="/Images/logo.png" 
                                alt="Netgest Logo"
                                width={200}
                                height={200}
                                className="w-32 h-32 mb-4"
                            />
                            <h2 className="text-xl font-semibold text-gray-800 mt-4">NetGest</h2>
                            <p className="text-sm text-gray-600 text-center mt-2">
                                Network Management Dashboard
                            </p>
                        </div>

                        {/* Developers Section */}
                        <div className="flex flex-col items-center justify-center p-8 md:w-2/3">
                            <h2 className="text-2xl font-semibold mb-8 text-gray-800">Developers</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="flex flex-col items-center">
                                    <div className="w-24 h-24 rounded-full overflow-hidden mb-3 border-2 border-gray-300">
                                        <Image
                                            src="/Images/Symon.png" 
                                            alt="Symon Capena"
                                            width={96}
                                            height={96}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <p className="text-lg text-gray-800 font-semibold">Symon Capena</p>
                                    <p className="text-sm text-gray-600">Lead Developer</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-24 h-24 rounded-full overflow-hidden mb-3 border-2 border-gray-300">
                                        <Image
                                            src="/Images/Karlo.png" 
                                            alt="Karlo Santos"
                                            width={96}
                                            height={96}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <p className="text-lg text-gray-800 font-semibold">Karlo Santos</p>
                                    <p className="text-sm text-gray-600">UI/UX Designer</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Description Section */}
                    <div className="bg-gray-50 p-8 border-t border-gray-200">
                        <h3 className="text-xl font-semibold mb-4 text-gray-800">About NetGest</h3>
                        <p className="text-gray-600 mb-4">
                            NetGest is a comprehensive network management dashboard designed to help network administrators monitor, analyze, and optimize network performance. 
                            Our platform provides real-time insights into network metrics, identifies potential issues, and offers recommendations for improvement.
                        </p>
                        <p className="text-gray-600">
                            Built with modern web technologies including Next.js and Tailwind CSS, NetGest delivers a responsive and intuitive user experience across all devices.
                        </p>
                    </div>
                </div>
            </div>
        </Authenticated>
    );
};

export default AboutPage;
