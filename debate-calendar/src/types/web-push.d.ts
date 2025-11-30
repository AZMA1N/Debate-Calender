declare module "web-push" {
  export interface PushKeys {
    p256dh: string;
    auth: string;
  }

  export interface PushSubscription {
    endpoint: string;
    keys: PushKeys;
    expirationTime?: number | null;
  }

  export function setVapidDetails(
    mailto: string,
    publicKey: string,
    privateKey: string,
  ): void;

  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
}
