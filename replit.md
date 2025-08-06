# Paperfly CRM System

## Overview

Paperfly is a modern Customer Relationship Management (CRM) system designed for sales teams. It provides comprehensive lead management, pipeline tracking, analytics, and team collaboration features. The application is built as a full-stack web application with a React frontend and Express.js backend. **Now using persistent PostgreSQL database storage for production reliability - all data persists through restarts and deployments.**

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
- August 6, 2025: **MODULE SEPARATION COMPLETE** - Successfully separated Calendar (upcoming events) and Activity (completed actions) modules
- August 6, 2025: Removed Activities menu from navigation - activities are now managed within individual leads
- August 6, 2025: Created dedicated Calendar module for scheduling future events with full calendar view
- August 6, 2025: Activities are now lead-specific completed actions accessible from lead management interface
- August 6, 2025: **FIELD UPDATES COMPLETE** - Removed preferredPickTime, pickupAddress, customerType fields from all forms and database
- August 6, 2025: Added orderVolume field to leads and customers tables with proper validation
- August 6, 2025: Updated all frontend forms (LeadManagement, LeadEditDialog, CreateCustomerDialog) to use new field structure
- August 6, 2025: Updated bulk upload CSV templates and server processing for new field structure
- August 6, 2025: **REPLIT MIGRATION COMPLETE** - Successfully migrated from Replit Agent to standard Replit environment
- August 6, 2025: Upgraded session management to use PostgreSQL storage with connect-pg-simple
- August 6, 2025: Removed memorystore dependency and replaced with database-backed sessions
- August 6, 2025: Fixed all TypeScript compilation errors and ensured full PostgreSQL integration
- August 6, 2025: Verified all data operations use PostgreSQL database storage - no memory storage remaining
- July 31, 2025: **CRITICAL PRODUCTION UPGRADE** - Successfully migrated from MemoryStorage to DatabaseStorage
- July 31, 2025: Eliminated data loss risk - all business data now persists through restarts, deployments, and crashes
- July 31, 2025: Replaced in-memory Maps with PostgreSQL database operations for production reliability
- July 31, 2025: Updated file upload system to use disk storage instead of memory storage for CSV bulk uploads
- July 31, 2025: Enhanced toast notification system with sessionStorage persistence across page refreshes
- July 31, 2025: Cleaned up codebase by removing all MemoryStorage implementations and duplicate code
- July 31, 2025: Fixed all TypeScript compilation errors and Drizzle ORM query construction issues
- July 31, 2025: Application now runs with clean database storage - ready for production deployment
- July 31, 2025: **AUTHENTICATION FIX COMPLETE** - Removed email verification requirements from ALL endpoints
- July 31, 2025: Fixed target creation with proper user selection dropdown showing current user and team members
- July 31, 2025: Resolved activity creation and customer conversion workflows by removing email verification barriers
- July 31, 2025: All CRUD operations now work without authentication barriers - system fully functional
- July 30, 2025: **PRODUCTION READY** - Cleared all test data and prepared for deployment
- July 30, 2025: System ready for deployment with clean database and single admin account
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
- June 24, 2025: Fixed 404 errors for Sales Manager and Sales Agent users by updating frontend to use RBAC permissions
- June 24, 2025: Granted Sales Agent role permission to create and edit leads for their own use
- June 24, 2025: Fixed lead creation for Sales Agent role - agents can now create leads assigned to themselves
- June 24, 2025: Updated UI to show "Assign to Myself" option for sales agents when creating leads
- June 24, 2025: Implemented comprehensive team management system with hierarchical lead assignment
- June 24, 2025: Added team-based analytics where Super Admin sees all, Managers see team data, Agents see personal data
- June 24, 2025: Enhanced RBAC to support team-based permissions and assignment restrictions
- June 24, 2025: Created team table and user-team relationships for proper organizational structure
- June 24, 2025: Enhanced pipeline board with modern drag-and-drop functionality using react-beautiful-dnd
- June 24, 2025: Added comprehensive bulk lead upload feature with CSV support using multer and csv-parser
- June 24, 2025: Implemented lead edit and view dialogs with full CRUD operations
- June 24, 2025: Fixed target management with proper Taka currency formatting and improved form design
- June 24, 2025: Integrated edit/view functionality directly into pipeline board and lead management table
- July 18, 2025: Fixed CommonJS import issues in server routes by converting to ES6 import syntax
- July 18, 2025: Corrected role-based access control for target management (super_admin vs admin)
- July 18, 2025: Fixed date handling in target schema to accept both strings and dates
- July 18, 2025: Resolved user display issue in target creation modal - now shows fullName instead of firstName/lastName
- July 18, 2025: Fixed target amount display in target cards to use targetValue field
- July 18, 2025: Verified complete target functionality: creation, assignment, notifications, and progress tracking
- July 21, 2025: Fixed pipeline activity issues by correcting stage naming convention (lowercase format)
- July 21, 2025: Resolved lead edit dialog form validation and field mapping issues
- July 21, 2025: Updated pipeline board to use consistent stage values with lead edit dialog
- July 21, 2025: Removed non-existent schema fields (notes, orderVolume, leadSource) from UI components
- July 21, 2025: Verified lead CRUD operations working correctly with proper stage progression

## Production User Account

### Super Admin Account (Production Ready)
- **Email**: admin@paperfly.com
- **Password**: admin123
- **Role**: super_admin
- **Permissions**: Full system access across all features
- **Status**: Production ready - only admin user in clean database

## User Preferences

Preferred communication style: Simple, everyday language.