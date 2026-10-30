// In-memory session state (resets to false on every app reload or restart)
let sessionEntered = false;

export const SessionManager = {
  isEntered(): boolean {
    return sessionEntered;
  },
  setEntered(entered: boolean): void {
    sessionEntered = entered;
  },
  reset(): void {
    sessionEntered = false;
  },
};

