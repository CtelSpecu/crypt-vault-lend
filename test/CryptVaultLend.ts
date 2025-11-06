import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  borrower: HardhatEthersSigner;
  lender: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = await ethers.getContractFactory("CryptVaultLend");
  const cryptVaultLendContract = await factory.deploy();
  const cryptVaultLendAddress = await cryptVaultLendContract.getAddress();

  return { cryptVaultLendContract, cryptVaultLendAddress };
}

describe("CryptVaultLend", function () {
  let signers: Signers;
  let cryptVaultLendContract: any;
  let cryptVaultLendAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], borrower: ethSigners[1], lender: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ cryptVaultLendContract, cryptVaultLendAddress } = await deployFixture());
  });

  it("should deploy with initial pool stats", async function () {
    const stats = await cryptVaultLendContract.getPoolStats();
    expect(stats).to.exist;
  });

  it("should create a new loan", async function () {
    // Encrypt loan parameters
    const amount = 50000; // $50,000
    const interestRate = 750; // 7.5%
    const collateral = 100000; // $100,000
    
    const encryptedAmount = await fhevm
      .createEncryptedInput(cryptVaultLendAddress, signers.borrower.address)
      .add32(amount)
      .encrypt();
    
    const encryptedInterestRate = await fhevm
      .createEncryptedInput(cryptVaultLendAddress, signers.borrower.address)
      .add32(interestRate)
      .encrypt();
    
    const encryptedCollateral = await fhevm
      .createEncryptedInput(cryptVaultLendAddress, signers.borrower.address)
      .add32(collateral)
      .encrypt();
    
    const tx = await cryptVaultLendContract.connect(signers.borrower).createLoan(
      encryptedAmount.handles[0],
      encryptedAmount.inputProof,
      encryptedInterestRate.handles[0],
      encryptedInterestRate.inputProof,
      12, // 12 months
      "ETH",
      encryptedCollateral.handles[0],
      encryptedCollateral.inputProof
    );
    
    await expect(tx).to.emit(cryptVaultLendContract, "LoanCreated");
    
    const totalLoans = await cryptVaultLendContract.getTotalLoans();
    expect(totalLoans).to.equal(1);
  });

  it("should fund a loan", async function () {
    // First create a loan
    const amount = 50000;
    const interestRate = 750;
    const collateral = 100000;
    
    const encryptedAmount = await fhevm
      .createEncryptedInput(cryptVaultLendAddress, signers.borrower.address)
      .add32(amount)
      .encrypt();
    
    const encryptedInterestRate = await fhevm
      .createEncryptedInput(cryptVaultLendAddress, signers.borrower.address)
      .add32(interestRate)
      .encrypt();
    
    const encryptedCollateral = await fhevm
      .createEncryptedInput(cryptVaultLendAddress, signers.borrower.address)
      .add32(collateral)
      .encrypt();
    
    await cryptVaultLendContract.connect(signers.borrower).createLoan(
      encryptedAmount.handles[0],
      encryptedAmount.inputProof,
      encryptedInterestRate.handles[0],
      encryptedInterestRate.inputProof,
      12,
      "ETH",
      encryptedCollateral.handles[0],
      encryptedCollateral.inputProof
    );
    
    // Now fund it
    const loanId = 0;
    const tx = await cryptVaultLendContract.connect(signers.lender).fundLoan(loanId);
    await expect(tx).to.emit(cryptVaultLendContract, "LoanActivated");
    
    const loan = await cryptVaultLendContract.getLoan(loanId);
    expect(loan.status).to.equal(1); // Active status
  });
});
