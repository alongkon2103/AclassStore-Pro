import { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';

export default function UpdateNotice() {
  const [available, setAvailable] = useState<boolean>(false);
  const [downloaded, setDownloaded] = useState<boolean>(false);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    (window as any).electron.on('update:available', () => setAvailable(true));
    (window as any).electron.on('update:downloaded', () => setDownloaded(true));
    (window as any).electron.on('update:progress', (p: { percent: number }) => 
      setProgress(Math.round(p.percent))
    );
  }, []);

  if (!available) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 bg-surface border border-border rounded-xl shadow-lg p-4 w-64 flex flex-col gap-3">
      
      <div className="flex items-center gap-2">
        <Download size={14} className="text-blue shrink-0" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-text">
          {downloaded ? 'อัพเดทพร้อมแล้ว' : 'กำลังดาวน์โหลดอัพเดท'}
        </span>
      </div>

      {!downloaded && progress !== null && (
        <div className="flex flex-col gap-1.5">
          <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden border border-border/50">
            <div
              className="h-full bg-blue rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-text3 text-right">{progress}%</span>
        </div>
      )}

      {downloaded && (
        <button
          onClick={() => (window as any).electron.invoke('update:install')}
          className="flex items-center justify-center gap-2 h-8 px-4 rounded-lg font-bold text-xs bg-blue text-white hover:bg-blue/80 transition-all cursor-pointer"
        >
          <RefreshCw size={12} />
          ติดตั้งและรีสตาร์ท
        </button>
      )}

    </div>
  );
}