import { Platform } from 'react-native';
import { getBackendUrl } from './aiClient';

type NetworkListener = (isConnected: boolean) => void;

class NetworkServiceClass {
  private isOnline: boolean = true;
  private listeners: Set<NetworkListener> = new Set();
  private checkInterval: any = null;
  private isChecking: boolean = false;

  constructor() {
    this.startPeriodicCheck();
  }

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current state
    listener(this.isOnline);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }

  public async checkConnectivity(): Promise<boolean> {
    if (this.isChecking) return this.isOnline;
    this.isChecking = true;

    try {
      const backendUrl = await getBackendUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      // Probe backend health endpoint first
      let connected = false;
      try {
        const res = await fetch(`${backendUrl}/api/ai/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        connected = res.ok || res.status < 500;
      } catch {
        // If local backend didn't respond, test internet connection via generate_204
        try {
          const internetController = new AbortController();
          const internetTimeout = setTimeout(() => internetController.abort(), 2500);
          const internetRes = await fetch('https://www.google.com/generate_204', {
            method: 'HEAD',
            signal: internetController.signal,
          });
          clearTimeout(internetTimeout);
          connected = internetRes.status === 204 || internetRes.ok;
        } catch {
          connected = false;
        }
      }

      this.updateStatus(connected);
      return connected;
    } catch {
      this.updateStatus(false);
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  private updateStatus(newStatus: boolean) {
    if (this.isOnline !== newStatus) {
      this.isOnline = newStatus;
      this.listeners.forEach((listener) => {
        try {
          listener(newStatus);
        } catch {
          // ignore
        }
      });
    }
  }

  private startPeriodicCheck() {
    // Initial check
    this.checkConnectivity();

    // Check periodically every 15 seconds
    if (!this.checkInterval) {
      this.checkInterval = setInterval(() => {
        this.checkConnectivity();
      }, 15000);
    }
  }

  public stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const NetworkService = new NetworkServiceClass();

