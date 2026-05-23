/// <reference types="vite/client" />

interface Window {
  electron: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, callback: (...args: any[]) => void) => () => void;
    off: (channel: string, callback: (...args: any[]) => void) => void;
    send: (channel: string, ...args: any[]) => void;
    onUpdateAvailable: (cb: (info: unknown) => void) => void;
    onUpdateDownloaded: (cb: () => void) => void;
    onUpdateProgress: (cb: (progress: { percent: number }) => void) => void;
    installUpdate: () => Promise<void>;
  };
}

declare module "*.css" {
  const content: any;
  export default content;
}
