# AlgoX — Local Setup & Development Guide

This guide walks through setting up, configuring, and executing AlgoX locally.

---

## Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Git**: Installed and configured

---

## 1. Quick Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd Algox

# Install dependencies (React 19, Vite, Express, Prisma, Tailwind CSS v4)
npm install
```

---

## 2. Environment Configuration

Create or verify `.env` in the project root:

```env
DATABASE_URL="file:./dev.db"
PORT=3001
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

---

## 3. Database Initialization

Synchronize the SQLite database with Prisma schema:

```bash
npx prisma db push
```

---

## 4. Running the Application

Launch both Express API server (port 3001) and Vite React Frontend (port 5173):

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your web browser.

---

## 5. Development Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts Express server + Vite frontend concurrently |
| `npm run dev:client` | Starts Vite frontend only (port 5173) |
| `npm run dev:server` | Starts Express server with hot-reloading (`tsx watch`) |
| `npm run build` | Runs TypeScript check (`tsc`) & builds Vite bundle |
| `npx prisma studio` | Launches Prisma Web GUI to view encrypted SQLite tables |
