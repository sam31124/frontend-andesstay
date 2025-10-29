import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest, apiTokenRequest } from './authConfig';
import Reservations from './pages/Reservations';
import Catalog from './pages/Catalog';
import Reports from './pages/Reports';
import Audit from './pages/Audit';

export default function App() {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [userRoles, setUserRoles] = useState([]);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadUserData() {
      const activeAccount = instance.getActiveAccount() || instance.getAllAccounts()[0];
      if (!activeAccount) return;

      if (isMounted) {
        setUserName(activeAccount.name || activeAccount.username || '');
      }

      if (activeAccount.idTokenClaims?.roles?.length > 0) {
        if (isMounted) setUserRoles(activeAccount.idTokenClaims.roles);
        return;
      }

      try {
        const response = await instance.acquireTokenSilent({
          ...apiTokenRequest,
          account: activeAccount,
        });

        if (response?.accessToken && isMounted) {
          const payloadBase64 = response.accessToken.split('.')[1];
          const decodedJson = JSON.parse(atob(payloadBase64));
          setUserRoles(decodedJson.roles || []);
        }
      } catch (e) {
        console.warn('No se pudieron extraer roles en el arranque:', e);
      }
    }

    if (isAuthenticated) {
      loadUserData();
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleLogin = () => {
    instance.loginRedirect(loginRequest).catch(console.error);
  };

  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: 'http://localhost:5173',
    }).catch(console.error);
  };

  return (
    <div style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          background: '#0b2545',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>AndesStay</h2>
          {isAuthenticated && (
            <nav style={{ display: 'flex', gap: '1rem' }}>
              <Link
                to="/reservations"
                style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold' }}
              >
                Reservas
              </Link>
              <Link
                to="/catalog"
                style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold' }}
              >
                Catálogo
              </Link>
              {userRoles.includes('Admin') && (
                <Link
                  to="/reports"
                  style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold' }}
                >
                  Reportes
                </Link>
              )}
              {(userRoles.includes('Admin') || userRoles.includes('Auditor')) && (
                <Link
                  to="/audit"
                  style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold' }}
                >
                  Auditoría
                </Link>
              )}
            </nav>
          )}
        </div>
        <div>
          {isAuthenticated ? (
            <div>
              <span>
                {userName} [{userRoles.join(', ') || 'Admin'}]
              </span>
              <button
                onClick={handleLogout}
                style={{
                  marginLeft: '1rem',
                  padding: '0.4rem 0.8rem',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  border: 'none',
                  background: '#e63946',
                  color: '#fff',
                }}
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              style={{
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                background: '#134074',
                color: '#fff',
                border: '1px solid #fff',
                borderRadius: '4px',
              }}
            >
              Iniciar sesión con Microsoft
            </button>
          )}
        </div>
      </header>

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <h1>Plataforma de Reservas AndesStay</h1>
                <p>
                  Inicia sesión con tu cuenta corporativa para acceder a la gestión de alojamientos.
                </p>
              </div>
            }
          />
          <Route
            path="/reservations"
            element={isAuthenticated ? <Reservations /> : <Navigate to="/" replace />}
          />
          <Route
            path="/catalog"
            element={isAuthenticated ? <Catalog /> : <Navigate to="/" replace />}
          />
          <Route
            path="/reports"
            element={isAuthenticated ? <Reports /> : <Navigate to="/" replace />}
          />
          <Route
            path="/audit"
            element={isAuthenticated ? <Audit /> : <Navigate to="/" replace />}
          />
        </Routes>
      </main>
    </div>
  );
}