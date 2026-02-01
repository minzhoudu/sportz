declare module "ws" {
  interface WebSocket {
    subscriptions: Set<string>;
  }
}

export {};
