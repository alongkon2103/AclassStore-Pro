const { WebcastPushConnection } = require('tiktok-live-connector');

let tiktokConnection = null;
let heartbeatTimer = null;
let retryTimer = null;
let isStopping = false;
let retryCount = 0;

const HEARTBEAT_INTERVAL = 15000;
const BASE_RETRY = 10000;
const MAX_RETRY = 60000;

function getRetryDelay() {
  const delay = Math.min(BASE_RETRY * Math.pow(2, retryCount), MAX_RETRY);
  const jitter = Math.random() * 5000;
  retryCount++;
  return delay + jitter;
}

function clearTimers() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
}

function destroyConnection() {
  if (tiktokConnection) {
    try {
      tiktokConnection.removeAllListeners();
      tiktokConnection.disconnect();
    } catch (e) { }
    tiktokConnection = null;
  }
}

// เพิ่ม sessionid parameter

function startConnection(tiktokUsername, middlewareClient, callbacks, sessionData = null) {

  isStopping = false;
  retryCount = 0;

  async function connect() {
    if (isStopping) return;

    clearTimers();
    destroyConnection();

    const options = {
      processInitialData: true,
      enableWebsocketUpgrade: true,
      requestPollingIntervalMs: 2000,
      reconnectEnabled: false,
    };

    // ใส่ทั้ง sessionId และ ttTargetIdc
    if (sessionData?.sessionid && sessionData?.idc) {
      options.sessionId = sessionData.sessionid;
      options.ttTargetIdc = sessionData.idc;
    }

    tiktokConnection = new WebcastPushConnection(tiktokUsername, options);

    tiktokConnection.on('connected', () => {
      retryCount = 0;
      callbacks.onStatus(true, `Live @${tiktokUsername}`);
      middlewareClient.push_event('status', { connected: true }).catch(() => { });
      heartbeatTimer = setInterval(() => {
        middlewareClient.heartbeat().catch(() => { });
      }, HEARTBEAT_INTERVAL);
    });

    tiktokConnection.on('disconnected', () => {
      clearTimers();
      if (!isStopping) {
        const delay = getRetryDelay();
        callbacks.onStatus(false, `Disconnected — retry in ${Math.round(delay / 1000)}s`);
        scheduleRetry(delay);
      }
    });

    tiktokConnection.on('streamEnd', () => {
      callbacks.onStatus(false, 'Stream ended');
      stopConnection();
    });

    tiktokConnection.on('error', (err) => {
      const errMsg = typeof err === 'string' ? err : err?.message || JSON.stringify(err);

      if (
        errMsg.includes('already connected') ||
        errMsg.includes('Websocket') ||
        errMsg.includes('Handshake')
      ) {
        console.warn('[TikTok Minor Error]', errMsg);
        return;
      }

      // Room ID error รอนานขึ้น
      if (errMsg.includes('Failed to retrieve Room ID')) {
        console.warn('[Room ID Error] waiting longer...');
        if (!isStopping) {
          clearTimers();
          const delay = getRetryDelay();
          scheduleRetry(delay);
        }
        return;
      }

      callbacks.onError(`[TikTok] ${errMsg}`);
      if (!isStopping && !tiktokConnection?.connected) {
        clearTimers();
        const delay = getRetryDelay();
        scheduleRetry(delay);
      }
    });

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
            if (!result || result.pushed === false) {
              console.error('[PUSH_EVENT FAILED]');
              return;
            }
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
        const errMsg = err?.message || String(err);
        const delay = getRetryDelay();
        callbacks.onStatus(false, `${errMsg} — retry in ${Math.round(delay / 1000)}s`);
        scheduleRetry(delay);
      }
    }
  }

  function scheduleRetry(delay) {
    if (isStopping) return;
    retryTimer = setTimeout(connect, delay);
  }

  connect();
}

function stopConnection() {
  isStopping = true;
  clearTimers();
  destroyConnection();
}

module.exports = { startConnection, stopConnection };