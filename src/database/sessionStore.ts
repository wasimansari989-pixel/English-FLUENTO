// Session state tracking - initialized to true so returning users are not kicked to onboarding
let sessionEntered = true;

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

