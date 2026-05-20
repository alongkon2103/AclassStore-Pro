const fetch = require('node-fetch');

class MiddlewareClient {
  constructor(serverUrl, token, username) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.token = token;
    this.username = username;
  }

  async _req(method, path, body = null, params = null) {
    let url = `${this.serverUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    let lastError;
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return await response.json().catch(() => true);
        const text = await response.text();
        lastError = new Error(`HTTP ${response.status}: ${text}`);
      } catch (err) {
        lastError = err;
      }
      // Only retry on server errors or network issues, not 400s
      if (lastError.message.includes('HTTP 4') && !lastError.message.includes('408')) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
    }
    console.error(`Middleware ${method} ${path} failed:`, lastError.message);
    return false;
  }

  register() {
    return this._req('POST', '/register', { username: this.username });
  }

  push_event(type, data) {
    return this._req('POST', '/push-event', { 
      username: this.username, 
      type: type, 
      data: data 
    });
  }

  heartbeat() {
    return this._req('POST', '/heartbeat', { username: this.username });
  }

  stop() {
    return this._req('DELETE', '/stop', null, { username: this.username });
  }

  close() {
    // No session to close in node-fetch
  }
}

module.exports = { MiddlewareClient };
