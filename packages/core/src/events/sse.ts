import type { Response } from 'express';

export interface SSEStream {
  send: (event: string, data: object) => void;
  close: () => void;
}

/**
 * Set up an SSE (Server-Sent Events) stream on an Express response.
 *
 * Returns helpers to send typed events and to tear the stream down.
 * A `:keepalive` comment is sent every 30 s so proxies don't close
 * the connection.  Cleanup (clearing the interval) happens
 * automatically when the client disconnects **or** when `.close()`
 * is called explicitly.
 */
export function createSSEStream(res: Response): SSEStream {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // nginx: disable proxy buffering
  });

  // Flush headers immediately
  res.flushHeaders();

  const keepalive = setInterval(() => {
    res.write(':keepalive\n\n');
  }, 30_000);

  function cleanup() {
    clearInterval(keepalive);
  }

  // Clean up when the client drops the connection
  res.on('close', cleanup);

  return {
    send(event: string, data: object) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    close() {
      cleanup();
      res.end();
    },
  };
}
