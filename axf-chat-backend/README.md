# AXF Chat Backend 🏋️

Backend de chat en tiempo real para la plataforma AXF — comunicación entre entrenador y suscriptores.

## Stack

- **Node.js + Express** — API REST
- **Socket.io** — Mensajería en tiempo real (WebSocket)
- **Prisma ORM** — Base de datos (PostgreSQL)
- **JWT** — Autenticación
- **bcryptjs** — Hash de contraseñas

---

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env
# Editar .env con tus valores reales

# 3. Generar cliente Prisma
npm run prisma:generate

# 4. Correr migraciones
npm run prisma:migrate

# 5. Iniciar servidor
npm run dev
```

---

## Variables de entorno (.env)

| Variable        | Descripción                          | Ejemplo                                         |
|-----------------|--------------------------------------|-------------------------------------------------|
| `DATABASE_URL`  | Cadena de conexión PostgreSQL        | `postgresql://user:pass@localhost:5432/axf_db`  |
| `JWT_SECRET`    | Clave secreta para firmar JWT        | `mi_secreto_seguro`                             |
| `JWT_EXPIRES_IN`| Duración del token                   | `7d`                                            |
| `PORT`          | Puerto del servidor                  | `3001`                                          |
| `CLIENT_URL`    | URL del frontend (CORS)              | `http://localhost:3000`                         |

---

## API REST

### Auth

| Método | Ruta               | Descripción                   | Auth |
|--------|--------------------|-------------------------------|------|
| POST   | `/api/auth/register` | Registrar usuario           | ❌   |
| POST   | `/api/auth/login`    | Iniciar sesión              | ❌   |
| GET    | `/api/auth/me`       | Obtener usuario actual      | ✅   |

#### POST /api/auth/register
```json
{
  "name": "Laura Mendiola",
  "email": "laura@email.com",
  "password": "123456",
  "role": "SUBSCRIBER",
  "trainerId": "cuid_del_entrenador"
}
```

#### POST /api/auth/login
```json
{
  "email": "laura@email.com",
  "password": "123456"
}
```

---

### Chat

| Método | Ruta                                    | Descripción                        | Rol          |
|--------|-----------------------------------------|------------------------------------|--------------|
| GET    | `/api/chat/conversations`               | Lista de conversaciones            | Todos        |
| POST   | `/api/chat/conversations`               | Crear o abrir conversación         | Todos        |
| GET    | `/api/chat/conversations/:id/messages`  | Historial de mensajes (paginado)   | Todos        |
| GET    | `/api/chat/subscribers`                 | Lista de suscriptores              | Solo trainer |
| GET    | `/api/chat/unread-count`                | Total de mensajes no leídos        | Todos        |

#### POST /api/chat/conversations
```json
{
  "participantId": "cuid_del_suscriptor_o_entrenador"
}
```

#### GET /api/chat/conversations/:id/messages
```
?page=1&limit=30
```

---

### Usuarios

| Método | Ruta                  | Descripción                          | Auth |
|--------|-----------------------|--------------------------------------|------|
| GET    | `/api/users/online`   | Usuarios online                      | ✅   |
| GET    | `/api/users/search`   | Buscar usuario por nombre (`?q=`)    | ✅   |

---

## WebSocket (Socket.io)

### Autenticación
El cliente debe enviar el JWT en el handshake:

```javascript
const socket = io("http://localhost:3001", {
  auth: { token: "Bearer_token_aqui" }
});
```

---

### Eventos del cliente → servidor

#### `message:send`
Enviar un mensaje.
```javascript
socket.emit("message:send", {
  conversationId: "conv_id",
  content: "Hola, ¿puedo preguntarte algo?",
  type: "TEXT"  // TEXT | IMAGE | FILE | AUDIO
}, (response) => {
  // response: { ok: true, message: {...} }
});
```

#### `messages:read`
Marcar mensajes de una conversación como leídos.
```javascript
socket.emit("messages:read", { conversationId: "conv_id" });
```

#### `typing:start` / `typing:stop`
Indicador de escritura.
```javascript
socket.emit("typing:start", { conversationId: "conv_id" });
socket.emit("typing:stop",  { conversationId: "conv_id" });
```

#### `conversation:join`
Unirse a la sala de una conversación (necesario para recibir eventos de escritura).
```javascript
socket.emit("conversation:join", "conv_id");
```

---

### Eventos servidor → cliente

| Evento            | Cuándo se emite                              | Payload                                      |
|-------------------|----------------------------------------------|----------------------------------------------|
| `message:new`     | Cuando llega un mensaje nuevo                | `{ conversationId, message }`                |
| `messages:read`   | Cuando el otro leyó tus mensajes             | `{ conversationId, readBy }`                 |
| `typing:start`    | Cuando el otro empieza a escribir            | `{ userId, userName, conversationId }`       |
| `typing:stop`     | Cuando el otro deja de escribir              | `{ userId, conversationId }`                 |
| `user:online`     | Cuando un usuario se conecta                 | `{ userId }`                                 |
| `user:offline`    | Cuando un usuario se desconecta              | `{ userId, lastSeen }`                       |

---

## Ejemplo de uso en el frontend

```javascript
// 1. Login y guardar token
const { token } = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
}).then(r => r.json());

// 2. Conectar socket
const socket = io('http://localhost:3001', { auth: { token } });

// 3. Abrir conversación con un suscriptor
const { conversation } = await fetch('/api/chat/conversations', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ participantId: 'id_del_suscriptor' })
}).then(r => r.json());

// 4. Unirse a la sala y cargar historial
socket.emit('conversation:join', conversation.id);

// 5. Escuchar mensajes nuevos
socket.on('message:new', ({ conversationId, message }) => {
  console.log('Nuevo mensaje:', message.content);
});

// 6. Enviar mensaje
socket.emit('message:send', {
  conversationId: conversation.id,
  content: 'Claro que sí, Laura. ¿En qué te puedo ayudar?'
}, (res) => console.log('Enviado:', res));
```

---

## Estructura del proyecto

```
axf-chat-backend/
├── prisma/
│   └── schema.prisma          # Modelos de DB
├── src/
│   ├── config/
│   │   └── socket.js          # Motor WebSocket (Socket.io)
│   ├── controllers/
│   │   ├── auth.controller.js # Login / Register
│   │   ├── chat.controller.js # Conversaciones y mensajes
│   │   └── user.controller.js # Usuarios
│   ├── middleware/
│   │   └── auth.middleware.js # Verificación JWT
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── chat.routes.js
│   │   └── user.routes.js
│   ├── app.js                 # Express app
│   └── index.js               # Entry point
├── .env.example
└── package.json
```
