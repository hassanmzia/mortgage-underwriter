# AI Mortgage Underwriter

A professional multi-agent autonomous AI mortgage underwriting system built with MCP (Model Context Protocol), A2A (Agent-to-Agent) communication, and RAG (Retrieval Augmented Generation).

## Architecture Overview

```
                                    +------------------+
                                    |     Nginx        |
                                    |   (Reverse Proxy)|
                                    +--------+---------+
                                             |
              +------------------------------+------------------------------+
              |                              |                              |
    +---------v---------+         +----------v----------+         +---------v---------+
    |   React Frontend  |         |   Django Backend    |         |  MCP Agent Service|
    |   (TypeScript)    |         |   (REST API)        |         |  (Node.js/TS)     |
    +-------------------+         +----------+----------+         +---------+---------+
                                             |                              |
                        +--------------------+--------------------+         |
                        |                    |                    |         |
              +---------v----+     +---------v----+     +---------v----+    |
              |  PostgreSQL  |     |    Redis     |     |   Celery     |    |
              |  (Database)  |     |   (Cache)    |     |  (Tasks)     |    |
              +--------------+     +--------------+     +--------------+    |
                                                                           |
                                                              +------------v------------+
                                                              |       ChromaDB          |
                                                              |  (Vector Store for RAG) |
                                                              +-------------------------+
```

## Features

### Multi-Agent System
- **Credit Analyst Agent**: Analyzes credit history, scores, and payment patterns
- **Income Analyst Agent**: Verifies employment and income stability
- **Asset Analyst Agent**: Evaluates liquid assets and reserves
- **Collateral Analyst Agent**: Assesses property value and LTV ratios
- **Critic Agent**: Reviews analyses for quality and bias detection
- **Decision Agent**: Makes final underwriting recommendations

### MCP (Model Context Protocol)
- Standardized tool exposure to LLM agents
- Calculator tools for DTI, LTV, reserves, housing ratios
- Credit score policy checking
- Large deposit verification

### A2A (Agent-to-Agent) Communication
- Event-driven messaging between agents
- Centralized communication hub
- Message history and tracking

### RAG (Retrieval Augmented Generation)
- ChromaDB vector store integration
- Policy document retrieval
- Context-aware agent responses

### Compliance & Fair Lending
- Bias detection and flagging
- PII sanitization logging
- ECOA, Fair Housing Act, HMDA compliance
- Audit trail for all decisions

### Human-in-the-Loop
- Manual review workflow for edge cases
- Underwriter override capabilities
- Stipulation management

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend API | Django 5.0 + Django REST Framework |
| Agent Service | Node.js + TypeScript + Express |
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Database | PostgreSQL 15 |
| Cache/Queue | Redis 7 |
| Task Queue | Celery |
| Vector Store | ChromaDB |
| LLM | OpenAI GPT-4o-mini |
| Reverse Proxy | Nginx |
| Containerization | Docker + Docker Compose |

## Quick Start

### Prerequisites
- Docker and Docker Compose
- OpenAI API key

### 1. Clone and Configure

```bash
cd mortgage-underwriter

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp mcp-agents/.env.example mcp-agents/.env

# Edit .env files and add your OpenAI API key
```

### 2. Start Services

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 3. Initialize Database

```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Load sample policy documents (optional)
docker-compose exec backend python manage.py loaddata sample_policies
```

### 4. Access the Application

- **Frontend**: http://localhost:3060
- **Django Admin**: http://localhost:3060/admin
- **API Documentation**: http://localhost:3060/api/docs/
- **MCP Agent API**: http://localhost:3060/mcp-api/

## Project Structure

