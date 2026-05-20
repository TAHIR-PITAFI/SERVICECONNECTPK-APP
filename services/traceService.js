class TraceService {
  constructor() {
    this.logs = [];
    this.listeners = [];
  }

  logAgent(agent, input, reasoning, output) {
    const entry = {
      agent,
      input,
      reasoning,
      output,
      timestamp: new Date().toISOString()
    };
    this.logs.unshift(entry);
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    listener(this.logs);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this.logs));
  }

  clearLogs() {
    this.logs = [];
    this.notify();
  }
}

export const traceService = new TraceService();
