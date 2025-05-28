import React from 'react';
import { render, act, waitFor, screen } from '@testing-library/react';
import { NetworkMetricsProvider, NetworkMetricsContext } from '../context/NetworkMetricsProvider';

// Mock component to consume the context
const TestConsumer = () => {
  const context = React.useContext(NetworkMetricsContext);
  return (
    <div>
      <div data-testid="loading">{context.loading.toString()}</div>
      <div data-testid="interfaces">{JSON.stringify(context.interfaces)}</div>
      <div data-testid="selectedInterface">{context.selectedInterface}</div>
      <div data-testid="packetLoss">{context.avgPacketLoss}</div>
      <div data-testid="latency">{context.avgLatency}</div>
      <div data-testid="downloadSpeed">{context.internetSpeed?.download}</div>
      <div data-testid="uploadSpeed">{context.internetSpeed?.upload}</div>
      <div data-testid="isMonitoring">{context.isMonitoring?.toString()}</div>
      <button data-testid="refresh" onClick={context.refreshMetrics}>Refresh</button>
    </div>
  );
};

// Mock the environment variable
process.env.NEXT_PUBLIC_SERVER_URL = 'http://localhost:3030';

// Mock fetch responses
global.fetch = jest.fn();

describe('NetworkMetricsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers(); // Use fake timers to control async operations
  });

  afterEach(() => {
    jest.useRealTimers(); // Restore real timers after each test
  });

  it('fetches interfaces from server on mount', async () => {
    // Mock the interfaces response
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          interfaces: [
            { name: 'eth0', description: 'Ethernet Interface' },
            { name: 'wlan0', description: 'Wireless Interface' }
          ]
        })
      })
    );

    // Mock the metrics response
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          packetLoss: 1.5,
          latency: 45.2,
          downloadSpeed: 95.6,
          uploadSpeed: 25.3,
          packetLossHistory: [{ timestamp: '2023-01-01', value: 1.5 }],
          latencyHistory: [{ timestamp: '2023-01-01', value: 45.2 }],
          speedHistory: [{ timestamp: '2023-01-01', download: 95.6, upload: 25.3 }]
        })
      })
    );

    // Render the provider with a consumer
    let rendered;
    await act(async () => {
      rendered = render(
        <NetworkMetricsProvider>
          <TestConsumer />
        </NetworkMetricsProvider>
      );
    });

    // Verify interfaces fetch was called
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3030/api/interfaces'
    );

    // Advance timers to allow state updates
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Verify metrics fetch was called with the right interface
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3030/api/metrics?interface=eth0'
    );

    // Advance timers again to allow state updates from metrics fetch
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Now check the rendered output
    expect(screen.getByTestId('interfaces').textContent).toContain('eth0');
    expect(screen.getByTestId('selectedInterface').textContent).toBe('eth0');
    expect(screen.getByTestId('packetLoss').textContent).toBe('1.5');
    expect(screen.getByTestId('latency').textContent).toBe('45.2');
    expect(screen.getByTestId('downloadSpeed').textContent).toBe('95.6');
    expect(screen.getByTestId('uploadSpeed').textContent).toBe('25.3');
  });

  it('refreshes metrics when refreshMetrics is called', async () => {
    // Mock the interfaces response
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          interfaces: [{ name: 'eth0', description: 'Ethernet Interface' }]
        })
      })
    );

    // Mock the initial metrics response
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          packetLoss: 1.5,
          latency: 45.2,
          downloadSpeed: 95.6,
          uploadSpeed: 25.3,
          packetLossHistory: [{ timestamp: '2023-01-01', value: 1.5 }],
          latencyHistory: [{ timestamp: '2023-01-01', value: 45.2 }],
          speedHistory: [{ timestamp: '2023-01-01', download: 95.6, upload: 25.3 }]
        })
      })
    );

    // Render the provider with a consumer
    await act(async () => {
      render(
        <NetworkMetricsProvider>
          <TestConsumer />
        </NetworkMetricsProvider>
      );
    });

    // Advance timers to allow state updates
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Verify initial metrics
    expect(screen.getByTestId('packetLoss').textContent).toBe('1.5');
    expect(screen.getByTestId('latency').textContent).toBe('45.2');

    // Mock the refreshed metrics response
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          packetLoss: 2.0,
          latency: 50.0,
          downloadSpeed: 90.0,
          uploadSpeed: 20.0,
          packetLossHistory: [{ timestamp: '2023-01-01', value: 2.0 }],
          latencyHistory: [{ timestamp: '2023-01-01', value: 50.0 }],
          speedHistory: [{ timestamp: '2023-01-01', download: 90.0, upload: 20.0 }]
        })
      })
    );

    // Click refresh button
    await act(async () => {
      screen.getByTestId('refresh').click();
    });

    // Advance timers to allow state updates
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Verify refreshed metrics
    expect(screen.getByTestId('packetLoss').textContent).toBe('2');
    expect(screen.getByTestId('latency').textContent).toBe('50');
    expect(screen.getByTestId('downloadSpeed').textContent).toBe('90');
    expect(screen.getByTestId('uploadSpeed').textContent).toBe('20');

    // Verify the fetch was called with the correct URL
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenLastCalledWith(
      'http://localhost:3030/api/metrics?interface=eth0'
    );
  });

  it('handles fetch errors gracefully', async () => {
    // Mock a failed interfaces fetch
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 500
      })
    );

    // Render the provider with a consumer
    await act(async () => {
      render(
        <NetworkMetricsProvider>
          <TestConsumer />
        </NetworkMetricsProvider>
      );
    });

    // Advance timers to allow state updates
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Verify fallback interfaces are used
    expect(screen.getByTestId('interfaces').textContent).toContain('Ethernet');
    expect(screen.getByTestId('selectedInterface').textContent).toBe('Ethernet');
  });

  it('stops polling when stopPolling is called', async () => {
    // Mock the interfaces response
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          interfaces: [{ name: 'eth0', description: 'Ethernet Interface' }]
        })
      })
    );

    // Mock the initial metrics response
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          packetLoss: 1.5,
          latency: 45.2,
          downloadSpeed: 95.6,
          uploadSpeed: 25.3,
          packetLossHistory: [{ timestamp: '2023-01-01', value: 1.5 }],
          latencyHistory: [{ timestamp: '2023-01-01', value: 45.2 }],
          speedHistory: [{ timestamp: '2023-01-01', download: 95.6, upload: 25.3 }]
        })
      })
    );

    // Create a component with a stop polling button
    const TestConsumerWithStopButton = () => {
      const context = React.useContext(NetworkMetricsContext);
      return (
        <div>
          <div data-testid="isPolling">{context.isPolling?.toString()}</div>
          <button data-testid="stopPolling" onClick={context.stopPolling}>Stop Polling</button>
          <button data-testid="startPolling" onClick={() => context.startPolling(5000)}>Start Polling</button>
        </div>
      );
    };

    // Render the provider with the consumer
    await act(async () => {
      render(
        <NetworkMetricsProvider pollingInterval={1000}>
          <TestConsumerWithStopButton />
        </NetworkMetricsProvider>
      );
    });

    // Advance timers to allow state updates
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // By default, polling should be active
    expect(screen.getByTestId('isPolling').textContent).toBe('true');

    // Mock another metrics response for the polling
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          packetLoss: 2.0,
          latency: 50.0,
          downloadSpeed: 90.0,
          uploadSpeed: 20.0,
          packetLossHistory: [{ timestamp: '2023-01-01', value: 2.0 }],
          latencyHistory: [{ timestamp: '2023-01-01', value: 50.0 }],
          speedHistory: [{ timestamp: '2023-01-01', download: 90.0, upload: 20.0 }]
        })
      })
    );

    // Advance timers to trigger polling
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Verify polling happened
    expect(global.fetch).toHaveBeenCalledTimes(3);

    // Now stop polling
    await act(async () => {
      screen.getByTestId('stopPolling').click();
    });

    // Verify polling is stopped
    expect(screen.getByTestId('isPolling').textContent).toBe('false');

    // Advance timers again
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Verify no additional fetch calls were made
    expect(global.fetch).toHaveBeenCalledTimes(3);

    // Now restart polling with a custom interval
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          packetLoss: 3.0,
          latency: 55.0,
          downloadSpeed: 85.0,
          uploadSpeed: 15.0,
          packetLossHistory: [{ timestamp: '2023-01-01', value: 3.0 }],
          latencyHistory: [{ timestamp: '2023-01-01', value: 55.0 }],
          speedHistory: [{ timestamp: '2023-01-01', download: 85.0, upload: 15.0 }]
        })
      })
    );

    // Start polling with a custom interval
    await act(async () => {
      screen.getByTestId('startPolling').click();
    });

    // Verify polling is active again
    expect(screen.getByTestId('isPolling').textContent).toBe('true');

    // Advance timers to trigger the new polling interval
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    // Verify a new fetch call was made
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });
});



