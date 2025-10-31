import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import bs58 from "bs58";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

const RELAYER = Keypair.fromSecretKey(
  bs58.decode(process.env.FEE_PAYER_PRIVATE_KEY)
);
const RELAYER_ADDRESS = new PublicKey(process.env.FEE_PAYER_ADDRESS);
const USDC_MINT = new PublicKey("4MNpcBkh5Pb5DeZPTF8MjdFGJGw3LDp9NfoSW495Q3ST"); // USDC Mint

export async function createUserATA(userPubkeyString) {
  try {
    const userPubkey = new PublicKey(userPubkeyString);
    const userATA = await getAssociatedTokenAddress(USDC_MINT, userPubkey);

    // Check if ATA already exists
    const ataInfo = await connection.getAccountInfo(userATA);
    if (ataInfo) {
      console.log("✅ ATA already exists:", userATA.toBase58());
      return userATA.toBase58();
    }

    // Create ATA if not exist
    console.log("🪄 Creating new ATA for user...");
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        RELAYER_ADDRESS, // payer
        userATA, // new ATA address
        userPubkey, // owner of ATA
        USDC_MINT // token mint
      )
    );

    tx.feePayer = RELAYER_ADDRESS;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const sig = await sendAndConfirmTransaction(connection, tx, [RELAYER]);
    console.log(" ATA created successfully:", sig);

    return userATA.toBase58();
  } catch (err) {
    console.error("Error creating ATA:", err);
    throw err;
  }
}
