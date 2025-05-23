import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Save network metrics to Supabase
 * @param {Object} metrics - Network metrics data
 * @param {string} interfaceName - Network interface name
 * @returns {Promise} - Supabase insert result
 */
export const saveNetworkMetrics = async (metrics, interfaceName) => {
  try {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    
    // Check for authentication error
    if (authError) {
      console.error('Authentication error:', authError.message);
      return null;
    }
    
    // Ensure we have a valid user ID
    const userId = userData?.user?.id;
    if (!userId) {
      console.error('No authenticated user found');
      return null;
    }
    
    // Insert data with proper error handling
    const { data, error } = await supabase
      .from('network_metrics_history')
      .insert({
        interface_name: interfaceName,
        latency: metrics.latency || 0,
        packet_loss: metrics.packetLoss || 0,
        download_speed: metrics.download || 0,
        upload_speed: metrics.upload || 0,
        user_id: userId,
        source: 'dashboard'
      });
      
    if (error) {
      console.error('Supabase insert error:', error.message, error.details, error.hint);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error saving network metrics:', error);
    // Return empty object instead of null to prevent further errors
    return {};
  }
};

/**
 * Get historical network metrics from Supabase
 * @param {string} interfaceName - Network interface name
 * @param {number} hours - Number of hours of history to retrieve
 * @returns {Promise<Object>} - Historical metrics data
 */
export const getNetworkMetricsHistory = async (interfaceName, hours = 24) => {
  try {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    
    // Check for authentication error
    if (authError) {
      console.error('Authentication error:', authError.message);
      return null;
    }
    
    // Ensure we have a valid user ID
    const userId = userData?.user?.id;
    if (!userId) {
      console.error('No authenticated user found');
      return null;
    }
    
    // Calculate the timestamp for the start of the period
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);
    
    // Query the database with proper error handling
    const { data, error } = await supabase
      .from('network_metrics_history')
      .select('*')
      .eq('interface_name', interfaceName)
      .eq('user_id', userId)
      .gte('timestamp', startTime.toISOString())
      .order('timestamp', { ascending: true });
      
    if (error) {
      console.error('Supabase query error:', error.message, error.details, error.hint);
      throw error;
    }
    
    // If no data, return empty arrays to prevent errors
    if (!data || data.length === 0) {
      return {
        packetLoss: [],
        latency: [],
        speed: [],
        upload: []
      };
    }
    
    // Format the data for the charts
    const formattedData = {
      packetLoss: data.map(item => ({
        timestamp: item.timestamp,
        value: parseFloat(item.packet_loss) || 0
      })),
      latency: data.map(item => ({
        timestamp: item.timestamp,
        value: parseFloat(item.latency) || 0
      })),
      speed: data.map(item => ({
        timestamp: item.timestamp,
        value: parseFloat(item.download_speed) || 0
      })),
      upload: data.map(item => ({
        timestamp: item.timestamp,
        value: parseFloat(item.upload_speed) || 0
      }))
    };
    
    return formattedData;
  } catch (error) {
    console.error('Error getting network metrics history:', error);
    // Return empty data structure instead of null
    return {
      packetLoss: [],
      latency: [],
      speed: [],
      upload: []
    };
  }
};

/**
 * Save network interface history to Supabase
 * @param {Object} historyData - Network interface history data
 * @returns {Promise} - Supabase insert result
 */
export const saveNetworkInterfaceHistory = async (historyData) => {
  try {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    
    // Check for authentication error
    if (authError) {
      console.error('Authentication error:', authError.message);
      return null;
    }
    
    // Ensure we have a valid user ID
    const userId = userData?.user?.id;
    if (!userId) {
      console.error('No authenticated user found');
      return null;
    }
    
    // Insert data with proper error handling
    const { data, error } = await supabase
      .from('network_interface_history')
      .insert({
        interface_name: historyData.interfaceName,
        status: historyData.status,
        ip_address: historyData.ipAddress,
        mac_address: historyData.macAddress,
        tx_bytes: historyData.txBytes,
        rx_bytes: historyData.rxBytes,
        tx_packets: historyData.txPackets,
        rx_packets: historyData.rxPackets,
        user_id: userId,
        timestamp: new Date().toISOString()
      });
      
    if (error) {
      console.error('Supabase insert error:', error.message, error.details, error.hint);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error saving network interface history:', error);
    // Return empty object instead of null to prevent further errors
    return {};
  }
};

/**
 * Get network interface history from Supabase
 * @param {string} interfaceName - Network interface name (optional)
 * @param {number} days - Number of days of history to retrieve
 * @returns {Promise<Array>} - Historical interface data
 */
export const getNetworkInterfaceHistory = async (interfaceName = null, days = 30) => {
  try {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    
    // Check for authentication error
    if (authError) {
      console.error('Authentication error:', authError.message);
      return [];
    }
    
    // Ensure we have a valid user ID
    const userId = userData?.user?.id;
    if (!userId) {
      console.error('No authenticated user found');
      return [];
    }
    
    // Calculate the timestamp for the start of the period
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - days);
    
    // Build the query
    let query = supabase
      .from('network_interface_history')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startTime.toISOString())
      .order('timestamp', { ascending: false });
    
    // Add interface filter if provided
    if (interfaceName) {
      query = query.eq('interface_name', interfaceName);
    }
    
    // Execute the query
    const { data, error } = await query;
      
    if (error) {
      console.error('Supabase query error:', error.message, error.details, error.hint);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error getting network interface history:', error);
    return [];
  }
};


