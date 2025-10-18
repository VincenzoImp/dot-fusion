# Developer Quick Start Guide

Welcome to DotFusion! This guide will help you get started developing on the cross-chain atomic swap protocol.

## 🚀 Quick Setup (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/VincenzoImp/dot-fusion.git
cd dot-fusion
yarn install

# 2. Start local blockchain
yarn chain

# 3. Deploy contracts (in new terminal)
yarn deploy

# 4. Run tests
yarn test

# 5. Start frontend (in new terminal)
yarn start
```

Visit http://localhost:3000 to see the UI!

---

## 🔧 Development Workflow

### Making Changes to Smart Contracts

```bash
# 1. Edit contract in packages/hardhat/contracts/
vim packages/hardhat/contracts/EthereumEscrow.sol

# 2. Compile
yarn compile

# 3. Run tests
yarn test

# 4. Deploy to local network
yarn deploy

# 5. Deploy to testnet
yarn deploy --network sepolia
```

### Writing Tests

```bash
# Location: packages/hardhat/test/

# Run all tests
yarn test

# Run specific test file
yarn hardhat:test --grep "EthereumEscrow"

# Generate gas report
REPORT_GAS=true yarn test
```

### Frontend Development

```bash
# Location: packages/nextjs/

# Start dev server
yarn start

# Type checking
yarn next:check-types

# Linting
yarn next:lint

# Build for production
yarn next:build
```

---

## 📁 Project Structure

```
dot-fusion/
├── packages/
│   ├── hardhat/                  # Smart contracts
│   │   ├── contracts/
│   │   │   ├── EthereumEscrow.sol    # ✅ Main Ethereum contract
│   │   │   ├── PolkadotEscrow.sol    # ✅ Main Polkadot contract
│   │   │   └── XCMBridge.sol         # ⚠️  Needs implementation
│   │   ├── deploy/
│   │   │   └── 00_deploy_all.ts      # Deployment script
│   │   ├── test/
│   │   │   └── EthereumEscrow.test.ts  # ✅ 24 tests passing
│   │   └── hardhat.config.ts
│   │
│   └── nextjs/                   # Frontend
│       ├── app/                  # Next.js pages
│       ├── components/           # React components
│       ├── hooks/                # Custom hooks
│       └── contracts/            # Contract ABIs
│
├── ANALYSIS_SUMMARY.md          # 📊 Complete analysis report
├── SECURITY_AUDIT.md            # 🔒 Security findings & fixes
├── TECHNICAL_IMPROVEMENTS.md    # 🛠️  Roadmap & improvements
├── CLAUDE.md                    # 🤖 AI assistant guide
└── README.md                    # 📖 Main documentation
```

---

## 🎯 Current Status & Next Steps

### ✅ What's Working

- **EthereumEscrow:** Fully functional and tested
- **Security:** Reentrancy guards applied, CEI pattern implemented
- **Tests:** 24/24 tests passing for Ethereum side
- **Gas Optimization:** ~45k gas per swap completion

### ⚠️ What Needs Work

1. **XCM Bridge** (CRITICAL - Priority 1)
   - File: `packages/hardhat/contracts/XCMBridge.sol`
   - Issue: `sendToEthereum()` is stub implementation
   - Effort: 2-3 weeks

2. **Native DOT Support** (HIGH - Priority 2)
   - File: `packages/hardhat/contracts/PolkadotEscrow.sol`
   - Issue: Only supports ERC20, not native DOT
   - Solution: Create WDOT wrapper
   - Effort: 1-2 weeks

3. **Test Coverage** (HIGH - Priority 3)
   - Missing: PolkadotEscrow tests (0%)
   - Missing: XCMBridge tests (0%)
   - Missing: Integration tests
   - Effort: 2-3 weeks

---

## 🔨 Priority Tasks for Contributors

### Task #1: Implement XCM Bridge (CRITICAL)

**File:** `packages/hardhat/contracts/XCMBridge.sol:88-96`

**Current Code:**
```solidity
function sendToEthereum(bytes32 swapId, bytes32 secret) external payable {
    // TODO: Implement XCM message sending via precompile
    emit MessageSent(swapId, secret);
}
```

**What to Implement:**
```solidity
function sendToEthereum(bytes32 swapId, bytes32 secret) external payable {
    if (address(escrow) == address(0)) revert EscrowNotSet();

    // Verify secret is valid
    require(escrow.isValidSecret(swapId, secret), "Invalid secret");

    // Encode XCM message
    bytes memory xcmMessage = abi.encodePacked(swapId, secret);

    // Call XCM precompile
    (bool success,) = XCM_PRECOMPILE.call{value: msg.value}(
        abi.encodeWithSignature(
            "send(uint32,bytes)",
            ETHEREUM_PARA_ID,  // Target parachain
            xcmMessage
        )
    );

    if (!success) revert XCMTransferFailed();
    emit MessageSent(swapId, secret);
}
```

**Resources:**
- [Polkadot XCM Docs](https://wiki.polkadot.network/docs/learn-xcm)
- XCM Precompile: `0x0000000000000000000000000000000000000804`

**Acceptance Criteria:**
- [ ] Message sends successfully to Ethereum
- [ ] Event emitted with correct parameters
- [ ] Error handling for failed sends
- [ ] Tests written and passing

---

### Task #2: Create WDOT Wrapper (HIGH)

**New File:** `packages/hardhat/contracts/WrappedDOT.sol`

**Implementation:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WrappedDOT is ERC20 {
    event Deposit(address indexed from, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);

    constructor() ERC20("Wrapped DOT", "WDOT") {}

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        require(msg.value > 0, "Must send DOT");
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) public {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _burn(msg.sender, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        emit Withdrawal(msg.sender, amount);
    }
}
```

