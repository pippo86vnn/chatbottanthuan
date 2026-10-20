declare module 'ws' {
  import { EventEmitter } from 'events';
  import { IncomingMessage, Server as HttpServer } from 'http';
  import { Server as HttpsServer } from 'https';
  import { Duplex } from 'stream';

  export class WebSocket extends EventEmitter {
    static readonly CONNECTING: 0;
    static readonly OPEN: 1;
    static readonly CLOSING: 2;
    static readonly CLOSED: 3;

    readonly CONNECTING: 0;
    readonly OPEN: 1;
    readonly CLOSING: 2;
    readonly CLOSED: 3;

    readonly readyState: number;

    constructor(address: string | URL, protocols?: string | string[], options?: any);

    close(code?: number, data?: string | Buffer): void;
    ping(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    pong(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    send(data: any, options?: { mask?: boolean; binary?: boolean; compress?: boolean; fin?: boolean }, cb?: (err?: Error) => void): void;
    send(data: any, cb?: (err?: Error) => void): void;
    terminate(): void;

    on(event: 'close', listener: (code: number, reason: Buffer) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'upgrade', listener: (request: IncomingMessage) => void): this;
    on(event: 'message', listener: (data: any, isBinary: boolean) => void): this;
    on(event: 'open', listener: () => void): this;
    on(event: 'ping' | 'pong', listener: (data: Buffer) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
  }

  export interface ServerOptions {
    host?: string;
    port?: number;
    backlog?: number;
    server?: HttpServer | HttpsServer;
    verifyClient?: any;
    handleProtocols?: any;
    path?: string;
    noServer?: boolean;
    clientTracking?: boolean;
    perMessageDeflate?: any;
    maxPayload?: number;
    skipUTF8Validation?: boolean;
  }

  export class WebSocketServer extends EventEmitter {
    options: ServerOptions;
    path: string;
    clients: Set<WebSocket>;

    constructor(options?: ServerOptions, callback?: () => void);

    close(cb?: (err?: Error) => void): void;
    handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer, callback: (client: WebSocket, request: IncomingMessage) => void): void;
    shouldHandle(request: IncomingMessage): boolean | Promise<boolean>;

    on(event: 'connection', listener: (socket: WebSocket, request: IncomingMessage) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'headers', listener: (headers: string[], request: IncomingMessage) => void): this;
    on(event: 'close' | 'listening', listener: () => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
  }

  export default WebSocket;
}
