"use client";
import { Routes } from "@/utils/routes";
import { usePathname } from "next/navigation";
import SidebarItem from "./SidebarItem";

const SideBar = ({ closeMobileSidebar }) => {
    const pathName = usePathname();

    return (
        <nav className="space-y-1">
            {Routes.map((route, key) => {
                const isActive = pathName === route.path || pathName?.startsWith(route.path);
                
                return (
                    <SidebarItem
                        key={key}
                        route={route}
                        isActive={isActive}
                        onClick={closeMobileSidebar}
                    />
                );
            })}
        </nav>
    );
};

export default SideBar;
