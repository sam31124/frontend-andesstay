import React, { useEffect, useState } from 'react';

export default function KafkaDashboard() {
  const [clusterStatus, setClusterStatus] = useState(null);
  const [topics, setTopics] = useState([]);
  const [consumerGroups, setConsumerGroups] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Formulario nuevo tópico
  const [newTopicName, setNewTopicName] = useState('');
  const [newPartitions, setNewPartitions] = useState(3);
  const [newReplication, setNewReplication] = useState(1);
  const [newRetentionDays, setNewRetentionDays] = useState(7);
  const [newCleanupPolicy, setNewCleanupPolicy] = useState('delete');

  // Formulario simulación
  const [simEventType, setSimEventType] = useState('RESERVATION_CREATED');
  const [simUnit, setSimUnit] = useState('Cabaña Vista Volcán');

  const kafkaAdminUrl = (path) => `http://localhost:8086${path}`;
  const reservationsUrl = (path) => `http://localhost:8081${path}`;
  const notifyUrl = (path) => `http://localhost:8083${path}`;

  const fetchKafkaData = async () => {
    setLoading(true);
    try {
      // 1. Estado del clúster
      try {
        const statusRes = await fetch(kafkaAdminUrl('/api/kafka/status'));
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setClusterStatus(statusData);
        }
      } catch (err) {
        setClusterStatus({ status: 'DISCONNECTED', error: err.message });
      }

      // 2. Tópicos
      try {
        const topicsRes = await fetch(kafkaAdminUrl('/api/kafka/topics'));
        if (topicsRes.ok) {
          const topicsData = await topicsRes.json();
          setTopics(topicsData || []);
        }
      } catch (err) {
        console.warn('No se pudieron cargar tópicos:', err);
      }

      // 3. Consumer Groups
      try {
        const groupsRes = await fetch(kafkaAdminUrl('/api/kafka/consumer-groups'));
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          setConsumerGroups(groupsData || []);
        }
      } catch (err) {
        console.warn('No se pudieron cargar consumer groups:', err);
      }

      // 4. Logs de streaming desde ms-andesstay-notify
      try {
        const logsRes = await fetch(notifyUrl('/api/notify/logs'));
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          const kafkaLogs = (logsData.logs || []).filter(
            (l) => (l.queue && l.queue.includes('KAFKA')) || (l.type && l.type.includes('STREAM'))
          );
          setLogs(kafkaLogs);
        }
      } catch (err) {
        console.warn('No se pudieron cargar logs de streaming:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKafkaData();
    const interval = setInterval(fetchKafkaData, 7000);
    return () => clearInterval(interval);
  }, []);

  const handleInitOfficialTopics = async () => {
    try {
      const res = await fetch(kafkaAdminUrl('/api/kafka/topics/init'), { method: 'POST' });
      const data = await res.json();
      setFeedback({ type: 'success', message: data?.message || 'Topología oficial inicializada en Kafka.' });
      fetchKafkaData();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error inicializando tópicos: ' + err.message });
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    try {
      const res = await fetch(kafkaAdminUrl('/api/kafka/topics'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTopicName.trim(),
          partitions: parseInt(newPartitions, 10),
          replicationFactor: parseInt(newReplication, 10),
          retentionMs: parseInt(newRetentionDays, 10) * 86400000,
          cleanupPolicy: newCleanupPolicy,
        }),
      });

      if (res.ok) {
        setFeedback({ type: 'success', message: `Tópico '${newTopicName}' creado exitosamente en Kafka.` });
        setNewTopicName('');
        fetchKafkaData();
      } else {
        const errData = await res.json();
        setFeedback({ type: 'error', message: 'Fallo al crear tópico: ' + (errData?.message || res.statusText) });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error al contactar ms-andesstay-kafka-admin: ' + err.message });
    }
  };

  const handleDeleteTopic = async (name) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el tópico '${name}' de Kafka?`)) return;

    try {
      const res = await fetch(kafkaAdminUrl(`/api/kafka/topics/${encodeURIComponent(name)}`), {
        method: 'DELETE',
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: `Tópico '${name}' eliminado exitosamente.` });
        fetchKafkaData();
      } else {
        setFeedback({ type: 'error', message: `No se pudo eliminar el tópico '${name}'.` });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error al eliminar tópico: ' + err.message });
    }
  };

  const handleSimulateStream = async () => {
    try {
      const res = await fetch(
        reservationsUrl(`/api/reservations/kafka/simulate-stream?eventType=${encodeURIComponent(simEventType)}&unitName=${encodeURIComponent(simUnit)}`),
        { method: 'POST' }
      );
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Evento '${simEventType}' y telemetría de ocupación emitidos a Kafka con éxito.`,
        });
        fetchKafkaData();
      } else {
        setFeedback({ type: 'error', message: 'Fallo al emitir evento de streaming desde Reservas.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error contactando servicio de Reservas: ' + err.message });
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1280px', margin: '0 auto', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0b2545' }}>Panel de Streaming & Analítica - Apache Kafka</h2>
          <p style={{ margin: '0.5rem 0 0', color: '#555' }}>
            Evaluación Parcial N°5: Arquitectura de Streaming, Tópicos, Particiones, Consumer Groups y Kafka-UI
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href="http://localhost:8085"
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: '0.45rem 0.8rem', background: '#343a40', color: '#fff', borderRadius: '4px', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 'bold' }}
          >
            💻 Kafka-UI Local (:8085)
          </a>
          <a
            href="http://54.162.30.246:8085"
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: '0.45rem 0.8rem', background: '#ff9900', color: '#fff', borderRadius: '4px', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 'bold' }}
          >
            ☁️ Kafka-UI AWS (:8085)
          </a>
          <button
            onClick={fetchKafkaData}
            disabled={loading}
            style={{ padding: '0.5rem 1rem', background: '#134074', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {loading ? 'Cargando...' : '🔄 Refrescar'}
          </button>
          <button
            onClick={handleInitOfficialTopics}
            style={{ padding: '0.5rem 1rem', background: '#2a9d8f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ⚙️ Inicializar Tópicos Oficiales
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
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {/* Tarjetas de Métricas Rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
          <h4 style={{ margin: 0, color: '#777', fontSize: '0.85rem' }}>ESTADO KAFKA BROKER</h4>
          <p style={{ margin: '0.5rem 0 0', fontSize: '1.4rem', fontWeight: 'bold', color: clusterStatus?.status === 'CONNECTED' ? '#2e7d32' : '#c62828' }}>
            {clusterStatus?.status === 'CONNECTED' ? '● Conectado (Port 9092)' : '● Desconectado / Local'}
          </p>
        </div>
        <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
          <h4 style={{ margin: 0, color: '#777', fontSize: '0.85rem' }}>TÓPICOS ACTIVOS REGISTRADOS</h4>
          <p style={{ margin: '0.5rem 0 0', fontSize: '1.4rem', fontWeight: 'bold', color: '#134074' }}>
            {topics.length} Tópicos
          </p>
        </div>
        <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
          <h4 style={{ margin: 0, color: '#777', fontSize: '0.85rem' }}>GRUPOS DE CONSUMIDORES</h4>
          <p style={{ margin: '0.5rem 0 0', fontSize: '1.4rem', fontWeight: 'bold', color: '#e76f51' }}>
            {consumerGroups.length > 0 ? `${consumerGroups.length} Activos` : '2 Configurados'}
          </p>
        </div>
        <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
          <h4 style={{ margin: 0, color: '#777', fontSize: '0.85rem' }}>EVENTOS DE STREAMING CAPTURADOS</h4>
          <p style={{ margin: '0.5rem 0 0', fontSize: '1.4rem', fontWeight: 'bold', color: '#2a9d8f' }}>
            {logs.length} Eventos
          </p>
        </div>
      </div>

      {/* Laboratorio de Streaming */}
      <div style={{ background: '#f8f9fa', padding: '1.2rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 0.8rem', color: '#0b2545' }}>🧪 Emisor de Eventos de Streaming en Tiempo Real (ms-andesstay-reservations)</h3>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
          Emite eventos tipados hacia <b>andesstay.reservations.stream</b> (particiones distribuidas) y métricas de ocupación hacia <b>andesstay.analytics.telemetry</b>.
        </p>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold', color: '#333' }}>Tipo de Evento:</label>
          <select
            value={simEventType}
            onChange={(e) => setSimEventType(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', background: '#fff' }}
          >
            <option value="RESERVATION_CREATED">RESERVATION_CREATED (Nueva Reserva)</option>
            <option value="RESERVATION_STATUS_UPDATED">RESERVATION_STATUS_UPDATED (Cambio Estado)</option>
            <option value="CHECKOUT_COMPLETED">CHECKOUT_COMPLETED (Salida Huésped)</option>
            <option value="VIP_BOOKING_ALERT">VIP_BOOKING_ALERT (Alerta Huésped VIP)</option>
          </select>

          <label style={{ fontWeight: 'bold', color: '#333' }}>Unidad:</label>
          <select
            value={simUnit}
            onChange={(e) => setSimUnit(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', background: '#fff' }}
          >
            <option value="Cabaña Vista Volcán">Cabaña Vista Volcán</option>
            <option value="Lodge Bosque Nativo">Lodge Bosque Nativo</option>
            <option value="Suite Glaciar Andes">Suite Glaciar Andes</option>
          </select>

          <button
            onClick={handleSimulateStream}
            style={{ padding: '0.55rem 1.2rem', background: '#00897b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📡 Emitir Streaming a Kafka
          </button>
        </div>
      </div>

      {/* Grid de Administración de Tópicos y Consumer Groups */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Tópicos Activos */}
        <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <h3 style={{ margin: '0 0 1rem', color: '#0b2545' }}>📑 Tópicos de Streaming Registrados (Kafka)</h3>
          {topics.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic' }}>
              No hay tópicos cargados. Pulsa <b>"⚙️ Inicializar Tópicos Oficiales"</b> arriba para crearlos con sus particiones y retención.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '0.5rem' }}>Nombre</th>
                    <th style={{ padding: '0.5rem' }}>Particiones</th>
                    <th style={{ padding: '0.5rem' }}>Retención</th>
                    <th style={{ padding: '0.5rem' }}>Cleanup</th>
                    <th style={{ padding: '0.5rem' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((t) => (
                    <tr key={t.name} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 'bold', color: '#1e293b' }}>{t.name}</td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>{t.partitions}</td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        {t.retentionMs && !isNaN(t.retentionMs)
                          ? `${Math.round(parseInt(t.retentionMs, 10) / 86400000)} días`
                          : t.retentionMs || '7 días'}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        <span style={{
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          background: t.cleanupPolicy === 'compact' ? '#ede9fe' : '#e0f2fe',
                          color: t.cleanupPolicy === 'compact' ? '#6b21a8' : '#0369a1',
                          fontWeight: 'bold',
                        }}>
                          {t.cleanupPolicy || 'delete'}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        <button
                          onClick={() => handleDeleteTopic(t.name)}
                          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Formulario Crear Tópico */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
            <h4 style={{ margin: '0 0 0.8rem', color: '#334155' }}>➕ Crear Nuevo Tópico Dinámico</h4>
            <form onSubmit={handleCreateTopic} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#555', display: 'block' }}>Nombre:</label>
                <input
                  type="text"
                  placeholder="ej. andesstay.custom"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#555', display: 'block' }}>Particiones:</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={newPartitions}
                  onChange={(e) => setNewPartitions(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#555', display: 'block' }}>Retención (días):</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={newRetentionDays}
                  onChange={(e) => setNewRetentionDays(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#555', display: 'block' }}>Cleanup Policy:</label>
                <select
                  value={newCleanupPolicy}
                  onChange={(e) => setNewCleanupPolicy(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', background: '#fff' }}
                >
                  <option value="delete">delete</option>
                  <option value="compact">compact</option>
                </select>
              </div>
              <div>
                <button
                  type="submit"
                  style={{ width: '100%', padding: '0.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Crear Tópico
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Consumer Groups */}
        <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <h3 style={{ margin: '0 0 1rem', color: '#0b2545' }}>👥 Grupos de Consumidores (Consumer Groups)</h3>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
            Demuestra el balanceo de particiones y división de responsabilidades entre <b>Analítica</b> y <b>Auditoría</b> (Indicador 8).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ padding: '0.8rem', border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ color: '#1e40af' }}>andesstay-group-analytics</b>
                <span style={{ fontSize: '0.75rem', background: '#22c55e', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                  ACTIVO
                </span>
              </div>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: '#475569' }}>
                <b>Responsabilidad:</b> Suscrito a <i>andesstay.reservations.stream</i> y <i>andesstay.analytics.telemetry</i> para métricas de ocupación y alertas en tiempo real.
              </p>
            </div>

            <div style={{ padding: '0.8rem', border: '1px solid #fed7aa', background: '#fff7ed', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ color: '#9a3412' }}>andesstay-group-audit</b>
                <span style={{ fontSize: '0.75rem', background: '#22c55e', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                  ACTIVO
                </span>
              </div>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: '#475569' }}>
                <b>Responsabilidad:</b> Asiento inmutable e independiente de auditoría forense sobre el flujo completo de eventos sin competir en offset con Analítica.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Streaming en Vivo */}
      <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
        <h3 style={{ margin: '0 0 1rem', color: '#0b2545' }}>📊 Monitor de Eventos de Streaming Recibidos (@KafkaListener)</h3>
        {logs.length === 0 ? (
          <p style={{ color: '#888', fontStyle: 'italic' }}>
            Aún no se registran eventos de streaming en tiempo real. Pulsa <b>"📡 Emitir Streaming a Kafka"</b> arriba para disparar eventos.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#334155', color: '#fff', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Hora</th>
                  <th style={{ padding: '0.5rem' }}>Tipo Evento</th>
                  <th style={{ padding: '0.5rem' }}>Tópico / Grupo</th>
                  <th style={{ padding: '0.5rem' }}>Detalle de Negocio</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 10).map((l, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem' }}>{new Date(l.timestamp).toLocaleTimeString()}</td>
                    <td style={{ padding: '0.5rem', fontWeight: 'bold', color: '#0369a1' }}>{l.type}</td>
                    <td style={{ padding: '0.5rem' }}>{l.queue}</td>
                    <td style={{ padding: '0.5rem' }}>{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
