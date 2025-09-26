# Reactive CASR - Cross-Chain Automated Stop-Rebalance

A production-ready React + TypeScript dApp that demonstrates a novel Reactive Smart Contract workflow for automated cross-chain position management on Reactive Mainnet.

## 🚀 Overview

Reactive CASR (Cross-Chain Automated Stop-Rebalance) is a decentralized application that leverages Reactive Smart Contracts to automatically monitor and rebalance leveraged or liquidity provider positions across multiple chains. When predefined thresholds are breached, the system automatically triggers hedging trades or rebalancing actions.

### Key Features

- **Reactive Smart Contracts**: Automatically responds to on-chain events
- **Cross-Chain Operations**: Monitors positions on origin chains and executes actions on destination chains
- **Real-time Monitoring**: Live dashboard showing position status and reactive actions
- **Gas Optimization**: Efficient REACT gas usage with configurable budgets
- **User Authentication**: Secure wallet and email authentication via Supabase
- **Production Ready**: Comprehensive testing, CI/CD, and monitoring

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Origin Chain  │    │ Reactive Network │    │ Destination     │
│                 │    │                  │    │ Chain           │
│ OriginPosition  │───▶│ ReactiveManager  │───▶│ Destination     │
│ Contract        │    │ (Subscriptions)  │    │ Handler         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Supabase      │    │   React Frontend │    │   Backend APIs  │
│   Database      │    │   Dashboard      │    │   Callbacks     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

### Smart Contracts
- **Solidity ^0.8.19**: Smart contract development
- **OpenZeppelin**: Security libraries and standards
- **Hardhat**: Development environment and testing
- **Ethers.js**: Blockchain interaction

### Frontend
- **React 18**: User interface framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Ethers.js**: Wallet integration and contract interaction

### Backend
- **Node.js**: Serverless functions
- **TypeScript**: Type-safe backend development
- **Supabase**: Database and authentication

### Infrastructure
- **Supabase**: PostgreSQL database with real-time subscriptions
- **Vercel**: Frontend and backend deployment
- **GitHub Actions**: CI/CD pipeline
- **Reactive Mainnet**: Blockchain network

## 📋 Prerequisites

- Node.js 18+ and npm
- Git
- MetaMask wallet
- Supabase account
- Vercel account (for deployment)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/reactive-casr.git
cd reactive-casr
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

### 3. Environment Setup

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Hardhat / Contracts
REACTIVE_MAINNET_RPC=https://rpc.reactive.network
LASNA_TESTNET_RPC=https://rpc.lasna.reactive.network
PRIVATE_KEY=0x... # deployer key (funded with REACT for mainnet)
ETHERSCAN_API_KEY=...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anonxyz
SUPABASE_SERVICE_ROLE_KEY=service_role_key

# Frontend
NEXT_PUBLIC_REACTIVE_CHAIN_ID=1597

# Vercel / CI
VERCEL_TOKEN=...
```

### 4. Set Up Supabase

1. Create a new Supabase project
2. Run the database migrations:

```bash
# Apply the initial migration
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/init.sql
```

3. Set up Row Level Security (RLS) policies as defined in the migration file

### 5. Deploy Smart Contracts

#### Deploy to Lasna Testnet (Recommended for testing)

```bash
npx hardhat run scripts/deploy.ts --network lasna-testnet
```

#### Deploy to Reactive Mainnet (Production)

```bash
npx hardhat run scripts/deploy.ts --network reactive-mainnet
```

The deployment script will:
- Deploy all three contracts (OriginPosition, DestinationHandler, ReactiveManager)
- Register subscriptions with the Reactive Network
- Output contract addresses and transaction hashes to `deploy/output.json`

### 6. Run the Frontend

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:3000`

## 🧪 Testing

### Run Contract Tests

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test tests/ReactiveManager.test.ts

