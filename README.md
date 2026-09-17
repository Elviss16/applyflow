# ApplyFlow

ApplyFlow is a full-stack job and internship application tracker designed to help users organize and manage their job search in one place.

Users can securely create an account, track applications through different stages, edit and delete applications, search and filter their records, and view application analytics.

## Live Demo

[View ApplyFlow Live](https://applyflow-xi-jet.vercel.app/)

## Screenshots

### Dashboard

![ApplyFlow Dashboard](screenshots/dashboard)

### Applications

![ApplyFlow Applications](screenshots/applications)

### Analytics

![ApplyFlow Analytics](screenshots/analytics)

## GitHub

[View Source Code](https://github.com/Elviss16/applyflow)

## Features

- Secure user registration and login
- JWT-based authentication
- Password hashing with bcrypt
- Persistent login sessions
- User-specific application data
- Create, edit, and delete job applications
- Kanban-style application pipeline
- Drag-and-drop application status updates
- Search applications by company or role
- Filter applications by status
- Application analytics and conversion metrics
- Responsive dashboard interface

## Application Pipeline

Applications can be organized into four stages:

- Saved
- Applied
- Interview
- Offer

Users can drag applications between stages, and the updated status is saved to the database.

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- CSS

### Backend

- Node.js
- Express
- TypeScript

### Database

- PostgreSQL
- Prisma ORM

### Authentication

- JSON Web Tokens (JWT)
- bcryptjs

### Deployment

- Vercel — Frontend
- Render — Backend API
- Prisma Postgres — Database

## Architecture

```text
React + TypeScript Frontend
            |
            v
      Express REST API
            |
            v
        Prisma ORM
            |
            v
        PostgreSQL
        