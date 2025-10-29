# Frontend AndesStay - Sistema de Gestión Hotelera y Lodges

**Asignatura:** DSY1107 - Desarrollo Cloud Native I  
**Evaluación:** Evaluación Parcial N°1 (EP1)  
**Caso de Estudio:** Caso 5 - Red de Hoteles, Cabañas y Lodges AndesStay  
**Alumno:** Samuel Urzua Moraga (`sa.urzua@duocuc.cl`)  

---

## 📋 Descripción del Proyecto

Aplicación SPA desarrollada en **React + Vite** para la gestión unificada de reservas, unidades de alojamiento (cabañas, lodges, habitaciones), métricas operativas y trazabilidad de eventos para la red AndesStay.

Cuenta con integración completa de identidad corporativa mediante **Azure Active Directory (Microsoft Entra ID)** a través de la librería oficial `@azure/msal-react` y `@azure/msal-browser`, y se comunica de forma segura con **AWS API Gateway (HTTP API)** utilizando tokens Bearer JWT validados en la nube.

---

## 🚀 Tecnologías Utilizadas

- **Framework:** React 19 + Vite
- **Autenticación IDaaS:** `@azure/msal-browser` & `@azure/msal-react` (Microsoft Entra ID)
- **Cliente HTTP:** Axios con interceptores automáticos de autenticación y adquisición silenciosa de tokens
- **Rutas y Navegación:** React Router v7
- **Estilos:** Tailwind CSS

---

## 🔐 Seguridad y Flujo de Autenticación

1. **Login Corporativo con Azure AD:**
   - La aplicación redirige o utiliza popups mediante MSAL hacia el Tenant de Azure AD configurado (`64ab2952-0d1a-49ef-a64b-0494bc1432e8`).
   - El token emitido contiene el audience (`api://32043bc9-7878-4474-b8d2-61cb242aab22`), los roles de usuario (`Admin`, `Recepcionista`, `Huesped`, `Auditor`) y los scopes requeridos (`Reservations.ReadWrite`).

2. **Interceptores de Axios:**
   - Cada petición hacia el backend adquiere el token JWT vigente de forma transparente (`acquireTokenSilent`) e inyecta la cabecera:
     ```http
     Authorization: Bearer <access_token>
     ```

3. **Consumo de Cloud Gateway:**
   - Las peticiones se dirigen al endpoint seguro de **AWS API Gateway HTTP API**:
     `https://qap60rytu3.execute-api.us-east-1.amazonaws.com`

---

## 💻 Vistas Implementadas

| Vista | Ruta | Roles Permitidos | Funcionalidad |
| :--- | :--- | :--- | :--- |
| **Login** | `/login` | Público | Autenticación institucional con Microsoft Azure AD |
| **Reservas** | `/reservations` | Admin, Recepcionista, Huesped | Listar reservas y cambiar estados (`CONFIRMADA`, `CANCELADA`, etc.) |
| **Catálogo** | `/catalog` | Admin, Recepcionista | Listar cabañas y habitaciones, capacidades y tarifas base |
| **Reportería** | `/reports` | Admin | Panel de KPIs operacionales (reservas/hora, tiempo de ciclo, ocupación) |
| **Auditoría** | `/audit` | Admin, Auditor | Timeline y trazabilidad de eventos de hospedaje |

---

## 🛠️ Instalación y Ejecución Local

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```
   La aplicación se abrirá en `http://localhost:5173`.
