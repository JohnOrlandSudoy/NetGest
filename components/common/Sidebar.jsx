"use client";
import { Routes } from "@/utils/routes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

const SideBar = ({ closeMobileSidebar }) => {
    const pathName = usePathname();

    return (
        <nav className="space-y-1">
            {Routes.map((route, key) => (
                <Link
                    key={key}
                    href={route.path}
                    onClick={closeMobileSidebar}
                    className={`
                        ${pathName && (pathName === route.path || pathName?.startsWith(route.path)) 
                            ? "bg-sky-800 text-white" 
                            : "text-white hover:bg-sky-800"}
                        group flex items-center px-3 py-3 text-base font-medium rounded-md transition-all duration-200
                    `}
                >
                    <div className="flex items-center">
                        <div className="mr-3 flex-shrink-0 h-6 w-6">
                            <Icon name={route.icon} />
                        </div>
                        <span className="truncate">{route.name}</span>
                    </div>
                </Link>
            ))}
        </nav>
    );
};

export default SideBar;
