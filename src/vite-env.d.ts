/// <reference types="vite/client" />

interface Window {
  electron: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, callback: (...args: any[]) => void) => () => void;
    off: (channel: string, callback: (...args: any[]) => void) => void;
    send: (channel: string, ...args: any[]) => void;
  };
}

declare module "*.css" {
  const content: any;
  export default content;
}
