# HyperKart - AI-Powered Hyperlocal E-Commerce Platform

**HyperKart** is a full-stack, enterprise-ready hyperlocal e-commerce platform that connects local buyers with neighborhood sellers and delivery partners, featuring AI-driven product recommendations and real-time location mapping.

---

## 📁 Project Directory Hierarchy

```
HyperKart/
├── frontend/                        # React 19 + Vite + TailwindCSS Frontend Application
│   ├── src/
│   │   ├── components/              # Shared UI components (Layout, Modals, Maps, Widgets)
│   │   ├── pages/                   # Application views (Home, Cart, Admin, Seller, Driver, Orders)
│   │   ├── lib/                     # Utilities & API helpers (WhatsApp integration, axios)
│   │   ├── store/                   # Redux Toolkit state management
│   │   ├── App.jsx                  # Main React routing setup
│   │   └── main.jsx                 # React DOM entry point
│   ├── public/                      # Static assets & htaccess configuration
│   ├── index.html                   # Vite HTML entry point
│   ├── vite.config.js               # Vite build & proxy configuration
│   └── package.json                 # Frontend dependencies & build scripts
│
├── backend/                         # Spring Boot Backend API Service
│   └── demo/
│       ├── src/
│       │   ├── main/
│       │   │   ├── java/com/example/demo/
│       │   │   │   ├── auth/        # Spring Security, JWT, User Details & Data Initializer
│       │   │   │   ├── common/      # Global exceptions, Health check, Public APIs, Data Seeders
│       │   │   │   ├── geo/         # Geospatial & location calculation services
│       │   │   │   ├── order/       # Order management, status updates & WebSocket events
│       │   │   │   ├── product/     # Product catalog & stock management
│       │   │   │   ├── seller/      # Seller profile & inventory management
│       │   │   │   └── DemoApplication.java  # Spring Boot main class
│       │   │   └── resources/
│       │   │       ├── application.properties # Server port, MongoDB & JWT settings
│       │   │       └── static/      # Compiled static assets distribution
│       ├── pom.xml                  # Maven dependencies & build configuration
│       └── mvnw.cmd                 # Maven wrapper script
│
├── ai-service/                      # FastAPI Python Microservice
│   ├── main.py                      # FastAPI server with OpenAI product recommendation engines
│   ├── requirements.txt             # Python dependencies (FastAPI, Uvicorn, OpenAI, Pydantic)
│   └── Dockerfile                   # AI Service container image definition
│
├── docs/                            # Project documentation & architectural assets
├── docker-compose.yml               # Multi-container orchestration (MongoDB, Backend, AI, Frontend)
├── .env.example                     # Environment template configuration file
├── .env                             # Local environment variables
├── index.html                       # Root redirector & entry point
├── deploy-frontend.ps1              # Automated PowerShell build & deployment script
├── database.sql                     # SQL schema backup reference
├── hyperkart_database.sql           # Primary HyperKart SQL dataset backup
└── replace_name.ps1                 # Utility script for project updates
```

---

## ⚡ Technical Stack

* **Frontend**: React 19, Vite 8, Redux Toolkit, TailwindCSS 4, React Router 7.
* **Backend**: Java 17, Spring Boot 3, Spring Security, JWT Authentication, WebSocket / STOMP.
* **AI Service**: Python 3.11+, FastAPI, Pydantic, OpenAI API (`gpt-4o-mini`).
* **Database**: MongoDB 7.0 (Primary) / SQL backups.
* **DevOps**: Docker, Docker Compose, PowerShell deployment scripts.

---

## 🚀 Running the Project

### Option A: Docker Compose (Recommended)
To launch all services (MongoDB, Backend, AI Service, and Frontend) simultaneously:

```bash
docker-compose up --build
```

Access points:
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8085`
- **AI Microservice**: `http://localhost:8000`

### Option B: Running Services Individually

1. **Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
2. **Backend**:
   ```bash
   cd backend/demo
   .\mvnw.cmd spring-boot:run
   ```
3. **AI Microservice**:
   ```bash
   cd ai-service
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

---

## ✅ Build & Compilation Status

- **Backend (Spring Boot / Maven)**: Compiled with **0 errors** (`mvnw compile` - SUCCESS).
- **Frontend (Vite / React)**: Bundled with **0 errors** (`vite build` - SUCCESS).
