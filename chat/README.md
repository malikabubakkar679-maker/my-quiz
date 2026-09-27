# NightChat

A full-stack, dark-themed real-time chat app.

- `app/`: Flutter client (Android, iOS, Web)
- `server/`: Node.js backend (Express REST API + Socket.IO)

## Features

- Animated splash screen, then a three-page onboarding flow (only shown the first time)
- Sign up with a **required unique username** (availability checked live), a password, a display name, a profile photo and a bio
- Log in with username and password; the session is remembered on the device
- Real-time one-to-one chats with typing indicators, online presence, "last seen", unread badges and read receipts
- People tab to search users and start conversations
- Profile tab to view and edit your photo, display name and bio, and to log out
- Classic dark design with a violet-to-blue gradient accent

## Running the backend

```bash
cd chat/server
npm install
npm start          # http://localhost:4000
```

Environment variables (all optional): `PORT` (default `4000`), `DATA_DIR` (JSON database, default `./data`), `UPLOAD_DIR` (profile images, default `./uploads`), `WEB_DIR` (Flutter web build served at `/`, default `../app/build/web`).

## Running the Flutter app

```bash
cd chat/app
flutter pub get
flutter run                                         # Android emulator uses http://10.0.2.2:4000
flutter run --dart-define=API_URL=http://192.168.1.10:4000   # physical device
```

For web, build it and let the backend serve it from the same origin:

```bash
cd chat/app && flutter build web
cd ../server && npm start   # open http://localhost:4000
```

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/auth/username-available?username=` | Check username |
| POST | `/api/auth/register` | `{username, password, displayName, bio, avatar}` (`avatar` is a base64 data URL) |
| POST | `/api/auth/login` | `{username, password}` |
| POST | `/api/auth/logout` | End session |
| GET/PUT | `/api/me` | Get or update your profile |
| GET | `/api/users?q=` | Search users |
| GET/POST | `/api/conversations` | List chats / open a chat with `{userId}` |
| GET/POST | `/api/conversations/:id/messages` | Read or send messages |
| POST | `/api/conversations/:id/read` | Mark as read |

Authenticated requests use `Authorization: Bearer <token>`. Socket.IO connects with `auth: {token}` and emits `message:new`, `typing`, `presence`, `conversation:read` and `user:updated`.
