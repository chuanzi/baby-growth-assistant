# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**宝宝成长助手 (Baby Growth Assistant)** is a comprehensive web application for tracking premature baby development. The core differentiator is the emphasis on "corrected age" calculations for premature babies, addressing specific anxieties and needs of this user group.

## Core Product Vision

The product follows this value loop: **Parents input baby's specific information → Platform provides precise, personalized daily guidance → Parents gain certainty and peace of mind.**

Target audience: Parents of premature babies, particularly those dealing with NICU discharge and home care transitions.

## 🚀 MVP Implementation Status (COMPLETED)

### ✅ P0 Features (Implemented)
1. **User Authentication System**
   - Dual authentication: Phone/SMS + Email/Password
   - JWT-based session management with httpOnly cookies
   - Secure password hashing and validation

2. **Baby Profile Management**
   - Complete CRUD operations for baby profiles
   - Corrected age calculation engine
   - Multi-baby support per user account
   - Real-time age display (actual vs corrected)

3. **Record Tracking System**
   - **Feeding Records**: Breast milk, formula, solid food tracking
   - **Sleep Records**: Duration tracking with automatic calculations
   - **Timezone-aware**: Proper local time handling
   - Form validation and error handling

4. **AI-Powered Daily Content**
   - Personalized daily tips based on corrected age
   - OpenAI-compatible API integration (Gemini 2.5 Pro)
   - Contextual recommendations and action items
   - Fallback content system

5. **Milestone Tracking**
   - Age-appropriate milestone database
   - Progress tracking and achievement recording
   - AI-powered activity suggestions
   - Milestone completion analytics

6. **Mobile-Responsive Interface**
   - Mobile-first responsive design
   - Bottom navigation for mobile devices
   - Floating action buttons for quick record entry
   - Desktop and tablet optimization

7. **Data Export & Analytics**
   - PDF report generation (weekly/monthly)
   - CSV export for feeding and sleep data
   - Statistical summaries and trends
   - Print-friendly report layouts

### 🏗️ Technical Architecture

**Frontend Stack:**
- **Next.js 15** with App Router and TypeScript
- **Tailwind CSS** for responsive styling
- **React Hook Form** with Zod validation
- **Lucide React** for consistent iconography

**Backend & Database:**
- **Prisma ORM** with SQLite database
- **JWT Authentication** with secure session management
- **API Routes** following REST principles
- **Type-safe** database operations

**AI Integration:**
- **OpenAI-compatible API** (configurable provider)
- **Content generation** for daily tips and recommendations
- **Fallback systems** for reliability

**Export & Analytics:**
- **jsPDF** for PDF report generation
- **CSV export** functionality
- **Chart.js ready** for future data visualization

## 📁 Final Project Structure

```
src/
├── app/                     # Next.js App Router
│   ├── (auth)/             # Authentication pages
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/        # Main application
│   │   ├── dashboard/page.tsx
│   │   ├── create-profile/page.tsx
│   │   ├── milestones/page.tsx
│   │   ├── activities/page.tsx
│   │   ├── records/
│   │   │   ├── feeding/page.tsx
│   │   │   └── sleep/page.tsx
│   │   └── layout.tsx      # With TopBar + MobileNav
│   ├── api/                # API endpoints
│   │   ├── auth/           # Authentication APIs
│   │   ├── babies/         # Baby profile management
│   │   ├── records/        # Feeding & sleep tracking
│   │   ├── milestones/     # Milestone management
│   │   ├── ai/             # AI content generation
│   │   └── debug/          # Development utilities
│   └── layout.tsx          # Root layout with providers
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── AgeDisplay.tsx
│   │   └── KnowledgeCard.tsx
│   ├── navigation/         # Navigation components
│   │   ├── TopBar.tsx      # Desktop navigation
│   │   └── MobileNav.tsx   # Mobile bottom nav + FAB
│   ├── export/             # Data export components
│   │   └── ExportButton.tsx
│   └── forms/              # Form components
├── lib/                    # Core utilities and configurations
│   ├── prisma.ts          # Database client
│   ├── auth.ts            # JWT authentication logic
│   ├── auth-context.tsx   # React context for auth state
│   ├── ai.ts              # AI integration and content generation
│   └── validations.ts     # Zod schemas for form validation
├── utils/                  # Utility functions
│   ├── age-calculator.ts  # Corrected age calculations
│   ├── time-helpers.ts    # Timezone-aware time utilities
│   └── export.ts          # PDF/CSV export functionality
├── types/                  # TypeScript definitions
│   └── index.ts           # Shared type definitions
└── contexts/               # React contexts
    └── AuthContext.tsx    # Authentication state management
```

## 🔧 Development Environment

