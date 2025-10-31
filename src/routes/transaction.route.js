import express from "express";
import {
  Keypair,
  VersionedTransaction,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import bs58 from "bs58";

const router = express.Router();

// Environment variables
const FEE_PAYER_PRIVATE_KEY = process.env.FEE_PAYER_PRIVATE_KEY;
const FEE_PAYER_ADDRESS = process.env.FEE_PAYER_ADDRESS;
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const USDC_MINT = new PublicKey("4MNpcBkh5Pb5DeZPTF8MjdFGJGw3LDp9NfoSW495Q3ST"); // devnet USDC

// Initialize fee payer wallet
const feePayerWallet = Keypair.fromSecretKey(
  bs58.decode(FEE_PAYER_PRIVATE_KEY)
);
const connection = new Connection(RPC_URL);

// Whitelist of allowed programs
const ALLOWED_PROGRAMS = [
  TOKEN_PROGRAM_ID.toBase58(), // SPL Token program
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", // Associated Token program
  SystemProgram.programId.toBase58(), // System program
];

router.post("/sponsor-transaction", async (req, res, next) => {
  try {
    const { transaction: serializedTransaction, userPublicKey } = req.body;

    if (!serializedTransaction || !userPublicKey) {
      return res.status(400).json({ error: "Missing required data" });
    }

    // Deserialize transaction
    const transactionBuffer = Buffer.from(serializedTransaction, "base64");
    const transaction = VersionedTransaction.deserialize(transactionBuffer);

    // Security checks
    const message = transaction.message;
    const accountKeys = message.getAccountKeys();

    // 1. Verify fee payer
    const feePayer = accountKeys.get(0);
    if (!feePayer || feePayer.toBase58() !== FEE_PAYER_ADDRESS) {
      return res.status(403).json({ error: "Invalid fee payer" });
    }

    // 2. Verify user signed the transaction
    const userPubkey = new PublicKey(userPublicKey);
    const hasUserSignature = transaction.signatures.some((sig, idx) => {
      const signer = accountKeys.get(idx);
      return (
        signer && signer.equals(userPubkey) && sig.some((byte) => byte !== 0)
      );
    });

    if (!hasUserSignature) {
      return res.status(403).json({ error: "User signature missing" });
    }

    // 3. Verify all programs are whitelisted
    for (const instruction of message.compiledInstructions) {
      const programId = accountKeys.get(instruction.programIndex);
      if (programId && !ALLOWED_PROGRAMS.includes(programId.toBase58())) {
        return res.status(403).json({
          error: "Unauthorized program",
          program: programId.toBase58(),
        });
      }
    }

    // 4. Check for unauthorized transfers from fee payer
    for (const instruction of message.compiledInstructions) {
      const programId = accountKeys.get(instruction.programIndex);

      // Check System Program transfers
      if (programId?.equals(SystemProgram.programId)) {
        if (instruction.data[0] === 2) {
          // Transfer instruction
          const senderIndex = instruction.accountKeyIndexes[0];
          const sender = accountKeys.get(senderIndex);
          if (sender?.equals(feePayer)) {
            return res.status(403).json({
              error: "Cannot transfer SOL from fee payer",
            });
          }
        }
      }

      // Check SPL Token transfers
      if (programId?.equals(TOKEN_PROGRAM_ID)) {
        if (instruction.data[0] === 3) {
          // Transfer instruction
          const sourceOwnerIndex = instruction.accountKeyIndexes[2];
          const sourceOwner = accountKeys.get(sourceOwnerIndex);
          if (sourceOwner?.equals(feePayer)) {
            return res.status(403).json({
              error: "Cannot transfer tokens owned by fee payer",
            });
          }
        }
      }
    }

    // 5. Sign with fee payer
    transaction.sign([feePayerWallet]);

    // 6. Send transaction
    const signature = await connection.sendTransaction(transaction, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    // 7. Wait for confirmation
    await connection.confirmTransaction(signature, "confirmed");

    return res.status(200).json({
      transactionHash: signature,
      message: "Transaction sent successfully",
    });
  } catch (error) {
    console.error("Error processing transaction:", error);
    next(error); // Pass to your error handler middleware
  }
});

router.post("/send-usdc", async (req, res, next) => {
  try {
    const { recipientAddress, amount } = req.body;

    if (!recipientAddress || !amount) {
      return res
        .status(400)
        .json({ error: "Missing recipientAddress or amount" });
    }

    // Validate amount
    const usdcAmount = parseFloat(amount);
    if (isNaN(usdcAmount) || usdcAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const recipientPubkey = new PublicKey(recipientAddress);
    const feePayerPubkey = new PublicKey(FEE_PAYER_ADDRESS);

    // Get Associated Token Accounts
    const feePayerATA = await getAssociatedTokenAddress(
      USDC_MINT,
      feePayerPubkey
    );
    const recipientATA = await getAssociatedTokenAddress(
      USDC_MINT,
      recipientPubkey
    );

    // Check if fee payer has enough USDC
    try {
      const feePayerTokenAccount = await getAccount(connection, feePayerATA);
      const feePayerBalance = Number(feePayerTokenAccount.amount) / 1e6; // USDC has 6 decimals

      if (feePayerBalance < usdcAmount) {
        return res.status(400).json({
          error: `Insufficient USDC balance. Available: ${feePayerBalance} USDC`,
        });
      }
    } catch (error) {
      return res.status(400).json({
        error: "Fee payer does not have a USDC account or insufficient funds",
      });
    }

    // Build transaction
    const transaction = new Transaction();

    // Check if recipient's ATA exists, if not create it
    try {
      await getAccount(connection, recipientATA);
    } catch (error) {
      // Account doesn't exist, add instruction to create it
      console.log("Creating ATA for recipient");
      transaction.add(
        createAssociatedTokenAccountInstruction(
          feePayerPubkey, // Payer
          recipientATA, // ATA address
          recipientPubkey, // Owner
          USDC_MINT // Mint
        )
      );
    }

    // Add transfer instruction
    const amountInUnits = Math.floor(usdcAmount * 1e6); // Convert to smallest unit
    transaction.add(
      createTransferInstruction(
        feePayerATA, // Source
        recipientATA, // Destination
        feePayerPubkey, // Owner
        amountInUnits // Amount
      )
    );

    // Set transaction properties
    transaction.feePayer = feePayerPubkey;
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash("finalized")
    ).blockhash;

    // Sign and send
    transaction.sign(feePayerWallet);
    const signature = await connection.sendTransaction(
      transaction,
      [feePayerWallet],
      {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      }
    );

    // Wait for confirmation
    await connection.confirmTransaction(signature, "confirmed");

    return res.status(200).json({
      transactionHash: signature,
      message: `Successfully sent ${usdcAmount} USDC to ${recipientAddress}`,
      amount: usdcAmount,
      recipient: recipientAddress,
    });
  } catch (error) {
    console.error("Error funding USDC:", error);
    next(error);
  }
});

export default router;
