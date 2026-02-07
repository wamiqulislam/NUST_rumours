# Campus Rumor Verification System

A decentralized, anonymous rumor platform with credibility-weighted voting where truth emerges dynamically without central authority.

![Campus Rumors](https://img.shields.io/badge/Status-Active-green)
![Anonymous](https://img.shields.io/badge/Privacy-Anonymous-blue)
![Decentralized](https://img.shields.io/badge/Trust-Decentralized-purple)

## Features

- 🔒 **100% Anonymous** - No user identities stored, only hashed fingerprints
- ⚖️ **Credibility-Weighted Voting** - Your voting accuracy determines your influence
- 🤖 **AI Content Filtering** - Automatic spam and relevance detection
- 🔗 **DAG Rumor References** - Rumors can reference each other
- 🛡️ **Sybil Resistant** - Rate limiting and pattern detection prevent abuse
- 🔄 **Automatic Locking** - Rumors lock at 75% (verified) or 25% (disputed)

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8.0+

### Installation

1. Clone and install dependencies:

```bash
cd rumor-app
npm install
```

2. Configure environment:

```bash
cp .env.example .env.local
# Edit .env.local with your MySQL credentials
```

3. Initialize database:

```bash
# Start MySQL and create the database
mysql -u root -e "CREATE DATABASE rumor_verification"

# Start the app
npm run dev

# Initialize tables by calling:
# POST http://localhost:3000/api/init
```

4. Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── rumors/        # Rumor CRUD + voting
│   │   ├── user/          # User stats
│   │   └── init/          # Database init
│   ├── rumor/[id]/        # Single rumor page
│   ├── submit/            # Submit form page
│   └── page.tsx           # Homepage feed
├── components/            # React components
├── lib/
│   ├── db/               # Database schema & connection
│   ├── engine/           # Core logic
│   │   ├── truthScore.ts    # T(R) calculation
│   │   ├── credibility.ts   # User credibility
│   │   ├── rumorLifecycle.ts # State machine
│   │   └── rumorDAG.ts      # Reference graph
│   ├── auth/             # Anonymous identity
│   └── ai/               # Content filtering
└── docs/                 # Mathematical proofs
```

## API Endpoints

| Method | Endpoint                   | Description             |
| ------ | -------------------------- | ----------------------- |
| GET    | `/api/rumors`              | List rumors (paginated) |
| POST   | `/api/rumors`              | Submit new rumor        |
| GET    | `/api/rumors/:id`          | Get rumor details       |
| DELETE | `/api/rumors/:id`          | Delete rumor            |
| POST   | `/api/rumors/:id/vote`     | Cast vote               |
| GET    | `/api/rumors/:id/comments` | Get comments            |
| POST   | `/api/rumors/:id/comments` | Add comment             |
| GET    | `/api/user`                | Get user stats          |
| POST   | `/api/init`                | Initialize database     |

## Core Algorithms

### Truth Score Calculation

```
T(R) = Σ(s(v) · C(v)) / Σ(C(v))
```

- `s(v) = +1` for verify, `-1` for dispute
- `C(v)` = voter credibility ∈ [0,1]

### Credibility Updates

```
C_new = clip(C_old + 0.05 × alignment, 0, 1)
```

- `alignment = +1` if vote matches final outcome
- `alignment = -1` if vote opposes final outcome

See [docs/mathematical_proof.md](docs/mathematical_proof.md) for formal proofs.

## License

MIT