### Setup Commands
```bash
# Installation
npm install

# Development
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run lint         # Code linting

# Database
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema to database
npx prisma studio    # Database GUI
```

### Environment Variables (.env)
```bash
# Database
DATABASE_URL="file:./dev.db"

# Authentication
JWT_SECRET="your-jwt-secret-key"

# AI Integration (User-provided)
AI_API_KEY="sk-W4odOBULYtnvZuGbnvOGU4rQdVPa34C3zM6IbiciX5tNUqfG"
AI_BASE_URL="https://for.shuo.bar/"
AI_MODEL="gemini-2.5-pro"
```

## 🎯 Core Features Deep Dive

### Age Calculation System
- **Actual Age**: Time since birth date
- **Corrected Age**: Adjusted for prematurity (formula: actualAge - (40 weeks - gestationalWeeks))
- **Real-time updates**: Ages recalculated on each view
- **Mobile-friendly display**: Clear presentation of both ages

### Record Tracking
- **Feeding Records**: Type (breast/formula/solid), amount/duration, timestamp, notes
- **Sleep Records**: Start time, end time, automatic duration calculation, notes
- **Local timezone handling**: All times stored and displayed in user's local timezone
- **Form validation**: Zod schemas ensure data integrity

### AI Content Generation
- **Daily personalized tips** based on baby's corrected age
- **Context-aware recommendations** considering recent records
- **Fallback content system** when AI service is unavailable
- **Configurable AI provider** supporting OpenAI-compatible APIs

### Data Export System
- **PDF Reports**: Comprehensive weekly/monthly summaries
- **CSV Export**: Raw data for external analysis
- **Statistical summaries**: Feeding counts, sleep totals, milestone progress
- **Print-friendly formatting**: Professional report layouts

## 🔐 Security & Authentication

- **JWT tokens** stored in httpOnly cookies
- **Session-based authentication** with automatic token refresh
- **Password hashing** using bcrypt
- **Input validation** at API and form levels
- **User data isolation** - users can only access their own data

## 📱 Mobile Optimization

- **Responsive design** using Tailwind CSS breakpoints
- **Bottom navigation** for core mobile functionality
- **Floating Action Button** for quick record entry
- **Touch-friendly interfaces** with appropriate sizing
- **Swipe gestures** and mobile interaction patterns

## 🚀 Deployment Considerations

### Production Checklist
- [ ] Set up production database (PostgreSQL recommended)
- [ ] Configure proper JWT secrets
- [ ] Set up AI API keys and rate limiting
- [ ] Enable HTTPS and security headers
- [ ] Configure backup and monitoring
- [ ] Set up error logging and analytics

### Scaling Opportunities
- **Database**: Migrate from SQLite to PostgreSQL/MySQL
- **File Storage**: Add cloud storage for exports and media
- **Performance**: Implement caching and CDN
- **Analytics**: Add user behavior tracking
- **Notifications**: SMS/email reminders for record keeping

## 📊 Analytics & Metrics

The application tracks key user engagement metrics:
- **Daily active users** and record creation frequency
- **Feature usage** (feeding vs sleep tracking preferences)
- **Export usage** patterns and report generation
- **AI content engagement** and user feedback loops

## 🎨 Design System

- **Color Palette**: Warm, baby-friendly gradients (pink-50 to blue-50)
- **Typography**: System fonts with clear hierarchy
- **Iconography**: Consistent Lucide React icons
- **Spacing**: Tailwind CSS spacing scale
- **Mobile-First**: All components designed for mobile, enhanced for desktop

## 🧪 Quality Assurance

### Testing Strategy
- **Form validation** testing with edge cases
- **Age calculation** accuracy verification
- **Timezone handling** across different locales
- **Export functionality** with various data sets
- **Mobile responsiveness** across device sizes

### Error Handling
- **Graceful degradation** when AI services are unavailable
- **User-friendly error messages** with actionable guidance
- **Retry mechanisms** for failed operations
- **Offline resilience** for core functionality

## 📈 Future Roadmap (P1 Features)

1. **Growth Charts**: Visual tracking of height/weight over time
2. **Photo Timeline**: Visual record keeping with image uploads
3. **Community Features**: Parent support groups and forums
4. **Healthcare Integration**: Pediatrician sharing and collaboration
5. **Advanced Analytics**: Trend analysis and pattern recognition
6. **Notification System**: Smart reminders and milestone alerts

## 💡 AI Integration Opportunities

- **Intelligent pattern recognition** in feeding/sleep data
- **Predictive milestone achievement** timing
- **Personalized content curation** from medical knowledge base
- **Natural language queries** for record searching
- **Automated report insights** and recommendations

This MVP provides a solid foundation for the Baby Growth Assistant platform, with all core functionality implemented and ready for user testing and iterative improvement.