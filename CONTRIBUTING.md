# Contributing to ProofKit

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm (managed via corepack)
- [Doppler CLI](https://docs.doppler.com/docs/install-cli) for secrets management

### Setup

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/proofgeist/proofkit.git
cd proofkit
corepack enable
pnpm install
```

2. Install and configure Doppler:

```bash
# Install Doppler CLI
brew install dopplerhq/cli/doppler  # macOS
# or: curl -Ls https://cli.doppler.com/install.sh | sh  # Linux

# Login to Doppler
doppler login

# Setup project (select proofkit project, dev config)
doppler setup
```

### Running Tests

Test scripts automatically use `doppler run` to inject secrets:

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm --filter @proofkit/fmodata test
pnpm --filter @proofkit/fmodata test:e2e
```

### Building

```bash
pnpm build
```

### Linting and Formatting

```bash
pnpm lint
pnpm format
```

## Development Workflow

1. Create a new branch for your feature or fix
2. Make your changes
3. Run tests with `pnpm test:local`
4. Run `pnpm lint` to check for issues
5. Submit a pull request

## Code Style

This project uses [Ultracite](https://github.com/proofgeist/ultracite) for linting and formatting. Run `pnpm dlx ultracite fix` to auto-fix issues before committing.
