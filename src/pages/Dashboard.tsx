import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Gift,
  MessageSquare,
  Heart,
  UserPlus,
  AlertCircle,
  X,
  Settings
} from 'lucide-react';

type AppStatus = 'OFFLINE' | 'WAIT' | 'LIVE';

interface LogEntry {
  id: string | number;
  time: string;
  user?: string;
  message?: string;
  type: 'gift' | 'comment' | 'like' | 'follow' | 'system' | 'error';
  count?: number;
  giftName?: string;
  diamond?: number;
}

interface StatusPayload {
  connected: boolean;
  message: string;
  state?: AppStatus;
}

const Dashboard: React.FC = () => {
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setStatus] = useState<AppStatus>('OFFLINE');

  useEffect(() => {
    // Load saved license key
    const savedKey = localStorage.getItem('license_key');
    if (savedKey) {
      setLicenseKey(savedKey);
    }
  }, []);

  const [statusMessage, setStatusMessage] = useState('Waiting for connection');
  const [tiktokUser, setTiktokUser] = useState('');

  const [totals, setTotals] = useState({ gifts: 0, likes: 0 });

  const [giftLogs, setGiftLogs] = useState<LogEntry[]>([]);
  const [commentLogs, setCommentLogs] = useState<LogEntry[]>([]);
  const [likeLogs, setLikeLogs] = useState<LogEntry[]>([]);
  const [followLogs, setFollowLogs] = useState<LogEntry[]>([]);
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);

  const giftRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLDivElement>(null);
  const likeRef = useRef<HTMLDivElement>(null);
  const followRef = useRef<HTMLDivElement>(null);
  const systemRef = useRef<HTMLDivElement>(null);

  const addSystemLog = (type: 'system' | 'error', message: string) => {
    const newLog: LogEntry = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
      message,
      type
    };
    setSystemLogs(prev => [newLog, ...prev.slice(0, 199)]);
  };

  useEffect(() => {
    const offStatus = (window as any).electron.on('tiktok:status', (data: StatusPayload) => {
      console.log('Status Update:', data); // Debug log เพื่อดูว่าค่าที่ส่งมาคืออะไร
      
      if (data.state === 'LIVE' || data.connected === true) {
        setStatus('LIVE');
      } else if (data.state === 'WAIT') {
        setStatus('WAIT');
      } else {
        setStatus('OFFLINE');
      }

      setStatusMessage(data.message);
      addSystemLog('system', data.message);

      if (data.connected) {
        // ดึงชื่อหลัง @ ออกมาจนจบข้อความ หรือจนเจอช่องว่าง
        const match = data.message.match(/@([a-zA-Z0-9._-]+)/);
        if (match) setTiktokUser(match[1]);
      }
    });

    const offGift = (window as any).electron.on('tiktok:gift', (data: any) => {
      setStatus('LIVE'); // Force LIVE
      const log: LogEntry = {
        id: data.id || Date.now() + Math.random(),
        time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        user: data.nickname || data.username,
        giftName: data.giftName,
        count: data.repeatCount,
        diamond: data.diamond,
        type: 'gift'
      };
      setGiftLogs(prev => [log, ...prev.slice(0, 99)]);
      if (data.repeatEnd) {
        setTotals(prev => ({ ...prev, gifts: prev.gifts + (data.totalValue || 0) }));
      }
    });

    const offChat = (window as any).electron.on('tiktok:chat', (data: any) => {
      setStatus('LIVE');
      const log: LogEntry = {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        user: data.nickname || data.username,
        message: data.comment,
        type: 'comment'
      };
      setCommentLogs(prev => [log, ...prev.slice(0, 99)]);
    });

    const offLike = (window as any).electron.on('tiktok:like', (data: any) => {
      setStatus('LIVE');
      const log: LogEntry = {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        user: data.nickname || data.username,
        count: data.likeCount,
        message: `Liked x${data.likeCount}`,
        type: 'like'
      };
      setLikeLogs(prev => [log, ...prev.slice(0, 99)]);
      setTotals(prev => ({ ...prev, likes: data.totalLikeCount || prev.likes }));
    });

    const offFollow = (window as any).electron.on('tiktok:follow', (data: any) => {
      setStatus('LIVE');
      const log: LogEntry = {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        user: data.nickname || data.username,
        message: 'Followed',
        type: 'follow'
      };
      setFollowLogs(prev => [log, ...prev.slice(0, 99)]);
    });

    const offError = (window as any).electron.on('tiktok:error', (message: string) => {
      addSystemLog('error', message);
    });

    return () => {
      offStatus();
      offGift();
      offChat();
      offLike();
      offFollow();
      offError();
    };
  }, []);

  const handleStart = async () => {
    if (!licenseKey.trim()) {
      addSystemLog('error', 'License key is required');
      return;
    }

    setStatus('WAIT');
    addSystemLog('system', 'Validating license...');

    const res = await (window as any).electron.invoke('license:activate', licenseKey);
    if (!res.ok) {
      setStatus('OFFLINE');
      addSystemLog('error', res.error || 'Activation failed');
      return;
    }

    // Save license key on success
    localStorage.setItem('license_key', licenseKey);

    setTiktokUser(res.username);
    addSystemLog('system', `License activated for @${res.username}`);
    
    // Set to WAIT before connecting, then let the listener handle the rest
    setStatus('WAIT'); 
    
    const connRes = await (window as any).electron.invoke('tiktok:connect');
    if (!connRes.ok) {
      setStatus('OFFLINE');
      addSystemLog('error', connRes.error || 'Connection failed');
    }
  };

  const handleStop = async () => {
    await (window as any).electron.invoke('tiktok:disconnect');
    setStatus('OFFLINE');
    setTiktokUser('');
    setTotals({ gifts: 0, likes: 0 });
    setStatusMessage('Monitoring stopped');
  };

  const closeApp = () => {
    (window as any).electron.invoke('app:close');
  };

  const LogPanel = ({ 
    title, 
    icon, 
    color, 
    logs, 
    scrollRef, 
    renderLine 
  }: { 
    title: string;
    icon: React.ReactNode;
    color: string;
    logs: LogEntry[];
    scrollRef: React.RefObject<any>;
    renderLine: (log: LogEntry) => React.ReactNode;
  }) => (
    <div className="flex flex-col bg-surface border border-border rounded-xl overflow-hidden h-full shadow-lg">
      <div className="p-3 border-b border-border/50 flex items-center justify-between bg-surface2/30">
        <div className={`flex items-center gap-2 ${color}`}>
          {icon}
          <h3 className="text-[11px] font-bold uppercase tracking-wider">{title}</h3>
        </div>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg border border-border/30 ${color}`}>
          {logs.length}
        </span>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[10px] custom-scrollbar"
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text3/40 italic">
            No data
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-2 p-1 rounded hover:bg-surface2/50 transition-colors group cursor-default">
              <span className="text-text3 shrink-0">[{log.time}]</span>
              {renderLine(log)}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg">
      {/* Header */}
      <div className="h-24 border-b border-border px-6 flex items-center justify-between bg-surface/80 backdrop-blur-md shrink-0 drag-region">
        <div className="flex flex-col gap-1 w-96 no-drag">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-[3px] text-blue uppercase">A CLASS STORE</span>
            <div className="h-3 w-px bg-border/50" />
            <span className="text-[10px] text-text2 uppercase tracking-wider">TikLive Pro Monitor</span>
          </div>
          <div className="relative">
            <input
              type="password"
              placeholder="Enter License Key"
              className="w-full h-10 pr-24 bg-bg border border-border rounded-lg px-3 text-sm focus:border-blue outline-none transition-all disabled:opacity-50"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              disabled={status !== 'OFFLINE'}
            />
            {status === 'OFFLINE' ? (
              <button 
                onClick={handleStart}
                className="absolute right-1 top-1 h-8 px-4 rounded-md font-bold text-xs bg-blue text-white hover:bg-blue/80 transition-all cursor-pointer"
              >
                START
              </button>
            ) : (
              <button 
                onClick={handleStop}
                className="absolute right-1 top-1 h-8 px-4 rounded-md font-bold text-xs bg-red/10 text-red border border-red/20 hover:bg-red/20 transition-all cursor-pointer"
              >
                STOP
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-8 no-drag">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-text3 font-bold uppercase tracking-widest">Target Account</span>
            <span className="text-sm font-bold text-text">
              {status === 'LIVE' ? `@${tiktokUser}` : 'Disconnected'}
            </span>
          </div>

          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm transition-all ${
            status === 'LIVE' ? 'bg-green/10 text-green border-green/30' :
            status === 'WAIT' ? 'bg-amber/10 text-amber border-amber/30 animate-pulse' :
            'bg-red/10 text-red border-red/30'
          }`}>
            <span className={status === 'LIVE' ? 'animate-pulse' : ''}>●</span>
            {status}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={closeApp}
              className="p-2 hover:bg-red/10 hover:text-red rounded-lg transition-colors text-text3"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-5 gap-5">
        <div className="w-80 shrink-0">
          <LogPanel
            title="System & Errors"
            icon={<AlertCircle size={14} />}
            color="text-text"
            logs={systemLogs}
            scrollRef={systemRef}
            renderLine={(log) => (
              <span className={log.type === 'error' ? 'text-red font-bold' : 'text-text2'}>
                {log.message}
              </span>
            )}
          />
        </div>

        <div className="flex-1 flex flex-col gap-5 overflow-hidden">
          <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-5 overflow-hidden">
            <LogPanel
              title="Gifts"
              icon={<Gift size={14} />}
              color="text-purple"
              logs={giftLogs}
              scrollRef={giftRef}
              renderLine={(log) => (
                <>
                  <span className="text-purple shrink-0 font-bold">{log.user}:</span>
                  <span className="text-text2">Sent {log.giftName}</span>
                  <span className="text-purple font-bold">×{log.count}</span>
                  {log.diamond !== undefined && (
                    <span className="text-amber text-[9px] ml-auto">{log.diamond} 💎</span>
                  )}
                </>
              )}
            />
            <LogPanel
              title="Comments"
              icon={<MessageSquare size={14} />}
              color="text-cyan"
              logs={commentLogs}
              scrollRef={commentRef}
              renderLine={(log) => (
                <>
                  <span className="text-cyan shrink-0 font-bold">{log.user}:</span>
                  <span className="text-text whitespace-pre-wrap">{log.message}</span>
                </>
              )}
            />
            <LogPanel
              title="Likes"
              icon={<Heart size={14} />}
              color="text-pink"
              logs={likeLogs}
              scrollRef={likeRef}
              renderLine={(log) => (
                <>
                  <span className="text-pink shrink-0 font-bold">{log.user}:</span>
                  <span className="text-text2">{log.message}</span>
                  <span className="text-pink font-bold ml-auto">×{log.count}</span>
                </>
              )}
            />
            <LogPanel
              title="Follows"
              icon={<UserPlus size={14} />}
              color="text-amber"
              logs={followLogs}
              scrollRef={followRef}
              renderLine={(log) => (
                <>
                  <span className="text-amber shrink-0 font-bold">{log.user}:</span>
                  <span className="text-text2">{log.message}</span>
                </>
              )}
            />
          </div>

          <div className="h-14 bg-surface border border-border rounded-xl px-6 flex items-center justify-between shrink-0 shadow-inner no-drag">
            <div className="flex items-center gap-10 text-[11px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-3">
                <span className="text-text3">Total Value</span>
                <span className="text-purple font-mono text-base">{totals.gifts.toLocaleString()}</span>
              </div>
              <div className="w-px h-5 bg-border/50" />
              <div className="flex items-center gap-3">
                <span className="text-text3">Total Likes</span>
                <span className="text-pink font-mono text-base">{totals.likes.toLocaleString()}</span>
              </div>
              <div className="w-px h-4 bg-border/50" />
              <div className="flex items-center gap-3">
                <span className="text-text2 font-mono text-[10px]">{statusMessage}</span>
              </div>
            </div>
            <div className="text-[10px] text-text3/50 font-mono">A CLASS STORE PRO</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;