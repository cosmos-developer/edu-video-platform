# Quick Start - Development Environment

## 🚀 Ultra-Fast Local Development Setup

This project uses a **fully local development setup** for maximum performance:
- **Backend & Frontend**: Run locally with instant hot reload
- **Database & Redis**: Run in lightweight Docker containers
- **Zero Docker rebuilds**: Direct Node.js execution for both apps

## Prerequisites

- Node.js 18+ installed locally
- Docker Desktop installed and running
- npm or yarn package manager

## Getting Started

### 1. First Time Setup

```bash
# Install all dependencies (backend + frontend)
./dev.sh install

# Start everything
./dev.sh start
```

That's it! Everything is running with hot reload. 🎉

### 2. Daily Development

```bash
# Start everything
./dev.sh start

# Check status
./dev.sh status

# Stop everything
./dev.sh stop
```

## 📍 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Backend API | http://localhost:3000 | Node.js backend (local) |
| Frontend | http://localhost:3001 | React application (local) |
| Health Check | http://localhost:3000/health | Backend health status |
| Database UI | http://localhost:8080 | Adminer for PostgreSQL |
| Redis UI | http://localhost:8001 | RedisInsight |

## 🛠 Development Commands

### Quick Commands

```bash
./dev.sh start      # Start everything
./dev.sh stop       # Stop everything
./dev.sh restart    # Restart everything
./dev.sh status     # Check all services
./dev.sh install    # Install dependencies
```

### View Logs

```bash
./dev.sh logs backend   # Backend logs
./dev.sh logs frontend  # Frontend logs
./dev.sh logs db        # Database logs
./dev.sh logs redis     # Redis logs
```

### Database Operations

```bash
./dev.sh db:migrate  # Run migrations
./dev.sh db:studio   # Open Prisma Studio
./dev.sh db:reset    # Reset database (WARNING: deletes data)
```

## 🔥 Hot Reload

Both backend and frontend have instant hot reload:

- **Backend**: Save any `.ts` file → Server restarts in ~1 second
- **Frontend**: Save any React file → Browser updates instantly
- **No Docker rebuilds**: Everything runs natively on your machine

## 🏗 Architecture

```
┌─────────────────────────────────────────┐
│         Your Local Machine              │
│                                         │
│  ┌────────────────┐  ┌────────────────┐│
│  │   Backend      │  │   Frontend     ││
│  │   (Node.js)    │  │   (React)      ││
│  │   Port: 3000   │  │   Port: 3001   ││
│  │                │  │                ││
│  │  ✨ Hot Reload │  │  ✨ Hot Reload ││
│  └────────────────┘  └────────────────┘│
│         ↓                    ↑          │
├─────────────────────────────────────────┤
│       Docker Containers (Data Only)     │
│                                         │
│  ┌────────────┐  ┌────────────┐       │
│  │ PostgreSQL │  │   Redis    │       │
│  │ Port: 5432 │  │ Port: 6379 │       │
│  └────────────┘  └────────────┘       │
└─────────────────────────────────────────┘
```

## 🐛 Troubleshooting

### Services not starting?

```bash
# Check what's running
./dev.sh status

# Restart everything
./dev.sh restart

# Check Docker is running
docker ps
```

### Port already in use?

```bash
# Find what's using port 3000 or 3001
lsof -i :3000
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### Database connection issues?

```bash
# Make sure Docker containers are running
docker ps

# Check database logs
./dev.sh logs db

# Reset database if needed
./dev.sh db:reset
```

### Clean slate needed?

```bash
# Remove everything and start fresh
./dev.sh clean
./dev.sh install
./dev.sh start
```

## 💡 Pro Tips

1. **Instant feedback**: Both apps reload in under 1 second after saving
2. **Parallel development**: Backend and frontend run independently
3. **Easy debugging**: Use your IDE's Node.js debugger directly
4. **Performance**: No Docker overhead = blazing fast development
5. **Database GUI**: Use Adminer at http://localhost:8080
   - Server: `postgres`
   - Username: `postgres`
   - Password: `postgres_dev_password`
   - Database: `interactive_learning`

## 🎯 Why This Setup?

- **⚡ Lightning fast**: No Docker layers for application code
- **🔄 Instant hot reload**: Changes apply in milliseconds
- **🐞 Better debugging**: Direct Node.js process access
- **💻 Native performance**: Full CPU/RAM utilization
- **🗄️ Isolated data**: Databases in containers prevent conflicts
- **📦 Easy cleanup**: `./dev.sh clean` removes everything

## 📝 Common Workflows

### Adding a new API endpoint

1. Create your route in `src/routes/`
2. Save the file
3. Backend auto-restarts with your changes
4. Test immediately at http://localhost:3000/api/v1/your-endpoint

### Updating the UI

1. Edit React components in `frontend/src/`
2. Save the file
3. Browser auto-refreshes with changes
4. See results instantly at http://localhost:3001

### Database schema changes

1. Update `database/prisma/schema.prisma`
2. Run `./dev.sh db:migrate`
3. Backend auto-restarts with new schema
4. Use `./dev.sh db:studio` to view data

## 🚀 Ready to Code!

Everything you need is in the `dev.sh` script. Just run `./dev.sh start` and begin coding. Both backend and frontend will reload automatically as you work. Happy coding! 🎉