**Deployment:**
```bash
# Deploy to Paseo
yarn deploy --network paseo --tags WDOT

# Verify
yarn verify --network paseo <WDOT_ADDRESS>
```

**Acceptance Criteria:**
- [ ] Contract deploys successfully
- [ ] Deposit function works
- [ ] Withdrawal function works
- [ ] Integration with PolkadotEscrow tested
- [ ] Tests written (10+ tests)

---

### Task #3: Add PolkadotEscrow Tests (HIGH)

**New File:** `packages/hardhat/test/PolkadotEscrow.test.ts`

**Template:**
```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("DotFusionPolkadotEscrow", function () {
  let escrow, wdot, owner, maker, taker;

  beforeEach(async function () {
    // Deploy WDOT
    const WDOT = await ethers.getContractFactory("WrappedDOT");
    wdot = await WDOT.deploy();

    // Deploy Escrow
    const Escrow = await ethers.getContractFactory("DotFusionPolkadotEscrow");
    escrow = await Escrow.deploy(RESCUE_DELAY, ethers.ZeroAddress);

    [owner, maker, taker] = await ethers.getSigners();
  });

  describe("Token Swap Creation", function () {
    it("Should create swap with WDOT", async function () {
      // TODO: Implement test
    });
  });

  // Add more test suites...
});
```

**Test Coverage Goals:**
- [ ] Deployment tests (3 tests)
- [ ] Token swap creation (5 tests)
- [ ] Swap completion (6 tests)
- [ ] Cancellation (4 tests)
- [ ] Rescue operations (4 tests)
- [ ] Safety deposit handling (3 tests)
- **Total: 25+ tests**

---

## 📚 Key Documentation

### Before You Start

1. **Read:** `ANALYSIS_SUMMARY.md` - Understand current state
2. **Review:** `SECURITY_AUDIT.md` - Know the security fixes
3. **Plan:** `TECHNICAL_IMPROVEMENTS.md` - See the roadmap

### While Developing

1. **Reference:** `CLAUDE.md` - Architecture and patterns
2. **Follow:** Solidity best practices (CEI pattern, reentrancy guards)
3. **Test:** Write tests before implementing features (TDD)

### Before Committing

```bash
# 1. Format code
yarn format

# 2. Lint
yarn lint

# 3. Type check
yarn hardhat:check-types
yarn next:check-types

# 4. Run all tests
yarn test

# 5. Check gas usage
REPORT_GAS=true yarn test
```

---

## 🧪 Testing Guidelines

### Writing Good Tests