# Run with coverage
npx hardhat coverage
```

### Run Frontend Tests

```bash
cd frontend
npm run test
```

### Run Integration Tests

```bash
npx hardhat test tests/Integration.test.ts
```

## 📱 Usage

### 1. Connect Wallet

1. Open the application in your browser
2. Click "Connect Wallet" and approve the MetaMask connection
3. Ensure you're connected to Reactive Mainnet (Chain ID: 1597)

### 2. Create a Position

1. Navigate to "Create Position"
2. Fill in the position details:
   - **Origin Chain ID**: Chain where your position exists
   - **Origin Contract**: Address of the position contract
   - **Position Identifier**: Unique identifier for your position
   - **Threshold**: Price/liquidity change threshold to trigger actions
   - **Action Type**: Type of action to perform (rebalance, partial_unwind, hedge)
   - **Gas Budget**: Maximum REACT to spend on reactive actions
3. Click "Create Position" and confirm the transaction

### 3. Monitor Activity

1. View your positions on the Dashboard
2. Monitor reactive actions in the Activity tab
3. Check gas usage and success rates

### 4. Admin Functions

Admin users can:
- View contract addresses and system status
- Register subscriptions
- Update gas budgets
- Monitor system health

## 🔧 Development

### Project Structure

```
reactive-casr/
├── contracts/              # Smart contracts
│   ├── ReactiveManager.sol
│   ├── OriginPosition.sol
│   ├── DestinationHandler.sol
│   └── interfaces/
├── scripts/                # Deployment scripts
│   ├── deploy.ts
│   └── registerSubscriptions.ts
├── tests/                  # Contract tests
├── frontend/               # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── lib/
│   └── package.json
├── backend/                # Serverless functions
│   ├── api/
│   └── lib/
├── supabase/               # Database migrations
│   └── migrations/
├── .github/                # CI/CD workflows
│   └── workflows/
└── docs/                   # Documentation
```

### Adding New Features

1. **Smart Contracts**: Add new contracts in `contracts/` and update deployment scripts
2. **Frontend**: Add new components in `frontend/src/components/` and pages in `frontend/src/pages/`
3. **Backend**: Add new API endpoints in `backend/api/`
4. **Database**: Create new migrations in `supabase/migrations/`

### Code Style

- Use TypeScript for all new code
- Follow Solidity style guide for smart contracts
- Use Prettier for code formatting
- Write comprehensive tests for all new features

## 🚀 Deployment

### Automated Deployment

The project includes GitHub Actions workflows for automated deployment:

1. **CI Pipeline** (`.github/workflows/ci.yml`):
   - Runs on every push and pull request
   - Tests contracts, frontend, and backend
   - Performs security audits
   - Checks code quality

2. **Deploy Pipeline** (`.github/workflows/deploy.yml`):
   - Manual trigger with environment selection
   - Deploys contracts to testnet or mainnet
   - Deploys frontend to Vercel
   - Deploys backend functions to Vercel

### Manual Deployment

#### Deploy Contracts

```bash
# Testnet
npx hardhat run scripts/deploy.ts --network lasna-testnet

# Mainnet
npx hardhat run scripts/deploy.ts --network reactive-mainnet
```

#### Deploy Frontend

```bash
cd frontend
npm run build
# Deploy the dist/ folder to your hosting provider
```

#### Deploy Backend

```bash
cd backend
npm run build
# Deploy the dist/ folder to your serverless provider
```

## 🔒 Security

### Smart Contract Security

- Uses OpenZeppelin libraries for security
- Implements proper access controls
- Includes pause functionality for emergencies
- Comprehensive test coverage
- Gas optimization and limits

### Application Security

- Row Level Security (RLS) in Supabase
- Input validation and sanitization
- Secure environment variable handling
- HTTPS enforcement in production

### Audit Readiness

The codebase is prepared for security audits with:
- Clear documentation of security assumptions
- Comprehensive test coverage
- Gas optimization analysis
- Access control documentation

## 📊 Monitoring

### On-Chain Monitoring

- Contract events and logs
- Transaction success rates
- Gas usage tracking
- Reactive action frequency

### Application Monitoring

- User activity and engagement
- Error rates and performance
- Database query performance
- API response times

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for all new features
- Update documentation as needed
- Follow the existing code style
- Ensure all CI checks pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` folder for detailed guides
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join the community discussions for questions and ideas

## 🎯 Roadmap

- [ ] Multi-chain support expansion
- [ ] Advanced position types (options, futures)
- [ ] Mobile application
- [ ] Advanced analytics and reporting
- [ ] Integration with more DEXs and protocols
- [ ] Governance token and DAO

## 🙏 Acknowledgments

- Reactive Network team for the innovative reactive smart contract technology
- OpenZeppelin for security libraries
- Supabase for the backend infrastructure
- The DeFi community for inspiration and feedback

---

**Built with ❤️ for the Reactive Network ecosystem**