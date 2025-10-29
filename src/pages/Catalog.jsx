import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function Catalog() {
  const [units, setUnits] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/catalog/units')
      .then((res) => setUnits(res.data.data))
      .catch((err) => setError("No autorizado para ver el catálogo de unidades."));
  }, []);

  if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Catálogo de Unidades y Disponibilidad</h2>
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead style={{ background: '#203a43', color: '#fff' }}>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Capacidad</th>
            <th>Tarifa Base</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {units.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.nombre}</td>
              <td>{u.tipo}</td>
              <td>{u.capacidad} personas</td>
              <td>${u.tarifaBase.toLocaleString('es-CL')}</td>
              <td style={{ color: u.disponible ? 'green' : 'red', fontWeight: 'bold' }}>
                {u.disponible ? 'Disponible' : 'Ocupada'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}