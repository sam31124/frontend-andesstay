import axios from 'axios';
import { msalInstance } from '../main';
import { apiTokenRequest } from '../authConfig';

const api = axios.create({
  baseURL: 'https://qap60rytu3.execute-api.us-east-1.amazonaws.com',
});

api.interceptors.request.use(async (config) => {
  let account = msalInstance.getActiveAccount();
  if (!account) {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      account = accounts[0];
      msalInstance.setActiveAccount(account);
    }
  }

  if (account) {
    try {
      const response = await msalInstance.acquireTokenSilent({
        ...apiTokenRequest,
        account: account,
      });
      console.log("Token obtenido exitosamente:", response.accessToken);
      config.headers.Authorization = `Bearer ${response.accessToken}`;
    } catch (error) {
      console.warn("Fallo silencioso, solicitando token vía popup...", error);
      try {
        const response = await msalInstance.acquireTokenPopup(apiTokenRequest);
        config.headers.Authorization = `Bearer ${response.accessToken}`;
      } catch (popupError) {
        console.error("Error al obtener token con popup:", popupError);
      }
    }
  } else {
    console.warn("No hay cuenta activa en MSAL.");
  }

  return config;
}, (error) => Promise.reject(error));

export default api;