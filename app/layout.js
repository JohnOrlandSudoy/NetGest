import AuthProvider from "@/context/AuthProvider";
import { NetworkMetricsProvider } from "@/context/NetworkMetricsProvider";
import "./globals.css";
import { ToastContainer  } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorSuppressor from "@/components/ErrorSuppressor";

export const metadata = {
    title: "NetGest",
    description: "Network Management Dashboard",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    <NetworkMetricsProvider>
                        <ErrorSuppressor />
                        <ToastContainer/>
                        {children}
                    </NetworkMetricsProvider>
                </AuthProvider>
            </body>
        </html>
    );
};
