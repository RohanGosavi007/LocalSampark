const { createClient } = require('@supabase/supabase-js');
const logger = require('../../../config/logger');

let supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'public-anon-key';

let supabase = null;

try {
  supabase = createClient(supabaseUrl, supabaseKey);
  logger.info('✅ Supabase Realtime client initialized');
} catch (error) {
  logger.error('Failed to initialize Supabase client: ' + error.message);
}

/**
 * Broadcast an event to a specific Supabase Realtime channel
 * @param {string} channelName The name of the channel (e.g., 'shop:123', 'room:400001')
 * @param {string} eventName The event name (e.g., 'order:new', 'sos:alert')
 * @param {object} payload The data payload to send
 */
const broadcast = async (channelName, eventName, payload) => {
  if (!supabase) {
    logger.warn(`Supabase not initialized, skipping broadcast to ${channelName}`);
    return;
  }
  
  try {
    const backendChannel = supabase.channel(channelName);
    backendChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await backendChannel.send({
          type: 'broadcast',
          event: eventName,
          payload: payload,
        });
        // cleanup after sending to avoid memory leaks of too many channels
        supabase.removeChannel(backendChannel);
      }
    });
  } catch (error) {
    logger.error(`Error broadcasting ${eventName} to ${channelName}: ${error.message}`);
  }
};

module.exports = {
  supabase,
  broadcast,
};
