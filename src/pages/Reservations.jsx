import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function Reservations() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReservations = () => {
    setLoading(true);
    setError(null);
    api.get('/api/reservations')
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Detalle del error en petición:", err.response || err);
        if (err.response?.status === 401) {
          setError("Error 401: No autorizado. El token no fue enviado o no es válido para esta API.");
        } else if (err.response?.status === 403) {
          setError("Error 403: Prohibido. Tu usuario no tiene el rol necesario en Azure AD.");
        } else {
          setError("Error de comunicación con el backend.");
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    setActionLoading(true);
    try {
      await api.put(`/api/reservations/${id}/status`, { status: newStatus });
      fetchReservations();
    } catch (err) {
      const serverMsg = err.response?.data?.error || "Error al actualizar el estado";
      alert(serverMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const isAdminOrReceptionist = data?.roles?.some(r => r === 'Admin' || r === 'Recepcionista');

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Gestión de Reservas - AndesStay</h2>
      
      {loading && <p>Consultando backend...</p>}
      
      {error && (
        <div style={{ color: 'red', background: '#ffebee', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          <p><strong>{error}</strong></p>
          <button onClick={fetchReservations} style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}>Reintentar</button>
        </div>
      )}

      {data && (
        <>
          <div style={{ background: '#f4f6f8', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #ccc' }}>
            <p><strong>Mensaje:</strong> {data.message}</p>
            <p><strong>Usuario detectado por Spring:</strong> {data.user}</p>
            <p><strong>Roles validados en JWT:</strong> {data.roles?.join(', ') || 'Sin roles'}</p>
          </div>

          <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#203a43', color: '#fff' }}>
              <tr>
                <th>ID</th>
                <th>Huésped</th>
                <th>Unidad</th>
                <th>Estado</th>
                {isAdminOrReceptionist && <th>Acciones de Operador</th>}
              </tr>
            </thead>
            <tbody>
              {data.data?.map((reserva) => (
                <tr key={reserva.id}>
                  <td>{reserva.id}</td>
                  <td>{reserva.huesped}</td>
                  <td>{reserva.unidad}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      background: reserva.estado === 'CONFIRMADA' ? '#d4edda' :
                                  reserva.estado === 'CREADA' ? '#fff3cd' :
                                  reserva.estado === 'CHECKIN_PENDIENTE' ? '#d1ecf1' : '#e2e3e5',
                      color: reserva.estado === 'CONFIRMADA' ? '#155724' :
                             reserva.estado === 'CREADA' ? '#856404' :
                             reserva.estado === 'CHECKIN_PENDIENTE' ? '#0c5460' : '#383d41'
                    }}>
                      {reserva.estado}
                    </span>
                  </td>
                  {isAdminOrReceptionist && (
                    <td>
                      {reserva.estado === 'CREADA' && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(reserva.id, 'CONFIRMADA')}
                          style={{ background: '#2a9d8f', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer', borderRadius: '4px' }}
                        >
                          Confirmar Reserva
                        </button>
                      )}
                      {reserva.estado === 'CONFIRMADA' && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(reserva.id, 'CHECKIN_PENDIENTE')}
                          style={{ background: '#e76f51', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer', borderRadius: '4px' }}
                        >
                          Pasar a Check-in
                        </button>
                      )}
                      {reserva.estado === 'CHECKIN_PENDIENTE' && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(reserva.id, 'EN_ESTADIA')}
                          style={{ background: '#264653', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer', borderRadius: '4px' }}
                        >
                          Efectuar Entrada
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}