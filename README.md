<div align="center">
  <a href="https://mindvault-39809.web.app">
    <img src="./frontend/public/logo.png" alt="MindVault Logo" width="120" height="120">
  </a>
  
  # MindVault AI

  **A cryptographically secure, private second brain powered by Google Gemini.**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
  [![Fastify](https://img.shields.io/badge/Fastify-4.28-000000?logo=fastify&logoColor=white)](https://www.fastify.io/)
  [![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
  [![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google&logoColor=white)](https://aistudio.google.com/)

  ### [🚀 Try the Live Demo](https://mindvault-39809.web.app/)

</div>

---

## 📖 Overview

**MindVault AI** is a highly secure, privacy-first personal intelligence platform. It acts as an AI-powered "second brain" that engages with you in reflective dialogue, automatically synthesizing your unstructured thoughts into actionable memories, recurring patterns, and structured goals. 

Unlike standard chat applications, MindVault is built on a **Non-Negotiable Security Constitution**, ensuring that your private reflections remain strictly yours. It utilizes a zero-trust browser architecture, rigid Firestore security rules, and server-side token validation to cryptographically isolate your data from all other users.

---

## ✨ Core Capabilities

- **🧠 Reflective AI Dialogue:** Chat with a finely-tuned Google Gemini model designed to prompt introspection and untangle complex thoughts.
- **🕸️ Dynamic Memory Graph:** As you chat, the intelligence pipeline extracts core facts, decisions, and goals, wiring them into an interconnected knowledge graph.
- **🛡️ Multi-Layer Security:** End-to-end security architecture preventing XSS, Prompt Injection, and unauthorized cross-tenant data access.
- **📊 Intuitive Dashboard:** A sleek, responsive dashboard built with Tailwind CSS and React to visualize your emerging thought patterns and recurring insights.

---

## 🏛️ Architecture

MindVault AI utilizes a modern, server-authoritative architecture to ensure that the browser is never trusted with sensitive credentials.

```mermaid
graph LR
  subgraph "UNTRUSTED ZONE (Client Browser)"
    ReactApp[React Frontend App]
  end
  
  ReactApp -->|1. Credentials| FirebaseAuth[Firebase Auth Service]
  FirebaseAuth -->|2. ID Token JWT| ReactApp
  
  subgraph "SECURE BACKEND (Cloud Run / Fastify API)"
    ReactApp -->|3. HTTPS Bearer Token| API[Fastify Node.js API]
    API -->|4. Verify Token| AuthMiddleware[Firebase Admin SDK]
    API -->|5. AI Integration| GeminiAPI[Google Gemini Flash]
    API -->|6. Scoped Query UID| Firestore[Firestore Database]
  end
```

---

## 🛠️ Technology Stack

### Frontend (User Interface)
* **Framework:** React 18 with TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS + custom UI components
* **Routing:** React Router v6
* **Icons:** Lucide React

### Backend (Secure API)
* **Framework:** Fastify (High-performance Node.js web framework)
* **Language:** TypeScript
* **AI Provider:** Google Generative AI SDK (`gemini-flash-latest`)
* **Authentication:** Firebase Admin SDK (JWT Validation)
* **Validation:** Zod (Strict schema enforcement)

### Infrastructure & Database
* **Database:** Google Cloud Firestore (NoSQL Document Store)
* **Auth Provider:** Firebase Authentication
* **Security Rules:** Strict `firestore.rules` enforcement

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: `v18.x` or higher
* **npm**: `v9.x` or higher
* **Firebase Project**: An active Firebase project with Authentication (Email/Password) and Firestore enabled.
* **Google AI Studio**: A valid Gemini API Key (`AIza...`).

### 1. Clone the Repository
```bash
git clone https://github.com/JAY4IGNITE/MindVault.git
cd MindVault
```

### 2. Configure the Environment
You will need to configure environment variables for both the frontend and backend.

**Frontend (`frontend/.env`):**
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_BACKEND_URL=http://localhost:3000
```

**Backend (`backend/.env`):**
```env
PORT=3000
NODE_ENV=development
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GEMINI_API_KEY=your_google_gemini_api_key
```

*Note: You must also place your Firebase `service-account.json` file in the `backend/` directory.*

### 3. Run the Backend API
```bash
cd backend
npm install
npm run dev
```

### 4. Run the Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛡️ Security Constitution

MindVault operates under a strict Threat Model. To ensure compliance, the codebase enforces the following:

1. **Zero Trust Browser:** No backend secrets, Gemini keys, or service accounts are bundled into the Vite application.
2. **Strict Tenant Scoping:** Firestore Security Rules and Fastify route handlers exclusively scope all database reads/writes to `/users/{uid}/...` based on the securely decoded JWT.
3. **Data Sanitization:** All user inputs are sanitized using DOMPurify before rendering to prevent Cross-Site Scripting (XSS).
4. **Prompt Injection Mitigation:** User input is strictly wrapped in `<user_provided_content>` tags, and the system prompt explicitly commands the AI to ignore any adversarial instructions found within those tags.

### Running Security Tests
The repository includes automated test suites covering all security boundaries.

```bash
# 1. Firestore Security Rules Isolation Tests
cd backend && npm run test:security

# 2. Backend Integration & Authentication Tests
cd backend && npm run test:integration

# 3. Frontend Sanitization Tests
cd frontend && npx vitest run
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<div align="center">
  <sub>Built with security, intelligence, and privacy in mind.</sub>
</div>
