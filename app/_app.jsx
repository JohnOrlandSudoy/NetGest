import { NetworkMetricsProvider } from '@/context/NetworkMetricsProvider';
import '@/styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <NetworkMetricsProvider>
      <Component {...pageProps} />
    </NetworkMetricsProvider>
  );
}

export default MyApp; 