# API Specification: Passwordless Authentication System

## 1. Authentication Endpoints

### 1. Request Magic Link

Generates and dispatches a single-use magic link via Email.

- **URL:** `/api/auth/request-link`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

#### Request Payload

```json
{
  "identifier": "student@college.edu",
  "type": "email"
}
```

Only the `email` channel is supported; other channel types return `400 Bad Request`.

#### Success Response

- **Code:** `200 OK`
- **Payload:**

```json
{
  "success": true,
  "message": "If the details provided are valid, a magic link has been dispatched."
}
```

#### Error Responses

- **Code:** `400 Bad Request` (Invalid email format or unsupported channel)

```json
{
  "success": false,
  "error": "Invalid email address format."
}
```

- **Code:** `429 Too Many Requests` (Rate limit exceeded)

```json
{
  "success": false,
  "error": "Rate limit exceeded. Please wait 15 minutes before requesting another link."
}
```

---

### 2. Verify Magic Link Token

Validates token hash, claims single-use token atomically, provisions user, and issues HTTP-only session cookie.

- **URL:** `/api/auth/verify`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

#### Request Payload

```json
{
  "token": "4e7c3b2f901a8d76e5c4b3a2f109876543210fedcba9876543210abcdef01234"
}
```

#### Success Response

- **Code:** `200 OK`
- **Headers:** `Set-Cookie: auth_session=<session_secret>; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
- **Payload:**

```json
{
  "success": true,
  "redirectUrl": "/dashboard"
}
```

#### Error Responses

- **Code:** `400 Bad Request` (Token missing, malformed, expired, or already used)

```json
{
  "success": false,
  "error": "Invalid, expired, or previously consumed magic link."
}
```

---

### 3. Retrieve Session Profile

Inspects the HTTP-only session cookie and returns authenticated user and session metadata.

- **URL:** `/api/auth/session`
- **Method:** `GET`

#### Success Response

- **Code:** `200 OK`
- **Payload:**

```json
{
  "success": true,
  "authenticated": true,
  "user": {
    "id": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "email": "student@college.edu",
    "phone": null,
    "createdAt": "2026-09-25T17:00:00.000Z"
  },
  "session": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "expiresAt": "2026-10-02T17:00:00.000Z",
    "createdAt": "2026-09-25T17:00:00.000Z"
  }
}
```

#### Error Response

- **Code:** `401 Unauthorized`

```json
{
  "success": false,
  "error": "Unauthenticated. No valid session found."
}
```

---

### 4. Logout Session

Invalidates the session in the database and clears the HTTP-only cookie.

- **URL:** `/api/auth/logout`
- **Method:** `POST`

#### Success Response

- **Code:** `200 OK`
- **Headers:** `Set-Cookie: auth_session=; Path=/; HttpOnly; Max-Age=0`
- **Payload:**

```json
{
  "success": true,
  "message": "Logged out successfully."
}
```
