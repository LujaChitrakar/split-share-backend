# Chippin Backend

A comprehensive expense splitting and peer-to-peer payment platform built with Solana/USDC integration and Privy authentication.

## Overview

Chippin is a split-sharing application that enables users to manage group expenses, settle balances directly within the app using USDC on Solana, and facilitate seamless peer-to-peer transactions without the need for external payment applications.

## Core Features & Flow

### 🔐 Authentication Flow
Users authenticate through Privy, which handles wallet connection and user identity. Upon successful authentication, users receive a JWT token for subsequent API requests. The authentication system supports multiple wallet types and ensures secure access to all platform features.

### 👥 Friend Management System

**Adding Friends:**
- **Friend Requests**: Users can search for other users and send friend requests
- **QR Code Scanning**: Each user has a unique QR code that encodes their user ID. Other users can scan this QR code to instantly send a friend request
- **Request Management**: Users receive notifications for incoming friend requests and can accept or reject them
- **Friends List**: Once accepted, friends appear in the user's friends list for easy access

**Flow:**
1. User A generates their unique QR code from their profile
2. User B scans User A's QR code using the in-app camera
3. Friend request is automatically sent to User A
4. User A reviews and accepts the request
5. Both users are now connected as friends

### 🏦 Group Management System

**Creating & Managing Groups:**
- Users can create expense groups with custom names and descriptions
- Group creator automatically becomes the admin
- Each group gets a unique group code and QR code for easy joining

**Adding Members:**
- **Direct Addition**: Group admins can add existing friends directly to the group
- **Email Invitation**: Admins can invite users via email, even if they're not on the platform yet
- **QR/Code Join**: Users can join groups by scanning the group QR code or entering the group code manually

**Flow:**
1. Admin creates a group and adds initial members
2. Admin shares group QR code or sends email invitations
3. New members scan QR or enter code to join
4. All members can now add expenses and view group balances

### 💰 Expense Tracking & Settlement

**Adding Expenses:**
- Users add expenses to groups with description, amount, and date
- Expenses can be split equally or with custom amounts among selected members
- The system automatically calculates who paid and who owes

**Smart Balance Calculation:**
- The app maintains a balance sheet for each group
- It calculates the optimal settlement path (who owes whom)
- Balances are updated in real-time as expenses are added

**In-App Settlement:**
- Instead of external payments, users can settle balances directly within Chippin
- Settlement is done using USDC on Solana blockchain
- Once settled, group balances are updated and marked as paid

**Flow:**
1. User adds expense: "Dinner - $100" paid by User A
2. System splits equally among 4 members ($25 each)
3. Group balance shows: User B, C, D each owe User A $25
4. User B clicks "Settle" and sends 25 USDC to User A within the app
5. Balance updates: User C, D still owe $25 each

### 💸 Payment System

**Friend-to-Friend Payments:**
- Users can send USDC directly to friends without knowing their wallet address
- The app looks up the friend's wallet address automatically
- Eliminates copy-paste errors and simplifies the payment process

**QR Code Payments:**
- For non-friends or quick payments, users can scan a wallet address QR code
- The app decodes the address and initiates the transaction
- Useful for in-person payments

**Manual Address Entry:**
- Advanced users can manually enter a Solana wallet address
- Address validation ensures correct format before sending
- Provides flexibility for power users

**Flow:**
1. User selects "Send Money" from friends list
2. Enters amount and optional note
3. Reviews transaction details
4. Confirms payment
5. Transaction is processed on Solana blockchain
6. Both parties receive notification and transaction appears in history

### 🤝 Lending & Borrowing System

**Lending Money:**
- Direct and straightforward process
- Lender selects a friend, enters amount, and sends the loan
- System tracks the loan with timestamp and status

**Borrowing Money:**
- Borrower sends a borrow request with amount and reason
- Lender receives notification and can review the request
- Lender can accept (sends USDC) or reject the request
- Accepted loans are tracked until repayment

**Tracking:**
- Dashboard shows all active loans (money lent out)
- Dashboard shows all active borrows (money owed)
- Users can see total amounts lent and borrowed
- Payment reminders can be set for overdue amounts

**Flow - Lending:**
1. User A selects "Lend Money" and chooses User B
2. Enters amount: 100 USDC
3. USDC is sent to User B immediately
4. Loan is recorded in both users' lending/borrowing history

**Flow - Borrowing:**
1. User B needs money and sends borrow request to User A
2. Request includes: Amount (100 USDC) and reason ("Emergency")
3. User A receives notification and reviews request
4. User A accepts → 100 USDC is sent to User B
5. Loan is recorded and tracked until repayment

### 🎁 Rewards & Referral System

**Points Program:**
- Users earn points through various activities (primarily referrals)
- Points balance is tracked in the user's profile
- Progress bar shows distance to next cashback milestone

**Referral System:**
- Each user gets a unique referral code and QR code
- New users can sign up using a referral code or scanning QR
- Referrer earns points when referred user signs up and completes first transaction
- Referral statistics show total referrals and points earned

**Cashback:**
- For every 10,000 points accumulated, users receive 20 USDC as cashback
- Cashback is automatically credited to the user's wallet
- Points reset after cashback is claimed
- Users can track their cashback history

**Flow:**
1. User A shares referral code/QR with User B
2. User B signs up using the referral code
3. User B completes their first transaction
4. User A receives 100 points (configurable)
5. User A reaches 10,000 points
6. System automatically sends 20 USDC cashback to User A's wallet
7. Points counter resets to 0

### 📊 Activity Tracking

**Comprehensive Activity Feed:**
- All user actions are logged: expenses added, payments sent, friend requests, group joins, etc.
- Activities are timestamped and categorized
- Users can view their complete transaction history
- Activities include: transaction type, amount, involved parties, and status

**Activity Types Tracked:**
- Expense additions and updates
- Payment transactions (sent/received)
- Friend requests (sent/accepted/rejected)
- Group creations and joins
- Lending and borrowing activities
- Settlements and repayments
- Referral sign-ups
- Cashback earnings

**Flow:**
1. User performs any action in the app
2. Activity is logged with all relevant details
3. Activity appears in user's recent activities feed
4. Activities are filterable by type, date, and group
5. Users can click on activities to see full details

## Major Dependencies

**Backend Framework:**
- **Express.js**: Web application framework for API endpoints
- **MongoDB/Mongoose**: Database and ODM for data persistence

**Blockchain Integration:**
- **@solana/web3.js**: Solana blockchain interaction
- **@solana/spl-token**: USDC token operations on Solana
- **bs58**: Base58 encoding/decoding for Solana addresses

**Authentication & Security:**
- **jsonwebtoken**: JWT token generation and verification
- **bcrypt**: Password hashing
- **Zod**: Schema validation for API requests

**Utilities:**
- **nodemailer**: Email sending for group invitations
- **node-cron**: Scheduled tasks for automated processes
- **multer**: File upload handling
- **xlsx**: Excel export functionality

## Data Models

**Key Collections:**
- **users**: User profile information, wallet addresses, points balance, referral codes
- **friendships**: Friend relationships and request status
- **groups**: Group details, admin information, member lists, group codes
- **expenses**: Expense records with split details and settlement status
- **payments**: Transaction history with blockchain references
- **lending**: Lending and borrowing records with repayment tracking
- **activities**: Complete activity logs for all user actions

## Installation & Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## License

MIT License

## Support

For issues or questions, contact: support@chippin.app