```
mortgage-underwriter/
├── backend/                    # Django backend
│   ├── config/                 # Django settings
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── celery.py
│   │   └── asgi.py
│   ├── applications/           # Django apps
│   │   ├── users/              # User management
│   │   ├── applications/       # Loan applications
│   │   ├── underwriting/       # Workflow & decisions
│   │   ├── agents/             # Agent configuration
│   │   ├── compliance/         # Fair lending & audit
│   │   └── api/                # REST API endpoints
│   ├── requirements.txt
│   └── Dockerfile
│
├── mcp-agents/                 # Node.js MCP service
│   ├── src/
│   │   ├── agents/             # AI agents
│   │   │   ├── baseAgent.ts
│   │   │   ├── creditAnalyst.ts
│   │   │   ├── incomeAnalyst.ts
│   │   │   ├── assetAnalyst.ts
│   │   │   ├── collateralAnalyst.ts
│   │   │   ├── criticAgent.ts
│   │   │   └── decisionAgent.ts
│   │   ├── tools/              # MCP tools
│   │   │   └── calculators.ts
│   │   ├── mcp/                # MCP server
│   │   │   └── server.ts
│   │   ├── a2a/                # Agent-to-Agent hub
│   │   │   └── hub.ts
│   │   ├── rag/                # RAG integration
│   │   │   └── chromaClient.ts
│   │   ├── services/           # Business logic
│   │   │   └── workflowOrchestrator.ts
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API services
│   │   ├── store/              # Zustand state
│   │   ├── types/              # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── nginx/                      # Nginx configuration
│   └── nginx.conf
│
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | User login |
| POST | `/api/auth/logout/` | User logout |
| GET | `/api/auth/me/` | Get current user |

### Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications/` | List applications |
| POST | `/api/applications/` | Create application |
| GET | `/api/applications/{id}/` | Get application |
| POST | `/api/applications/{id}/submit/` | Submit for underwriting |

### Underwriting
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/underwriting/workflows/` | List workflows |
| GET | `/api/underwriting/workflows/{id}/` | Get workflow details |
| POST | `/api/underwriting/workflows/{id}/approve/` | Approve decision |
| POST | `/api/underwriting/workflows/{id}/deny/` | Deny application |

### Compliance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/compliance/bias-flags/` | List bias flags |
| POST | `/api/compliance/bias-flags/{id}/resolve/` | Resolve bias flag |
| GET | `/api/compliance/fair-lending-reports/` | Get fair lending reports |

### MCP Agent API
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/mcp-api/workflow/start` | Start underwriting workflow |
| GET | `/mcp-api/workflow/{id}/status` | Get workflow status |
| GET | `/mcp-api/agents` | List available agents |
| POST | `/mcp-api/tools/execute` | Execute MCP tool |

## Agent Workflow

```
1. Application Submitted
        │
        ▼
2. Credit Analyst ─────────────────┐
        │                          │
        ▼                          │
3. Income Analyst                  │
        │                          │  A2A Messages
        ▼                          │
4. Asset Analyst                   │
        │                          │
        ▼                          │
5. Collateral Analyst ◄────────────┘
        │
        ▼
6. Critic Agent (Quality Review + Bias Check)
        │
        ├── Bias Detected? → Human Review Queue
        │
        ▼
7. Decision Agent
        │
        ├── Approve → Generate Conditions
        ├── Deny → Generate Denial Reasons
        └── Refer → Human Review Required
```

## MCP Tools

### Calculators
- `calculate_dti` - Debt-to-Income ratio calculation
- `calculate_ltv` - Loan-to-Value ratio calculation
- `calculate_reserves` - Reserve months calculation
- `calculate_housing_ratio` - Front-end housing ratio
- `check_credit_score_policy` - Credit score policy compliance
- `check_large_deposits` - Large deposit verification

### Tool Schema Example
```typescript
const DTIInputSchema = z.object({
  monthlyDebt: z.number().describe('Total monthly debt payments'),
  monthlyIncome: z.number().describe('Total monthly gross income'),
});
```

## Environment Variables

### Backend (.env)
```
DJANGO_SECRET_KEY=your-secret-key
DATABASE_URL=postgres://user:pass@localhost:5432/mortgage
REDIS_URL=redis://localhost:6379/0
MCP_SERVICE_URL=http://localhost:3000
OPENAI_API_KEY=your-openai-key
```

### MCP Agents (.env)
```
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4o-mini
CHROMADB_HOST=localhost
CHROMADB_PORT=8000
REDIS_URL=redis://localhost:6379/1
DJANGO_API_URL=http://localhost:8001
```

## Development

### Running Locally (Without Docker)

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8001
```

#### MCP Agents
```bash
cd mcp-agents
npm install
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
# Backend tests
docker-compose exec backend pytest

# MCP service tests
docker-compose exec mcp-agents npm test

# Frontend tests
docker-compose exec frontend npm test
```

## Monitoring

### Real-time Updates
The frontend connects to the MCP service via WebSocket for real-time workflow updates:
- Agent progress notifications
- Analysis completions
- Decision announcements

### Agent Metrics
Track agent performance through the Agent Monitor dashboard:
- Analysis count
- Average processing time
- Success rate
- Error rate

## Security Considerations

- JWT-based authentication
- CORS configuration
- Rate limiting on API endpoints
- PII data sanitization
- Audit logging for all decisions
- Role-based access control

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
