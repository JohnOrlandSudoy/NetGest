import { Inter } from 'next/font/google';
import { ToastContainer  } from 'react-toastify';
import { ErrorBoundary } from '@/utils/errorBoundary';
import AuthProvider from "@/context/AuthProvider";
import { NetworkMetricsProvider } from "@/context/NetworkMetricsProvider";
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';
import SocketErrorSuppressor from '@/components/SocketErrorSuppressor';
import ErrorSuppressor from '@/components/ErrorSuppressor';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'NetGest - Network Management Dashboard',
  description: 'Monitor and manage your network performance',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorSuppressor>
          <SocketErrorSuppressor />
          <AuthProvider>
            <NetworkMetricsProvider>
              {children}
              <ToastContainer position="top-right" />
            </NetworkMetricsProvider>
          </AuthProvider>
        </ErrorSuppressor>
      </body>
    </html>
  );
}

