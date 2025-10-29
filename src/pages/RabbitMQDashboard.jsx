import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function RabbitMQDashboard() {
  const [topology, setTopology] = useState(null);
  const [logsData, setLogsData] = useState({ logs: [], successCount: 0, dlqCount: 0, totalCount: 0 });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Formularios de administración
  const [newQueueName, setNewQueueName] = useState('');
  const [delQueueName, setDelQueueName] = useState('');
  const [newExchangeName, setNewExchangeName] = useState('');
  const [newExchangeType, setNewExchangeType] = useState('direct');
  const [delExchangeName, setDelExchangeName] = useState('');
  const [bindingExchange, setBindingExchange] = useState('');
  const [bindingQueue, setBindingQueue] = useState('');
  const [bindingRoutingKey, setBindingRoutingKey] = useState('');

  // Simulación
  const [simQueue, setSimQueue] = useState('email');

  const rabbitUrl = (path) => `http://localhost:8084${path}`;
  const notifyUrl = (path) => `http://localhost:8083${path}`;
  const resvUrl = (path) => `http://localhost:8081${path}`;

  const fetchStatusAndLogs = async () => {
    setLoading(true);
    try {
      // 1. Estado de topología
      try {
        const topRes = await fetch(rabbitUrl('/api/rabbit/topology/status'));
        if (topRes.ok) {
          const topData = await topRes.json();
          setTopology(topData);
        }
      } catch (err) {
        console.warn('No se pudo cargar topología:', err);
      }

      // 2. Logs y estadísticas de consumidor / DLQ
      try {
        const logsRes = await fetch(notifyUrl('/api/notify/logs'));
        if (logsRes.ok) {
          const lData = await logsRes.json();
          setLogsData(lData || { logs: [], successCount: 0, dlqCount: 0, totalCount: 0 });
        }
      } catch (err) {
        console.warn('No se pudieron cargar logs de notificación:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndLogs();
    const interval = setInterval(fetchStatusAndLogs, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleInitTopology = async () => {
    try {
      const res = await fetch(rabbitUrl('/api/rabbit/topology/init'), { method: 'POST' });
      const data = await res.json();
      setFeedback({ type: 'success', message: data?.message || 'Topología oficial inicializada correctamente.' });
      fetchStatusAndLogs();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error inicializando topología: ' + err.message });
    }
  };

  const handleSimulateDlq = async (queueType) => {
    try {
      const res = await fetch(notifyUrl('/api/notify/simulate-send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: queueType, simulateError: true }),
      });
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Prueba DLQ ejecutada en [${queueType}]. Mensaje desviado a Dead Letter Queue y auditado.`
        });
        fetchStatusAndLogs();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error simulando DLQ: ' + err.message });
    }
  };

  const handleSimulateSuccess = async (queueType) => {
    try {
      const res = await fetch(notifyUrl('/api/notify/simulate-send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: queueType, simulateError: false }),
      });
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Mensaje exitoso despachado a la cola [q.cmd.${queueType}] y procesado con ACK.`
        });
        fetchStatusAndLogs();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error enviando mensaje: ' + err.message });
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch(notifyUrl('/api/notify/clear'), { method: 'POST' });
      setFeedback({ type: 'success', message: 'Historial de auditoría de mensajes limpiado.' });
      fetchStatusAndLogs();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error limpiando logs: ' + err.message });
    }
  };

  // Creación y eliminación de colas
  const handleCreateQueue = async (e) => {
    e.preventDefault();
    if (!newQueueName.trim()) return;
    try {
      const res = await fetch(rabbitUrl('/api/rabbit/queues'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newQueueName.trim(), durable: true }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: `Cola [${newQueueName}] creada exitosamente.` });
        setNewQueueName('');
        fetchStatusAndLogs();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error creando cola: ' + err.message });
    }
  };

  const handleDeleteQueue = async (e) => {
    e.preventDefault();
    if (!delQueueName.trim()) return;
    try {
      const res = await fetch(rabbitUrl(`/api/rabbit/queues/${encodeURIComponent(delQueueName.trim())}`), { method: 'DELETE' });
      if (res.ok) {
        setFeedback({ type: 'success', message: `Cola [${delQueueName}] eliminada.` });
        setDelQueueName('');
        fetchStatusAndLogs();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error eliminando cola: ' + err.message });
    }
  };

  // Creación y eliminación de exchanges
  const handleCreateExchange = async (e) => {
    e.preventDefault();
    if (!newExchangeName.trim()) return;
    try {
      const res = await fetch(rabbitUrl('/api/rabbit/exchanges'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newExchangeName.trim(), type: newExchangeType }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: `Exchange [${newExchangeName}] (${newExchangeType}) creado.` });
        setNewExchangeName('');
        fetchStatusAndLogs();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error creando exchange: ' + err.message });
    }
  };

  const handleDeleteExchange = async (e) => {
    e.preventDefault();
    if (!delExchangeName.trim()) return;
    try {
      const res = await fetch(rabbitUrl(`/api/rabbit/exchanges/${encodeURIComponent(delExchangeName.trim())}`), { method: 'DELETE' });
      if (res.ok) {
        setFeedback({ type: 'success', message: `Exchange [${delExchangeName}] eliminado.` });
        setDelExchangeName('');
        fetchStatusAndLogs();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error eliminando exchange: ' + err.message });
    }
  };

  // Creación de bindings
  const handleCreateBinding = async (e) => {
    e.preventDefault();
    if (!bindingExchange.trim() || !bindingQueue.trim()) return;
    try {
      const res = await fetch(rabbitUrl('/api/rabbit/bindings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange: bindingExchange.trim(),
          destinationQueue: bindingQueue.trim(),
          routingKey: bindingRoutingKey.trim(),
        }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: `Binding creado: ${bindingExchange} -> ${bindingQueue} (${bindingRoutingKey})` });
        setBindingExchange('');
        setBindingQueue('');
        setBindingRoutingKey('');
        fetchStatusAndLogs();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error creando binding: ' + err.message });
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0b2545' }}>Panel de Control RabbitMQ - AndesStay</h2>
          <p style={{ margin: '0.5rem 0 0', color: '#555' }}>
            Evaluación Parcial N°3: Mensajería Asíncrona Desacoplada, DLQs y Gestión Dinámica de Topología
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href="http://localhost:15672"
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: '0.45rem 0.8rem', background: '#e9ecef', color: '#333', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 'bold' }}
          >
            💻 UI Local (:15672)
          </a>
          <a
            href="http://54.162.30.246:15672"
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: '0.45rem 0.8rem', background: '#ff9900', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 'bold' }}
          >
            ☁️ UI Cloud AWS (:15672)
          </a>
          <button
            onClick={fetchStatusAndLogs}
            disabled={loading}
            style={{ padding: '0.5rem 1rem', background: '#134074', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {loading ? 'Actualizando...' : '🔄 Refrescar'}
          </button>
          <button
            onClick={handleInitTopology}
            style={{ padding: '0.5rem 1rem', background: '#2a9d8f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ⚙️ Inicializar Topología Oficial
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{
          padding: '0.8rem 1.2rem',
          marginBottom: '1.5rem',
          borderRadius: '6px',
          background: feedback.type === 'error' ? '#ffebee' : '#e8f5e9',
          color: feedback.type === 'error' ? '#c62828' : '#2e7d32',
          border: `1px solid ${feedback.type === 'error' ? '#ef9a9a' : '#a5d6a7'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Métricas rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: 0, color: '#777', fontSize: '0.9rem' }}>ESTADO SERVICIO RABBITMQ</h4>
          <p style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', fontWeight: 'bold', color: topology?.connected !== false ? '#2e7d32' : '#c62828' }}>
            {topology?.connected !== false ? '● Operacional' : '● Desconectado'}
          </p>
        </div>
        <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: 0, color: '#777', fontSize: '0.9rem' }}>MENSAJES PROCESADOS CON ÉXITO</h4>
          <p style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', fontWeight: 'bold', color: '#134074' }}>
            {logsData.successCount}
          </p>
        </div>
        <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: 0, color: '#777', fontSize: '0.9rem' }}>MENSAJES EN DEAD LETTER QUEUE (DLQ)</h4>
          <p style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', fontWeight: 'bold', color: '#e76f51' }}>
            {logsData.dlqCount}
          </p>
        </div>
      </div>

      {/* Simulador de Pruebas EP3 */}
      <div style={{ background: '#f8f9fa', padding: '1.2rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 0.8rem', color: '#0b2545' }}>🧪 Laboratorio de Pruebas de Desacoplamiento & Manejo de DLQ</h3>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Demuestra en vivo la entrega garantizada, procesamiento asíncrono y desvío de excepciones hacia la Dead Letter Queue (DLQ).
        </p>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold' }}>Cola de Destino:</label>
          <select
            value={simQueue}
            onChange={(e) => setSimQueue(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="email">Email (q.cmd.email / q.cmd.email.dlq)</option>
            <option value="housekeeping">Housekeeping (q.cmd.housekeeping / q.cmd.housekeeping.dlq)</option>
            <option value="voucher">Voucher (q.cmd.voucher / q.cmd.voucher.dlq)</option>
          </select>

          <button
            onClick={() => handleSimulateSuccess(simQueue)}
            style={{ padding: '0.5rem 1rem', background: '#2a9d8f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ✅ Enviar Mensaje Normal (ACK)
          </button>

          <button
            onClick={() => handleSimulateDlq(simQueue)}
            style={{ padding: '0.5rem 1rem', background: '#e76f51', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ⚠️ Simular Falla & Desvío a DLQ (NACK)
          </button>
        </div>
      </div>

      {/* Historial de Auditoría en Tiempo Real */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#0b2545' }}>📋 Registro de Auditoría de Mensajes & DLQ (ms-andesstay-notify)</h3>
          <button
            onClick={handleClearLogs}
            style={{ padding: '0.3rem 0.8rem', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Limpiar Logs
          </button>
        </div>

        {logsData.logs && logsData.logs.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', borderColor: '#eee' }}>
              <thead style={{ background: '#203a43', color: '#fff', textAlign: 'left' }}>
                <tr>
                  <th>Hora</th>
                  <th>Tipo Evento</th>
                  <th>Cola / Consumidor</th>
                  <th>Estado</th>
                  <th>Error / Detalle DLQ</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                {logsData.logs.map((log) => (
                  <tr key={log.id} style={{ background: log.isDlq ? '#fff5f5' : '#fff' }}>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td><code>{log.eventType}</code></td>
                    <td>{log.queueName}</td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        background: log.isDlq ? '#ffebee' : '#e8f5e9',
                        color: log.isDlq ? '#c62828' : '#2e7d32',
                      }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ color: log.isDlq ? '#c62828' : '#555', fontSize: '0.85rem' }}>
                      {log.errorMessage || 'Sin errores (ACK procesado)'}
                    </td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {JSON.stringify(log.payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#888', fontStyle: 'italic', margin: '1rem 0' }}>
            No hay registros de auditoría aún. Envía un mensaje desde el laboratorio superior para observar la trazabilidad.
          </p>
        )}
      </div>

      {/* Gestión Administrativa (Lucas Salazar: ms-andesstay-rabbit-admin) */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
        <h3 style={{ margin: '0 0 1rem', color: '#0b2545' }}>
          🛠️ Administrador de RabbitMQ: Colas, Exchanges y Bindings (ms-andesstay-rabbit-admin)
        </h3>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Permite crear y eliminar colas, exchanges y asociaciones (bindings) en tiempo de ejecución.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Gestión de Colas */}
          <div style={{ background: '#fdfdfd', padding: '1rem', borderRadius: '6px', border: '1px solid #eee' }}>
            <h4 style={{ margin: '0 0 0.8rem', color: '#134074' }}>Colas</h4>
            <form onSubmit={handleCreateQueue} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
              <input
                type="text"
                placeholder="Nombre de nueva cola"
                value={newQueueName}
                onChange={(e) => setNewQueueName(e.target.value)}
                style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <button type="submit" style={{ padding: '0.4rem 0.8rem', background: '#134074', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Crear
              </button>
            </form>
            <form onSubmit={handleDeleteQueue} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Nombre de cola a eliminar"
                value={delQueueName}
                onChange={(e) => setDelQueueName(e.target.value)}
                style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <button type="submit" style={{ padding: '0.4rem 0.8rem', background: '#d90429', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Eliminar
              </button>
            </form>
          </div>

          {/* Gestión de Exchanges */}
          <div style={{ background: '#fdfdfd', padding: '1rem', borderRadius: '6px', border: '1px solid #eee' }}>
            <h4 style={{ margin: '0 0 0.8rem', color: '#134074' }}>Exchanges</h4>
            <form onSubmit={handleCreateExchange} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
              <input
                type="text"
                placeholder="Nombre nuevo exchange"
                value={newExchangeName}
                onChange={(e) => setNewExchangeName(e.target.value)}
                style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <select
                value={newExchangeType}
                onChange={(e) => setNewExchangeType(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="direct">direct</option>
                <option value="topic">topic</option>
                <option value="fanout">fanout</option>
              </select>
              <button type="submit" style={{ padding: '0.4rem 0.8rem', background: '#134074', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Crear
              </button>
            </form>
            <form onSubmit={handleDeleteExchange} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Nombre de exchange a eliminar"
                value={delExchangeName}
                onChange={(e) => setDelExchangeName(e.target.value)}
                style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <button type="submit" style={{ padding: '0.4rem 0.8rem', background: '#d90429', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Eliminar
              </button>
            </form>
          </div>

          {/* Gestión de Bindings */}
          <div style={{ background: '#fdfdfd', padding: '1rem', borderRadius: '6px', border: '1px solid #eee' }}>
            <h4 style={{ margin: '0 0 0.8rem', color: '#134074' }}>Crear Binding</h4>
            <form onSubmit={handleCreateBinding} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Exchange de origen (ej: cmd.direct)"
                value={bindingExchange}
                onChange={(e) => setBindingExchange(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <input
                type="text"
                placeholder="Cola de destino (ej: q.cmd.email)"
                value={bindingQueue}
                onChange={(e) => setBindingQueue(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <input
                type="text"
                placeholder="Routing Key (ej: email.send)"
                value={bindingRoutingKey}
                onChange={(e) => setBindingRoutingKey(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <button type="submit" style={{ padding: '0.4rem', background: '#134074', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Vincular Binding
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
