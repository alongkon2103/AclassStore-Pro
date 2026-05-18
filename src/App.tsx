import React from 'react';
import Dashboard from './pages/Dashboard';
import { X, Minus, Square } from 'lucide-react';

const App: React.FC = () => {
  const winAction = (action: string) => {
    (window as any).electron.invoke(`window:${action}`);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0a1520] text-[#c8d8e8]">
      {/* Frameless window title bar / drag region */}
      <div className="h-8 drag-region flex-shrink-0 bg-[#0e1c2a] border-b border-[#162840] flex items-center justify-between px-4">
        {/* Window Controls (macOS style) */}
        <div className="flex gap-2 no-drag">
          <button 
            onClick={() => winAction('close')}
            className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 flex items-center justify-center group transition-colors cursor-pointer"
          >
            <X size={8} className="text-black/50 opacity-0 group-hover:opacity-100" />
          </button>
          <button 
            onClick={() => winAction('minimize')}
            className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/80 flex items-center justify-center group transition-colors cursor-pointer"
          >
            <Minus size={8} className="text-black/50 opacity-0 group-hover:opacity-100" />
          </button>
          <button 
            onClick={() => winAction('maximize')}
            className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#28c840]/80 flex items-center justify-center group transition-colors cursor-pointer"
          >
            <Square size={6} className="text-black/50 opacity-0 group-hover:opacity-100" />
          </button>
        </div>
        
        <div className="text-[10px] text-[#1e3a55] font-bold tracking-widest pointer-events-none">
          A CLASS STORE — TIKLIVE PRO
        </div>
        
        <div className="w-16" /> {/* Spacer */}
      </div>
      
      <Dashboard />
    </div>
  );
};

export default App;