```typescript
// ✅ GOOD: Descriptive test names
it("Should revert if caller is not the taker", async function () {
  await expect(
    escrow.connect(other).completeSwap(swapId, secret)
  ).to.be.revertedWithCustomError(escrow, "Unauthorized");
});

// ❌ BAD: Vague test names
it("Should fail", async function () {
  // What fails? Why?
});
```

### Test Structure

```typescript
describe("ContractName", function () {
  describe("FunctionName", function () {
    describe("When condition X", function () {
      it("Should do Y", async function () {
        // Arrange
        const value = await setup();

        // Act
        const result = await contract.function(value);

        // Assert
        expect(result).to.equal(expectedValue);
      });
    });
  });
});
```

---

## 🐛 Common Issues & Solutions

### Issue: "Invalid secret" error in tests

**Problem:** Using `ethers.id()` instead of `ethers.encodeBytes32String()`

```typescript
// ❌ WRONG
const secret = ethers.id("secret");  // This creates a hash!

// ✅ CORRECT
const secret = ethers.encodeBytes32String("secret");
const secretHash = ethers.keccak256(ethers.concat([secret]));
```

### Issue: Compilation fails

**Solution:**
```bash
# Clean and rebuild
yarn hardhat:clean
yarn compile
```

### Issue: Tests fail on fresh install

**Solution:**
```bash
# Reset local node
yarn chain  # Stop and restart

# Re-deploy
yarn deploy
```

### Issue: Gas estimation fails

**Solution:**
Add gas limit manually:
```typescript
await contract.function(args, { gasLimit: 500000 });
```

---

## 🎓 Learning Resources

### Solidity Security

- [Smart Contract Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [SWC Registry](https://swcregistry.io/) - Known vulnerabilities
- [Solidity by Example](https://solidity-by-example.org/)

### Polkadot Development

- [Polkadot Wiki](https://wiki.polkadot.network/)
- [XCM Documentation](https://wiki.polkadot.network/docs/learn-xcm)
- [Substrate Docs](https://docs.substrate.io/)

### Testing

- [Hardhat Testing](https://hardhat.org/tutorial/testing-contracts)
- [Chai Matchers](https://hardhat.org/hardhat-chai-matchers/docs/overview)
- [Ethers.js Docs](https://docs.ethers.org/)

---

## 💬 Getting Help

### Stuck on Something?

1. **Check Documentation:**
   - `README.md` - General overview
   - `CLAUDE.md` - Development guide
   - `SECURITY_AUDIT.md` - Security details

2. **Search Issues:**
   - [GitHub Issues](https://github.com/VincenzoImp/dot-fusion/issues)
   - Look for similar problems

3. **Ask for Help:**
   - Create a new issue with:
     - Clear description
     - Steps to reproduce
     - Error messages
     - Environment info

### Contributing

See `CONTRIBUTING.md` for:
- Code style guide
- Pull request process
- Review process

---

## ✅ Ready to Contribute?

1. **Fork the repository**
2. **Pick a task** from "Priority Tasks" above
3. **Create a branch:** `git checkout -b feature/xcm-bridge`
4. **Make changes and test:** `yarn test`
5. **Commit:** `git commit -m "feat: implement XCM bridge"`
6. **Push:** `git push origin feature/xcm-bridge`
7. **Create Pull Request** on GitHub

---

## 📊 Development Progress Tracker

Track your progress:

### Sprint 1: XCM Bridge (Weeks 1-3)
- [ ] Research XCM precompile API
- [ ] Implement `sendToEthereum()`
- [ ] Add error handling
- [ ] Write tests (10+)
- [ ] Deploy to Paseo testnet
- [ ] Test cross-chain messages

### Sprint 2: Native DOT Support (Weeks 4-5)
- [ ] Create WrappedDOT contract
- [ ] Deploy to Paseo
- [ ] Integrate with PolkadotEscrow
- [ ] Write tests (10+)
- [ ] Provide initial liquidity

### Sprint 3: Test Coverage (Weeks 6-8)
- [ ] PolkadotEscrow tests (25+)
- [ ] XCMBridge tests (15+)
- [ ] Integration tests (10+)
- [ ] Reach >95% coverage

---

Good luck with development! 🚀

For questions: [Create an Issue](https://github.com/VincenzoImp/dot-fusion/issues/new)
