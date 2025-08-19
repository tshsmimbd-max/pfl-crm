# Paperfly CRM System

## Overview
Paperfly is a modern Customer Relationship Management (CRM) system designed for sales teams. Its main purpose is to provide comprehensive lead management, pipeline tracking, analytics, and team collaboration features. The system aims to enhance sales efficiency and drive revenue growth by offering a robust full-stack web application.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **UI Components**: Radix UI with Tailwind CSS (shadcn/ui design system)
- **Build Tool**: Vite
- **Form Handling**: React Hook Form with Zod validation

### Backend
- **Framework**: Express.js with TypeScript
- **Authentication**: Supports traditional email/password, Firebase (Google, Microsoft OAuth), and Replit OAuth.
- **Session Management**: Express sessions with PostgreSQL storage.
- **API Design**: RESTful JSON API.

### Database
- **Database**: PostgreSQL with Drizzle ORM.
- **Schema Management**: Drizzle Kit for migrations.
- **Connection**: Neon Database serverless connection.

### Key Features
- **Authentication**: Multi-provider, session-based, email verification, and role-based access control (admin/sales).
- **Lead Management**: CRUD operations for leads, assignment, tracking contact/company details, value, and stage progression.
- **Pipeline Management**: Visual board (planned), stage-based progression, analytics, and customizable stages.
- **User Management**: Admin-only interface for user management, role assignment, and team performance tracking.
- **Analytics & Reporting**: Revenue, team performance, conversion rates, and target tracking.
- **Notification System**: Real-time notifications for lead updates via WebSockets.
- **Data Flow**: Authentication, lead processing through pipeline stages, real-time updates via WebSockets, and TanStack Query for data synchronization.
- **Security**: Role-based access control (RBAC) implemented with granular permissions and team-based restrictions.
- **Team Management**: Hierarchical lead assignment and team-based analytics.

### Deployment Strategy
- **Development**: Replit with Node.js 20, PostgreSQL 16 module, Vite HMR, runs on port 5000.
- **Production Build**: Vite for frontend (to `dist/public`), ESBuild for backend (to `dist`), static assets served by Express.
- **Deployment Target**: Replit Autoscale.
- **Configuration**: Environment variables for secrets and database URLs.
- **Production Admin**: shamim.ahammed@paperfly.com.bd (password: admin123)

### Recent Updates (January 2025)
- **Calendar Enhancement**: Added username display in calendar events with proper user information from database joins
- **Role-Based Calendar Access**: Managers can only see their team member schedules, super admins see all events
- **Enhanced Filtering**: Added comprehensive event filtering by lead, team member, and event type
- **Welcome Email System**: Implemented HTML email notifications for new user accounts with login credentials
- **Production Ready**: Build system configured, database optimized, all features fully functional

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **Replit**: Development and hosting platform.

### Authentication Providers
- **Firebase Authentication**: For Google and Microsoft OAuth.
- **Replit OAuth**: Platform-native authentication.

### Email Services
- **Nodemailer**: For email service integration.
- **SendGrid**: For production email delivery.

### UI & Styling
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

### Development Tools
- **TypeScript**: Static type checking.
- **ESBuild**: Fast bundling.
- **Drizzle Kit**: Database schema management.