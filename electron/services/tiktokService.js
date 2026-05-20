const { WebcastPushConnection } = require('tiktok-live-connector');

let tiktokConnection = null;
let heartbeatTimer = null;
let retryTimer = null;
let isStopping = false;

const RETRY_INTERVAL = 30000;
const HEARTBEAT_INTERVAL = 15000;

function startConnection(tiktokUsername, middlewareClient, callbacks) {
  isStopping = false;

  async function connect() {
    if (isStopping) return;

    // Clean up existing connection if any
    if (tiktokConnection) {
      try { tiktokConnection.disconnect(); } catch (e) { }
      tiktokConnection = null;
    }

    tiktokConnection = new WebcastPushConnection(tiktokUsername, {
      processInitialData: false,
      enableWebsocketUpgrade: true,
      requestPollingIntervalMs: 2000
    });
    tiktokConnection.on('connected', (state) => {
      callbacks.onStatus(true, `Live @${tiktokUsername}`);
      middlewareClient.push_event('status', { connected: true }).catch(() => { });

      // Start Heartbeat
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        middlewareClient.heartbeat().catch(() => { });
      }, HEARTBEAT_INTERVAL);
    });

    tiktokConnection.on('disconnected', () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (!isStopping) {
        callbacks.onStatus(false, `Disconnected — retry in ${RETRY_INTERVAL / 1000}s`);
        scheduleRetry();
      }
    });

    tiktokConnection.on('streamEnd', () => {
      callbacks.onStatus(false, 'Stream ended');
      stopConnection();
    });

    tiktokConnection.on('error', (err) => {
      // Normalize error message
      let errMsg = '';
      if (typeof err === 'string') {
        errMsg = err;
      } else if (err && err.message) {
        errMsg = err.message;
      } else {
        try {
          errMsg = JSON.stringify(err);
        } catch (e) {
          errMsg = String(err);
        }
      }

      // Don't show minor background errors if we are still connected
      if (errMsg.includes('already connected') || errMsg.includes('Websocket') || errMsg.includes('Handshake')) {
        console.warn('[TikTok Minor Error]', errMsg);
        return;
      }

      callbacks.onError(`[TikTok] ${errMsg}`);
      if (!isStopping && !tiktokConnection?.connected) {
        scheduleRetry();
      }
    });

    // Events
    tiktokConnection.on('gift', (data) => {
      const diamondCount = data.diamondCount || 0;
      if (diamondCount > 0 || data.repeatEnd) {
        const eventData = {
          id: data.msgId,
          giftId: data.giftId,
          giftName: data.giftName,
          username: data.uniqueId,
          nickname: data.nickname,
          diamond: diamondCount,
          diamondCount: diamondCount,
          repeatCount: data.repeatCount,
          totalValue: diamondCount * data.repeatCount,
          repeatEnd: data.repeatEnd,
          profilePictureUrl: data.profilePictureUrl,
          timestamp: new Date().toISOString()
        };
        middlewareClient.push_event('gift', eventData)
          .then(result => {
            console.log('[DEBUG RESULT]', JSON.stringify(result)); // ✅ เพิ่มตรงนี้
            if (!result) {
              console.error('[PUSH_EVENT FAILED] server rejected gift');
              return;
            }
            if (result.pushed === false) return;
            callbacks.onGift(eventData);
          })
          .catch(err => console.error('[PUSH_EVENT ERROR]', err.message));
      }
    });

    tiktokConnection.on('chat', (data) => {
      middlewareClient.push_event('chat', {
        username: data.uniqueId,
        nickname: data.nickname,
        comment: data.comment,
        profilePictureUrl: data.profilePictureUrl
      }).catch(() => { });
      callbacks.onChat?.(data);
    });

    tiktokConnection.on('like', (data) => {
      middlewareClient.push_event('like', {
        username: data.uniqueId,
        nickname: data.nickname,
        likeCount: data.likeCount,
        totalLikeCount: data.totalLikeCount,
        profilePictureUrl: data.profilePictureUrl
      }).catch(() => { });
      callbacks.onLike?.(data);
    });

    tiktokConnection.on('follow', (data) => {
      middlewareClient.push_event('follow', {
        username: data.uniqueId,
        nickname: data.nickname,
        profilePictureUrl: data.profilePictureUrl
      }).catch(() => { });
      callbacks.onFollow?.(data);
    });

    try {
      callbacks.onStatus(false, `Connecting to @${tiktokUsername}...`);
      await tiktokConnection.connect();
    } catch (err) {
      if (!isStopping) {
        const errMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
        callbacks.onStatus(false, `${errMsg} — retry in ${RETRY_INTERVAL / 1000}s`);
        scheduleRetry();
      }
    }
  }

  function scheduleRetry() {
    if (retryTimer) clearTimeout(retryTimer);
    if (!isStopping) {
      retryTimer = setTimeout(connect, RETRY_INTERVAL);
    }
  }

  connect();
}

function stopConnection() {
  isStopping = true;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (retryTimer) clearTimeout(retryTimer);
  if (tiktokConnection) {
    try { tiktokConnection.disconnect(); } catch (e) { }
    tiktokConnection = null;
  }
}

module.exports = { startConnection, stopConnection };
