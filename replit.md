# Paperfly CRM System

## Overview

Paperfly is a modern Customer Relationship Management (CRM) system designed for sales teams. It provides comprehensive lead management, pipeline tracking, analytics, and team collaboration features. The application is built as a full-stack web application with a React frontend and Express.js backend, utilizing PostgreSQL for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI components with Tailwind CSS styling (shadcn/ui design system)
- **Build Tool**: Vite for development and production builds
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Multiple strategies supported:
  - Traditional email/password authentication
  - Firebase Authentication (Google, Microsoft OAuth)
  - Replit OAuth integration
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful API endpoints with JSON responses

### Database Architecture
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon Database serverless connection with WebSocket support

## Key Components

### Authentication System
- Multi-provider authentication supporting traditional credentials and OAuth
- Session-based authentication with secure cookie management
- Email verification system for traditional registration
- Role-based access control (admin/sales roles)

### Lead Management
- Complete CRUD operations for leads
- Lead assignment to sales representatives
- Contact information and company details tracking
- Lead value and stage progression

### Pipeline Management
- Visual pipeline board with drag-and-drop functionality (planned)
- Stage-based lead progression tracking
- Pipeline analytics and conversion metrics
- Customizable pipeline stages

### User Management
- Admin-only user management interface
- Role assignment and permissions
- Team performance tracking
- User activity monitoring

### Analytics & Reporting
- Revenue and performance metrics
- Team performance analytics
- Pipeline conversion rates
- Target tracking and achievement monitoring

### Notification System
- Real-time notifications for lead updates
- WebSocket integration for live updates
- Notification preferences and management

## Data Flow

1. **Authentication Flow**: Users authenticate through multiple providers, sessions are managed server-side
2. **Lead Processing**: Leads flow through defined pipeline stages with automated notifications
3. **Real-time Updates**: WebSocket connections provide live updates for collaborative features
4. **Data Synchronization**: TanStack Query manages client-server state synchronization with optimistic updates

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit**: Development and hosting platform

### Authentication Providers
- **Firebase Authentication**: Google and Microsoft OAuth
- **Replit OAuth**: Platform-native authentication

### Email Services
- **Nodemailer**: Email service integration for notifications
- **SendGrid**: Production email delivery (configured but not actively used)

### UI & Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### Development Tools
- **TypeScript**: Static type checking
- **ESBuild**: Fast bundling for production
- **Drizzle Kit**: Database schema management

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20 runtime
- **Database**: PostgreSQL 16 module
- **Hot Reload**: Vite dev server with HMR
- **Port Configuration**: Application runs on port 5000

### Production Build
- **Frontend**: Vite builds to `dist/public` directory
- **Backend**: ESBuild bundles server code to `dist` directory
- **Static Assets**: Served directly by Express in production
- **Deployment**: Replit Autoscale deployment target

### Environment Configuration
- Session secrets and database URLs via environment variables
- Firebase configuration embedded in client code
- OAuth provider configurations through environment variables

## Recent Changes
- June 24, 2025: Replaced complex authentication (Firebase, Passport) with simple email/password system
- June 24, 2025: Implemented email verification with 6-digit codes
- June 24, 2025: Created test users with admin and sales roles for system testing
- June 24, 2025: Authentication now blocks login until email verification is complete
- June 24, 2025: Fixed email service to send verification codes to actual email addresses using Gmail SMTP
- June 24, 2025: Email service now properly configured with user-provided Gmail credentials
- June 24, 2025: Implemented comprehensive RBAC system with three roles: Super Admin, Sales Manager, Sales Agent
- June 24, 2025: Added granular permissions for Target, Lead, Pipeline, Analytics, Calendar, and User Management
- June 24, 2025: Updated database schema to support manager-subordinate relationships
- June 24, 2025: Implemented permission-based UI components and route protection
- June 24, 2025: Created 3 sample accounts for testing different roles and manager-subordinate relationships

## Test Users

### Super Admin Account
- **Email**: admin@paperfly.com
- **Password**: admin123
- **Role**: super_admin
- **Permissions**: Full system access across all features

### Sales Manager Account  
- **Email**: sarah.manager@paperfly.com
- **Password**: manager123
- **Role**: sales_manager
- **Permissions**: Team-level access, can manage subordinates and team resources

### Sales Agent Account
- **Email**: mike.agent@paperfly.com  
- **Password**: agent123
- **Role**: sales_agent
- **Manager**: Sarah Johnson (Sales Manager)
- **Permissions**: Personal-level access, can only manage own assigned resources

## User Preferences

Preferred communication style: Simple, everyday language.