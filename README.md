# AMAROK ONE

**ERP and Field Service Management System for Construction Equipment and Forklifts**

## About

AMAROK ONE is an enterprise resource planning (ERP) and field service management system designed specifically for construction equipment and forklift businesses. It helps manage equipment inventory, track field operations, and streamline service management.

## Current Tech Stack

- **Frontend**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Deployment**: AppDeploy

## Repository Purpose

This GitHub repository serves as:
- **Single source of truth** for all AMAROK ONE source code
- **Version control** to track all changes and history
- **Backup** for project continuity
- **Collaboration platform** for future team members

## Current Status

⚠️ **Important**: This repository is in the foundation setup phase. The complete AppDeploy source code is not yet included in this repository. The application cannot run locally yet from this repository alone.

## Planned Folder Structure

```
amarok-one/
├── frontend/              # React + TypeScript + Vite application
├── backend/               # API and backend services (planned)
├── docs/                  # Documentation and guides
│   ├── ARCHITECTURE.md    # System architecture
│   ├── DEPLOYMENT.md      # Deployment instructions
│   └── BACKUP.md          # Backup procedures
├── public/
│   └── resources/         # Public assets and resources
├── .github/
│   ├── workflows/         # GitHub Actions CI/CD
│   └── ISSUE_TEMPLATE/    # Issue templates
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## Branching Strategy

We use a simple branching strategy for solo development:

### Main Branches

- **`main`**: Stable, production-ready code. Only merge tested, reviewed code here.
- **`develop`**: Development branch for integrating features. This is where features come together.

### Working Branches

- **`feature/*`**: Create a new feature branch for each feature (e.g., `feature/equipment-management`, `feature/user-authentication`)
- **`fix/*`**: Create a bug fix branch for each bug (e.g., `fix/login-error`, `fix/inventory-calculation`)

### Workflow Example

```
1. Start from develop:
   git checkout develop
   git pull origin develop

2. Create a feature branch:
   git checkout -b feature/my-feature-name

3. Make changes and commit

4. Push to GitHub:
   git push origin feature/my-feature-name

5. Create a Pull Request (PR) on GitHub

6. Review and merge into develop

7. When develop is stable, create PR from develop → main
```

## Getting Started (Future)

Detailed setup instructions will be added once the application code is integrated into this repository.

## Documentation

For more information, see:
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design and architecture
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - How to deploy
- [BACKUP.md](docs/BACKUP.md) - Backup and recovery procedures
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

## License

(License to be determined)

## Contact

For questions or issues, please open an issue on this GitHub repository.
