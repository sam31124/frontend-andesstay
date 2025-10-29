import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './authConfig';
import { BrowserRouter } from 'react-router-dom';

export const msalInstance = new PublicClientApplication(msalConfig);

async function startApp() {
  await msalInstance.initialize();
  
  // Procesa cualquier callback pendiente antes de montar la app
  const response = await msalInstance.handleRedirectPromise();
  if (response?.account) {
    msalInstance.setActiveAccount(response.account);
  } else {
    const currentAccounts = msalInstance.getAllAccounts();
    if (currentAccounts.length > 0) {
      msalInstance.setActiveAccount(currentAccounts[0]);
    }
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MsalProvider>
    </React.StrictMode>
  );
}

startApp();