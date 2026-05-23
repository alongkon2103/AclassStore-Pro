import { useEffect, useState } from 'react';

export default function UpdateNotice() {
  const [available, setAvailable] = useState<boolean>(false);
  const [downloaded, setDownloaded] = useState<boolean>(false);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    window.electron.onUpdateAvailable(() => setAvailable(true));
    window.electron.onUpdateDownloaded(() => setDownloaded(true));
    window.electron.onUpdateProgress((p: { percent: number }) => setProgress(Math.round(p.percent)));
  }, []);

  if (!available) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-xl shadow-lg z-50">
      {downloaded ? (
        <>
          <p className="font-bold">อัพเดทพร้อมแล้ว!</p>
          <button
            onClick={() => window.electron.installUpdate()}
            className="mt-2 bg-white text-blue-600 px-4 py-1 rounded font-bold"
          >
            ติดตั้งและรีสตาร์ท
          </button>
        </>
      ) : (
        <>
          <p className="font-bold">กำลังดาวน์โหลดอัพเดท...</p>
          {progress !== null && <p>{progress}%</p>}
        </>
      )}
    </div>
  );
}