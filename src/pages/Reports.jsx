import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function Reports() {
  const [kpis, setKpis] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/report/kpis')
      .then((res) => setKpis(res.data.kpis))
      .catch((err) => setError("Acceso restringido: Solo rol Admin puede ver los reportes."));
  }, []);

  if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Panel de KPIs Operacionales - AndesStay</h2>
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ background: '#f0f4f8', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #134074' }}>
            <h3>Reservas / Hora</h3>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>{kpis.reservasPorHora}</p>
          </div>
          <div style={{ background: '#f0f4f8', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #134074' }}>
            <h3>Ocupación Activa</h3>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>{kpis.ocupacionActivaPorcentaje}%</p>
          </div>
          <div style={{ background: '#f0f4f8', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #134074' }}>
            <h3>Tiempo de Ciclo</h3>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>{kpis.tiempoCicloPromedioMin} min</p>
          </div>
        </div>
      )}
    </div>
  );
}