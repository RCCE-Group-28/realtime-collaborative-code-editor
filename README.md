# Real-time Collaborative Code Editor

A modern, browser-based code editor enabling seamless real-time collaboration with built-in GitHub integration, version control, and live synchronization using WebSockets and CRDTs.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.0-blue.svg)

## 🌟 Key Features

- **Real-time Collaboration** - Multiple users editing simultaneously with live cursor tracking
- **GitHub Integration** - Clone repositories, push/pull changes directly from the editor
- **Version Control** - Full Git operations (commit, branch, merge) integrated into the UI
- **CRDT-based Sync** - Conflict-free synchronized editing using Yjs framework
- **Modern UI** - Dark theme with responsive design and smooth animations
- **Toast Notifications** - Elegant, minimal notification system for user feedback
- **File Management** - Drag-and-drop file operations with real-time synchronization

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development](#development)
- [Building](#building)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **npm** >= 9.0.0 or **yarn** >= 1.22.0
- **Git** >= 2.0.0
- **Docker** (optional, for containerized deployment)

### System Requirements

- **RAM**: Minimum 2GB (4GB recommended)
- **Disk Space**: 5GB for dependencies and build artifacts
- **OS**: macOS, Linux, or Windows (with WSL2)

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/RCCE-Group-28/realtime-collaborative-code-editor.git
cd realtime-collaborative-code-editor
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Or using yarn:
```bash
yarn install
```

### 3. Configure Environment Variables

Copy the environment template and configure:

```bash
# 1. Navigate to nextjs-app
cd apps/nextjs-app
cp .env.example .env.local
# Edit .env.local with your values

# 2. Navigate to socketio-server
cd ../socketio-server
cp .env.example .env
# Edit .env with your values

# 4. Return to root and start development
cd ../..
npm run dev
```

See [Environment Variables](#environment-variables) section for details.

### 4. Verify Installation

```bash
npm run build
```

---

## Development

### Starting the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Development Services

The development environment includes:

- **Next.js Frontend** - React-based UI with hot-reload
- **Socket.IO Server** - Real-time WebSocket communication
- **Yjs Server** - CRDT synchronization service
- **MongoDB** - Local database (if using local setup)

### Development Commands

```bash
# Start all services in development mode
npm run dev

# Start specific service
npm run dev --workspace=nextjs-app
npm run dev --workspace=socketio-server
npm run dev --workspace=yjs-server

# Run linting
npm run lint

# Format code
npm run format

# Run tests
npm run test

# Run end-to-end tests
npm run test:e2e
```

### Hot Module Replacement

The development server supports HMR for rapid development:
- **Frontend changes**: Automatically reload in browser
- **API changes**: Restart server (handled automatically)
- **Styles**: Update without full page reload

---

## Building

### Build Production Artifacts

```bash
npm run build
```

This generates:
- `/apps/nextjs-app/.next` - Next.js production build
- `/dist` - Compiled TypeScript for backend services

### Build Output

```
realtime-collaborative-code-editor/
├── apps/
│   ├── nextjs-app/.next/         # Next.js production build
│   ├── socketio-server/dist/     # Socket.IO server build
│   └── yjs-server/dist/          # Yjs server build
└── packages/
    └── database/dist/            # Database package build
```

### Build Verification

```bash
# Verify build was successful
npm run build
npm start
```

### Production Build Options

**Option 1: Monorepo Build (Recommended)**
```bash
npm run build  # Builds all packages using Turbo
```

**Option 2: Selective Build**
```bash
npm run build --workspace=nextjs-app
npm run build --workspace=socketio-server
npm run build --workspace=yjs-server
```

---

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`

---

## Usage

### 1. Starting a Collaborative Session

```bash
# Start development server
npm run dev

# Access at http://localhost:3000
# Login with GitHub or create account
```

### 2. Creating a Project

1. Click "New Project"
2. Select repository source:
   - Empty project
   - Clone from GitHub URL
   - Upload existing files
3. Name your project
4. Click "Create"

### 3. Inviting Collaborators

1. In project, click "Share"
2. Copy project link
3. Send to collaborators
4. They click link and join session

### 4. Version Control Operations

#### Clone from GitHub
```
1. Click "GitHub Integration" panel
2. Connect GitHub account
3. Select repository
4. Click "Load"
5. Start editing
```

#### Commit Changes
```
1. Make changes in editor
2. Open "Version Control" panel
3. Stage files
4. Enter commit message
5. Click "Commit"
```

#### Push to GitHub
```
1. Commit your changes
2. Click "Push to GitHub" button
3. Changes sync to remote repository
4. Toast notification confirms success
```

### 5. Real-time Features

- **Live Cursors** - See collaborators' cursors in real-time
- **Presence** - Know who's online and which file they're viewing
- **Instant Sync** - All changes synchronized within 100-200ms
- **Auto-save** - Changes automatically saved to database

---

## Project Structure

```
realtime-collaborative-code-editor/
├── apps/
│   ├── nextjs-app/                 # React Frontend
│   │   ├── app/
│   │   │   ├── editor/[id]/        # Editor page components
│   │   │   ├── api/                # API routes
│   │   │   └── page.tsx            # Homepage
│   │   ├── public/                 # Static assets
│   │   └── package.json
│   │
│   ├── socketio-server/            # WebSocket Server
│   │   ├── src/
│   │   │   ├── index.ts            # Server entry
│   │   │   ├── events/             # Socket event handlers
│   │   │   └── middleware/         # Express middleware
│   │   └── package.json
│   │
│   └── yjs-server/                 # CRDT Sync Server
│       ├── src/
│       │   ├── index.ts
│       │   └── handlers/
│       └── package.json
│
├── packages/
│   └── database/                   # Shared database layer
│       ├── src/
│       │   ├── models/
│       │   └── queries/
│       └── package.json
│
├── e2e/                            # End-to-end tests
│   └── tests/
│       └── collaboration.spec.ts
│
├── jmeter-tests/                   # Performance tests
│   └── test-plans/
│
├── docker-compose.yml              # Docker configuration
├── turbo.json                       # Turbo monorepo config
├── package.json                    # Root package.json
└── README.md
```

---

## API Documentation

### REST API

#### Authentication
```
POST /api/auth/login
POST /api/auth/signup
POST /api/auth/github/callback
```

#### Projects
```
GET    /api/projects              # List projects
POST   /api/projects              # Create project
GET    /api/projects/:id          # Get project
PUT    /api/projects/:id          # Update project
DELETE /api/projects/:id          # Delete project
```

#### Version Control
```
GET    /api/projects/:id/version-control/status
POST   /api/projects/:id/version-control/commit
POST   /api/projects/:id/version-control/push
POST   /api/projects/:id/version-control/pull
GET    /api/projects/:id/version-control/branch-git
POST   /api/projects/:id/version-control/branch-git
```

#### GitHub
```
GET    /api/github/repos          # List repositories
POST   /api/github/push           # Push to GitHub
POST   /api/github/pull           # Pull from GitHub
```

### WebSocket Events

#### Presence
```
socket.on('user:online', (user) => {})
socket.on('user:offline', (userId) => {})
socket.on('cursor:move', (position) => {})
```

#### Collaboration
```
socket.emit('file:open', { filePath })
socket.emit('file:change', { content })
socket.on('file:updated', (data) => {})
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 8080
lsof -ti:8080 | xargs kill -9
```

#### 2. MongoDB Connection Failed
```bash
# Start MongoDB locally
mongod --dbpath ~/data/db

# Or use Docker
docker run -d -p 27017:27017 mongo
```

#### 3. GitHub OAuth Not Working
- Verify callback URL matches exactly in GitHub settings
- Check GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET
- Ensure cookies are enabled in browser

#### 4. Real-time Sync Not Working
- Verify WebSocket connection: `http://localhost:8080`
- Check browser console for errors
- Verify Yjs server is running on port 8081

#### 5. Build Fails
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Debug Mode

```bash
# Enable verbose logging
LOG_LEVEL=debug npm run dev

# Check specific service logs
npm run dev --workspace=socketio-server | grep -E "ERROR|WARN"
```

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes and commit: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write unit tests for new features
- Maintain code style with ESLint
- Update documentation as needed
- Describe changes in commit messages

### Testing Before Submission

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

---

## Performance Optimization

### For Production

```bash
# Enable Node clustering
NODE_ENV=production npm start

# Use CDN for static assets
# Enable gzip compression
# Implement caching strategies
```

### Monitoring

- Use New Relic or DataDog
- Monitor WebSocket connections
- Track database query performance
- Set up alerts for errors

---

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## Support & Resources

- **Documentation**: [Wiki](https://github.com/RCCE-Group-28/realtime-collaborative-code-editor/wiki)
- **Issues**: [GitHub Issues](https://github.com/RCCE-Group-28/realtime-collaborative-code-editor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/RCCE-Group-28/realtime-collaborative-code-editor/discussions)

---

## Acknowledgments

- [Yjs](https://github.com/yjs/yjs) - Conflict-free CRDT library
- [Monaco Editor](https://github.com/microsoft/monaco-editor) - Code editor component
- [Socket.IO](https://socket.io/) - Real-time communication
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework

---

## Contact & Social

- **GitHub**: [@RCCE-Group-28](https://github.com/RCCE-Group-28)
- **Issues & Discussions**: Use GitHub Issues for bugs and feature requests

---

**Last Updated**: October 18, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
