# Overview

Davies CQ × AI Scheduler is a comprehensive monorepo containing an AI-powered field adjuster scheduling and communication system. The application combines a Next.js Progressive Web App dashboard with multiple Node.js microservices to automate appointment scheduling, route optimization, and stakeholder communications for insurance claim processing. The system integrates with Davies CQ/CoreLogic/XactAnalysis systems and provides intelligent scheduling suggestions using OpenAI's GPT models.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: Next.js 14 with App Router and TypeScript
- **UI**: Tailwind CSS with shadcn/ui components for consistent styling
- **PWA Features**: Service worker implementation for offline functionality and background sync
- **State Management**: React hooks with client-side API calls to backend services
- **Offline Support**: IndexedDB caching with queue-based sync when connection resumes

## Backend Architecture
- **Pattern**: Microservices architecture with API Gateway as single entry point
- **Services**: 
  - API Gateway (Fastify) - routing, authentication, rate limiting
  - CQ Middleware - Davies CQ integration and address verification
  - Communications Service - SMS/Email/WhatsApp messaging
  - Scheduler Service - AI-powered appointment optimization
  - Routing Service - geocoding and route optimization
  - Worker Service - background job processing with BullMQ

## Data Storage
- **Database**: PostgreSQL with raw SQL queries (no ORM)
- **Schema**: Enhanced claim tracking with property loss form fields, stakeholder management, and communication logs
- **Caching**: In-memory caching for provider responses and routing data
- **Offline Storage**: Browser IndexedDB for PWA offline capabilities

## Authentication & Authorization
- **User Authentication**: SAML/OIDC SSO for adjuster login
- **Service Authentication**: OAuth2 client credentials for inter-service communication
- **Security**: Helmet.js security headers, CORS configuration, rate limiting

## AI Integration
- **Model**: OpenAI GPT-5 for intelligent scheduling suggestions
- **Features**: Geographic clustering, conflict analysis, travel time optimization
- **Context**: Considers adjuster workload, claim priority, SLA requirements, and geographic proximity

## External Dependencies

### Third-Party APIs
- **OpenAI**: GPT-5 model for AI scheduling intelligence
- **SendGrid**: Email delivery service for appointment notifications
- **SMS77.io**: SMS messaging provider
- **MaytAPI**: WhatsApp messaging integration
- **Geoapify**: Geocoding and routing services
- **TrueWay**: Vehicle Routing Problem (VRP) optimization
- **Smarty/Loqate**: Address verification and standardization
- **LanguageLayer**: Automatic language detection for communications

### Infrastructure Services
- **Docker**: Container orchestration for development and deployment
- **PostgreSQL**: Primary database for claims, appointments, and communications
- **BullMQ/Redis**: Background job processing and queuing
- **pnpm**: Package management for monorepo workspace

### Integration Partners
- **Davies CQ**: Core claim management system integration
- **CoreLogic**: Property data and analytics
- **XactAnalysis**: Estimate and damage assessment tools