# 🔐 Authentication Backend

A secure authentication REST API built with **Node.js, Express.js, and PostgreSQL**.

## 🚀 Features

* User signup and login
* Email OTP verification
* OTP expiration and attempt limits
* OTP resend cooldown
* Password hashing with bcrypt
* JWT authentication
* Protected routes
* API rate limiting
* PostgreSQL database
* Resend email integration
* Environment variable configuration

## 🛠️ Tech Stack

* Node.js
* Express.js
* PostgreSQL
* bcrypt
* JWT
* Resend
* express-rate-limit

## 📁 Project Structure

```text
auth-backend/
├── config/
│   └── db.js
├── controllers/
│   └── authController.js
├── middleware/
│   ├── authMiddleware.js
│   └── rateLimiter.js
├── routes/
│   ├── authRoutes.js
│   └── userRoutes.js
├── services/
│   └── emailService.js
├── .env
├── .gitignore
├── package.json
└── server.js
```

## ⚙️ Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd auth-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file:

```env
PORT=5000

DB_USER=postgres
DB_HOST=localhost
DB_NAME=authdb
DB_PASSWORD=
DB_PORT=5432

JWT_SECRET=your_random_secret
JWT_EXPIRES_IN=1d

RESEND_API_KEY=your_resend_api_key
```

### 4. Start the server

```bash
node server.js
```

Server:

```text
http://localhost:5000
```

## 📡 API Endpoints

| Method | Endpoint                 | Description       |
| ------ | ------------------------ | ----------------- |
| POST   | `/api/auth/signup`       | Register user     |
| POST   | `/api/auth/verify-email` | Verify email OTP  |
| POST   | `/api/auth/login`        | Login             |
| GET    | `/api/users/profile`     | Protected profile |

## 🔑 Authentication Flow

```text
Signup
  ↓
OTP sent to email
  ↓
Verify OTP
  ↓
User created
  ↓
Login
  ↓
JWT Token
  ↓
Protected Routes
```

## 🛡️ Security

* bcrypt password hashing
* Hashed OTP storage
* JWT authentication
* OTP expiration
* OTP attempt limits
* Rate limiting
* Parameterized PostgreSQL queries
* Environment-based secrets
