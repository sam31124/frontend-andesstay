import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function Audit() {
  const [timeline, setTimeline] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/audit/timeline')
      .then((res) => setTimeline(res.data.timeline))
      .catch(() => setError("Acceso restringido: Solo roles Admin y Auditor pueden ver la trazabilidad."));
  }, []);

  if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Línea de Tiempo de Auditoría - AndesStay</h2>
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead style={{ background: '#203a43', color: '#fff' }}>
          <tr>
            <th>ID Evento</th>
            <th>Acción</th>
            <th>Usuario</th>
            <th>Fecha / Hora</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {timeline.map((evt) => (
            <tr key={evt.eventId}>
              <td>{evt.eventId}</td>
              <td><strong>{evt.action}</strong></td>
              <td>{evt.user}</td>
              <td>{evt.timestamp}</td>
              <td>{evt.detalle}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}