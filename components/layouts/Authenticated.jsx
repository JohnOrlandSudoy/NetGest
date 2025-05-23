"use client"
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "@/context/AuthProvider";
import SideBar from "../common/Sidebar";
import { userLogout } from "@/api/authentication";
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaBars, FaTimes, FaUser, FaSignOutAlt, FaUserEdit } from "react-icons/fa";

const Authenticated = ({ children, title }) => {
    const { userDetails } = useContext(AuthContext);
    const router = useRouter();
    const [profileDropdown, setProfileDropdown] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Check if we're on mobile
    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth >= 1024) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };

        // Initial check
        checkIfMobile();

        // Add event listener
        window.addEventListener('resize', checkIfMobile);

        // Cleanup
        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    const handleLogout = () => {
        userLogout()
            .then((resp) => {
                const responseData = resp.data;
                if (!responseData.error) {
                    toast.success("Logged out successfully");
                    Cookies.remove("accessToken");
                    Cookies.remove("userDetails");
                    router.push("/");
                } else {
                    toast.error("Please try again");
                }
            }).catch(() => {
                toast.error("Error encountered");
            });
    };

    // Close sidebar when clicking outside on mobile
    useEffect(() => {
        const handleClickOutside = (event) => {
            const sidebar = document.getElementById('sidebar');
            const toggleButton = document.getElementById('sidebar-toggle');
            
            if (isMobile && sidebarOpen && sidebar && !sidebar.contains(event.target) && 
                toggleButton && !toggleButton.contains(event.target)) {
                setSidebarOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile, sidebarOpen]);

    // Close profile dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            const dropdown = document.getElementById('profile-dropdown');
            const profileButton = document.getElementById('profile-button');
            
            if (profileDropdown && dropdown && !dropdown.contains(event.target) && 
                profileButton && !profileButton.contains(event.target)) {
                setProfileDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [profileDropdown]);

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-gray-200 shadow-sm z-30">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Left side - Logo and menu toggle */}
                        <div className="flex items-center">
                            {/* Mobile menu button */}
                            <button
                                id="sidebar-toggle"
                                type="button"
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                            >
                                <span className="sr-only">Open sidebar</span>
                                {sidebarOpen ? (
                                    <FaTimes className="block h-6 w-6" />
                                ) : (
                                    <FaBars className="block h-6 w-6" />
                                )}
                            </button>
                            
                            {/* Logo - visible on all screens */}
                            <div className="flex-shrink-0 flex items-center ml-4 lg:ml-0">
                                <Image
                                    src="/Images/logo.png"
                                    width={150}
                                    height={40}
                                    alt="NetGest Logo"
                                    className="h-8 w-auto"
                                />
                            </div>
                        </div>

                        {/* Center - Page Title (hidden on small screens) */}
                        <div className="hidden md:flex md:items-center md:justify-center flex-1">
                            {title && (
                                <h1 className="text-2xl font-bold text-gray-800 truncate">
                                    {title.toUpperCase()}
                                </h1>
                            )}
                        </div>

                        {/* Right side - User profile */}
                        <div className="flex items-center">
                            <div className="ml-3 relative">
                                <div>
                                    <button
                                        id="profile-button"
                                        type="button"
                                        className="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        onClick={() => setProfileDropdown(!profileDropdown)}
                                    >
                                        <span className="sr-only">Open user menu</span>
                                        <div className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors">
                                            <FaUser className="h-5 w-5" />
                                            <span className="hidden sm:inline-block font-medium truncate max-w-[150px]">
                                                {userDetails.name}
                                            </span>
                                        </div>
                                    </button>
                                </div>
                                
                                {/* Profile dropdown */}
                                {profileDropdown && (
                                    <div 
                                        id="profile-dropdown"
                                        className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-50"
                                    >
                                        <div className="py-1">
                                            <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                                                <p className="font-medium">{userDetails.name}</p>
                                                <p className="text-gray-500 truncate">{userDetails.email}</p>
                                            </div>
                                        </div>
                                        <div className="py-1">
                                            <button
                                                onClick={() => {
                                                    setProfileDropdown(false);
                                                    router.push("/edit-profile");
                                                }}
                                                className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                <FaUserEdit className="mr-2 h-4 w-4 text-gray-500" />
                                                Edit Profile
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setProfileDropdown(false);
                                                    handleLogout();
                                                }}
                                                className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                            >
                                                <FaSignOutAlt className="mr-2 h-4 w-4" />
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Mobile Title Bar - only visible on small screens */}
                {title && (
                    <div className="md:hidden border-t border-gray-200 px-4 py-3">
                        <h1 className="text-xl font-bold text-gray-800 truncate text-center">
                            {title.toUpperCase()}
                        </h1>
                    </div>
                )}
            </header>

            {/* Main Content Area with Sidebar */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - conditionally rendered based on state */}
                <div 
                    id="sidebar"
                    className={`${
                        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } fixed inset-y-0 left-0 z-40 w-64 bg-sky-700 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:h-full`}
                >
                    <div className="h-full flex flex-col overflow-y-auto">
                        {/* Mobile close button */}
                        <div className="flex items-center justify-between px-4 pt-5 pb-2 lg:hidden">
                            <div className="flex-shrink-0">
                                <Image
                                    src="/Images/logo.png"
                                    width={120}
                                    height={40}
                                    alt="NetGest Logo"
                                    className="h-8 w-auto"
                                />
                            </div>
                            <button
                                type="button"
                                className="text-white hover:text-gray-200 focus:outline-none"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <span className="sr-only">Close sidebar</span>
                                <FaTimes className="h-6 w-6" />
                            </button>
                        </div>
                        
                        {/* Sidebar content */}
                        <div className="flex-1 px-4 py-6">
                            <SideBar closeMobileSidebar={() => isMobile && setSidebarOpen(false)} />
                        </div>
                    </div>
                </div>

                {/* Main content */}
                <main className="flex-1 overflow-y-auto bg-gray-100">
                    <div className="py-6 px-4 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
            
            {/* Overlay for mobile sidebar */}
            {isMobile && sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-gray-600 bg-opacity-75 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default Authenticated;
