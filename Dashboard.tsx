import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Megaphone, 
  Gift,
  MessageSquare,
  Heart,
  UserPlus
} from 'lucide-react';

interface LogEntry {
  id: number;
  time: string;
  user: string;
  message: string;
  type: 'gift' | 'comment' | 'like' | 'follow';
  count?: number;
  giftName?: string;
}

const Dashboard: React.FC = () => {
  const [username, setUsername] = useState('');
  const [connected, setConnected] = useState(false);

  // Separate states for 4 log categories
  const [giftLogs, setGiftLogs] = useState<LogEntry[]>([]);
  const [commentLogs, setCommentLogs] = useState<LogEntry[]>([]);
  const [likeLogs, setLikeLogs] = useState<LogEntry[]>([]);
  const [followLogs, setFollowLogs] = useState<LogEntry[]>([]);

  // Refs for auto-scroll
  const giftRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLDivElement>(null);
  const likeRef = useRef<HTMLDivElement>(null);
  const followRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  };

  useEffect(() => {
    const thaiUsers = ['น้องมายด์_FC', 'สายเปย์_888', 'Gamer_TH', 'LuckyBoy', 'สมชาย_คนสู้', 'TiktokFan_TH', 'น้องแก้ม', 'พี่กอล์ฟ', 'สายลุย', 'สู้ๆครับพี่'];
    const gifts = ['Rose', 'Heart', 'TikTok', 'Diamond', 'Ice Cream', 'Panda'];
    const comments = ['สวัสดีครับผม', 'สู้ๆครับพี่', 'สุดยอดเลย', 'ชอบมากครับ', 'มาแว้ววว', 'FC ครับผม', 'ใจดีมากเลย', 'แชร์ให้แล้วนะ', 'กดใจให้แล้ว', 'ขอเพลงหน่อย'];

    const generateLogs = (type: 'gift' | 'comment' | 'like' | 'follow'): LogEntry[] => {
      return Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        time: `14:20:${String(i).padStart(2, '0')}`,
        user: thaiUsers[Math.floor(Math.random() * thaiUsers.length)],
        type,
        message: type === 'comment' ? comments[Math.floor(Math.random() * comments.length)] : '',
        giftName: type === 'gift' ? gifts[Math.floor(Math.random() * gifts.length)] : undefined,
        count: (type === 'gift' || type === 'like') ? Math.floor(Math.random() * 10) + 1 : undefined
      }));
    };

    setGiftLogs(generateLogs('gift'));
    setCommentLogs(generateLogs('comment'));
    setLikeLogs(generateLogs('like'));
    setFollowLogs(generateLogs('follow'));
  }, []);

  useEffect(() => scrollToBottom(giftRef), [giftLogs]);
  useEffect(() => scrollToBottom(commentRef), [commentLogs]);
  useEffect(() => scrollToBottom(likeRef), [likeLogs]);
  useEffect(() => scrollToBottom(followRef), [followLogs]);

  const handleConnect = () => {
    if (username) {
      window.electron.send('tiktok:connect', username);
      setConnected(!connected);
    }
  };

  const LogPanel = ({ 
    title, 
    icon, 
    color, 
    logs, 
    scrollRef, 
    renderLine 
  }: { 
    title: string, 
    icon: React.ReactNode, 
    color: string, 
    logs: LogEntry[], 
    scrollRef: React.RefObject<HTMLDivElement>,
    renderLine: (log: LogEntry) => React.ReactNode
  }) => (
    <div className="flex flex-col bg-surface border border-border rounded-xl overflow-hidden h-full">
      <div className="p-3 border-b border-[#1e1e28] flex items-center justify-between bg-surface2/30">
        <div className={`flex items-center gap-2 ${color}`}>
          {icon}
          <h3 className="text-[11px] font-bold uppercase tracking-wider">{title}</h3>
        </div>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg border border-[#1e1e28] ${color}`}>
          {logs.length}
        </span>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[10px] custom-scrollbar"
      >
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 p-1 rounded hover:bg-surface2/50 transition-colors group cursor-default">
            <span className="text-text3 shrink-0">[{log.time}]</span>
            {renderLine(log)}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-20 border-b border-[#1e1e28] px-6 flex items-center justify-between bg-surface/50 shrink-0">
        <div className="flex flex-col gap-1 w-80">
          <div className="relative">
            <input
              type="text"
              placeholder="@username"
              className="w-full h-10 pr-24"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button 
              onClick={handleConnect}
              className={`absolute right-1 top-1 h-8 px-4 rounded-md font-bold text-xs transition-all ${connected ? 'bg-red/10 text-red hover:bg-red/20' : 'bg-purple text-white hover:bg-purple2'}`}
            >
              {connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-[10px] text-text3 font-bold uppercase tracking-widest">
              {connected ? 'Streaming Live Data' : 'Waiting for connection'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-text3 font-bold uppercase tracking-widest">Connected Account</span>
            <span className="text-sm font-bold text-text">{connected ? username : 'None'}</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${connected ? 'bg-green/10 text-green border border-border2' : 'bg-red/10 text-red border border-border2'}`}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Panel */}
        <div className="w-64 border-r border-border p-4 flex flex-col gap-4 overflow-y-auto shrink-0 bg-surface2/20">
          <div className="bg-amber/5 border border-border2 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber">
              <Megaphone size={16} />
              <h3 className="text-[10px] font-bold uppercase tracking-wider">Announcement</h3>
            </div>
            <p className="text-[11px] text-amber/80 leading-relaxed font-medium">
              ยินดีต้อนรับสู่ TikLive Pro v1.2.0! 
            </p>
          </div>
        </div>

        {/* Main Content: 2x2 Grid */}
        <div className="flex-1 flex flex-col overflow-hidden bg-bg p-4 gap-4">
          <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4 overflow-hidden">
            <LogPanel 
              title="Gifts" 
              icon={<Gift size={14} />} 
              color="text-purple" 
              logs={giftLogs} 
              scrollRef={giftRef}
              renderLine={(log) => (
                <>
                  <span className="text-purple shrink-0 font-bold">{log.user}:</span>
                  <span className="text-text2">ส่ง {log.giftName}</span>
                  <span className="text-purple font-bold">× {log.count}</span>
                </>
              )}
            />
            <LogPanel 
              title="Comments" 
              icon={<MessageSquare size={14} />} 
              color="text-blue-400" 
              logs={commentLogs} 
              scrollRef={commentRef}
              renderLine={(log) => (
                <>
                  <span className="text-blue-400 shrink-0 font-bold">{log.user}:</span>
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
                  <span className="text-text2">กด Like × {log.count}</span>
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
                  <span className="text-text2">ติดตามแล้ว</span>
                </>
              )}
            />
          </div>

          {/* Bottom Stats Bar */}
          <div className="h-12 bg-surface border border-border rounded-xl px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <span className="text-text3">Gifts Total:</span>
                <span className="text-purple font-mono text-sm">1,420</span>
              </div>
              <div className="w-px h-4 bg-[#1e1e28]" />
              <div className="flex items-center gap-2">
                <span className="text-text3">Likes Total:</span>
                <span className="text-pink font-mono text-sm">24,500</span>
              </div>
              <div className="w-px h-4 bg-[#1e1e28]" />
              <div className="flex items-center gap-2">
                <span className="text-text3">Viewers:</span>
                <span className="text-green font-mono text-sm">852</span>
              </div>
            </div>
            <div className="text-[9px] text-text3 font-mono">TikLive Pro v1.2.0</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
