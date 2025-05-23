"use client";
import { createContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { createClient } from '@/utils/supabase/client';

export const AuthContext = createContext();
const AuthProvider = ({
    children
}) => {
    const router = useRouter();
    const [userDetails, setUserDetails] = useState({});
    const pathName = usePathname();
    const supabase = createClient();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                setUserDetails(session.user);
                Cookies.set('userDetails', JSON.stringify(session.user), { path: '/', expires: 1 });
                Cookies.set('accessToken', session.access_token, { path: '/', expires: 1 });
                
                if (pathName === "/" || pathName === "/create-account") {
                    router.push("/dashboard");
                }
            } else {
                if (pathName !== "/" && pathName !== "/create-account") {
                    router.push("/");
                }
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (session) {
                    setUserDetails(session.user);
                    Cookies.set('userDetails', JSON.stringify(session.user), { path: '/', expires: 1 });
                    Cookies.set('accessToken', session.access_token, { path: '/', expires: 1 });
                } else {
                    setUserDetails({});
                    Cookies.remove("accessToken");
                    Cookies.remove("userDetails");
                }
            }
        );

        return () => {
            subscription?.unsubscribe();
        };
    }, [pathName]);

    return (
        <AuthContext.Provider value={{ userDetails }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
