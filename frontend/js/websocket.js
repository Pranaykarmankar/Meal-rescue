/**
 * Meal-Rescue — WebSocket Connection Manager
 * Auto-reconnect with exponential backoff, dispatches CustomEvents.
 */

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.baseDelay = 1000;
    this.maxDelay = 30000;
    this.connected = false;
  }

  connect() {
    const user = getUser();
    const clientId = user ? user.id : 'guest_' + Math.random().toString(36).substr(2, 9);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${clientId}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        this.connected = true;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type) {
            document.dispatchEvent(new CustomEvent(data.type, { detail: data.data }));
          }
        } catch (e) {
          console.warn('WS parse error:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.connected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('WS error:', err);
        this.ws.close();
      };
    } catch (e) {
      console.warn('WS connection failed:', e);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnect attempts reached');
      return;
    }
    const delay = Math.min(this.baseDelay * Math.pow(2, this.reconnectAttempts), this.maxDelay);
    this.reconnectAttempts++;
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Global instance
const wsManager = new WebSocketManager();

// Connect on page load if not on landing/auth pages
document.addEventListener('DOMContentLoaded', () => {
  wsManager.connect();
});
