export const msalConfig = {
  auth: {
    clientId: "27e6321e-24a5-4db3-a6da-29f1eb34faf4",
    authority: "https://login.microsoftonline.com/64ab2952-0d1a-49ef-a64b-0494bc1432e8",
    redirectUri: "http://localhost:5173",
    postLogoutRedirectUri: "http://localhost:5173",
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};

export const loginRequest = {
  scopes: ["User.Read"]
};

export const apiTokenRequest = {
  scopes: ["api://32043bc9-7878-4474-b8d2-61cb242aab22/Reservations.ReadWrite"]
};