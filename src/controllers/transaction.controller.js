import {
    Keypair,
    Connection,
    PublicKey,
    Transaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { getAssociatedTokenAddress, getAccount, createTransferInstruction } from "@solana/spl-token";


// Environment variables
const FEE_PAYER_PRIVATE_KEY = process.env.FEE_PAYER_PRIVATE_KEY;
const FEE_PAYER_ADDRESS = process.env.FEE_PAYER_ADDRESS;
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const USDC_MINT = new PublicKey("4MNpcBkh5Pb5DeZPTF8MjdFGJGw3LDp9NfoSW495Q3ST");

// Initialize fee payer wallet
const feePayerWallet = Keypair.fromSecretKey(
    bs58.decode(FEE_PAYER_PRIVATE_KEY)
);
const connection = new Connection(RPC_URL);

async function sendUsdc({
    recipientAddress, amount
}) {
    console.log("RECEIPENT ADD:::", recipientAddress);
    try {

        if (!recipientAddress || !amount) {
            return { success: false, message: "Missing recipientAddress or amount" };
        }

        // Validate amount
        const usdcAmount = parseFloat(amount);
        if (isNaN(usdcAmount) || usdcAmount <= 0) {
            return { success: false, message: "Invalid amount" };
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
                return { success: false, message: `Insufficient USDC balance. Available: ${feePayerBalance} USDC` };
            }
        } catch (error) {
            console.log("ERROR::", error)
            return {
                success: false,
                message: "Fee payer does not have a USDC account or insufficient funds",
            };
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

        return {
            success: true,
            message: `Successfully sent ${usdcAmount} USDC to ${recipientAddress}`,
            data:
            {
                transactionHash: signature,
                message: `Successfully sent ${usdcAmount} USDC to ${recipientAddress}`,
                amount: usdcAmount,
                recipient: recipientAddress,
            }
        };
    } catch (error) {
        console.error("Error funding USDC:", error);
        next(error);
    }
}

export default {
    sendUsdc,
};