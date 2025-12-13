import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel from "../../models/user.model.js";
import { StatusCodes } from "http-status-codes";
import envConfig from "../../configs/env.config.js";
import emailInviteModel from "../../models/emailInvites.model.js";
import groupModel from "../../models/group.model.js";
import recentActivityController from "../recentActivity/recentActivity.controller.js";
import { createUserATA } from "../ata.controller.js";
import { success } from "zod";

async function signup(req, res) {
  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const newUser = await new userModel({
    ...req.body,
    password: passwordHash,
  }).save();

  // Checking if the user email was invited to any group
  const emailInvite = await emailInviteModel.findOne({
    email: newUser.email,
  });
  if (emailInvite) {
    await Promise.all(emailInvite.groups_invited?.map(async (groupId) => {
      return await groupModel.findByIdAndUpdate(
        groupId,
        {
          $addToSet: {
            member_emails: newUser.email,
            members: newUser._id
          }
        },
        { timestamps: true }
      );
    }));
  }

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "User created successfully",
    data: newUser,
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await userModel.findOne({ email });
  if (!user) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Account does not exist with this email",
    });
  }
  // const isPasswordValid = await bcrypt.compare(password || "", user.password || "");
  // if (!isPasswordValid) {
  //   return res.status(StatusCodes.UNAUTHORIZED).json({
  //     success: false,
  //     message: "Password incorrect.",
  //   });
  // }
  const token = jwt.sign({ userId: user._id }, envConfig.JWT_SECRET, { expiresIn: "30d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  await recentActivityController.addToRecentActivities({
    group: groupId,
    user: req.user?._id,
    activityType: "LOGIN",
  });

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Login successful",
    data: { token },
  });
}

function extractUsernameFromEmail(email) {
  return email.split("@")[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

// async function signupOrLoginWithPrivy(req, res) {
//   const privyId = req.body.privyId;
//   const email = req.body.email;
//   const wallet_public_key = req.body.wallet_public_key;

//   let userWithPrivyId = await userModel.findOne({
//     // privyId,
//     email,
//   });

//   if (!userWithPrivyId) {
//     // Signup logic
//     userWithPrivyId = await new userModel({
//       privyId,
//       email,
//       wallet_public_key,
//       username: extractUsernameFromEmail(email),
//     }).save();
//     try {
//       await createUserATA(wallet_public_key);
//     } catch (error) {
//       console.log("ERROR IN CREATE USER ATA::", error);
//     }

//     // Checking if the user email was invited to any group
//     const emailInvite = await emailInviteModel.findOne({
//       email: userWithPrivyId.email,
//     });
//     if (emailInvite) {
//       await Promise.all(emailInvite.groups_invited?.map(async (groupId) => {
//         return await groupModel.findByIdAndUpdate(
//           groupId,
//           {
//             $addToSet: {
//               member_emails: userWithPrivyId.email,
//               members: userWithPrivyId._id
//             }
//           },
//           { timestamps: true }
//         );
//       }));
//     }

//   } else if (!userWithPrivyId?.wallet_public_key) {
//     await userModel.findByIdAndUpdate(userWithPrivyId?._id, {
//       wallet_public_key,
//     });
//   }
//   const token = jwt.sign({ userId: userWithPrivyId._id }, envConfig.JWT_SECRET, { expiresIn: "30d" });
//   res.cookie("token", token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "none",
//     maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
//   });
//   return res.status(StatusCodes.OK).json({
//     success: true,
//     message: "Login successful",
//     data: { token },
//   });

// }

async function signupOrLoginWithPrivy(req, res) {
  const privyId = req.body.privyId;
  const email = req.body.email;
  const wallet_public_key = req.body.wallet_public_key;
  const notification_token = req.body.notificationToken;

  let userWithPrivyId = await userModel.findOne({
    // privyId,
    email,
  });

  if (!userWithPrivyId) {
    // Signup logic
    userWithPrivyId = await new userModel({
      privyId,
      email,
      wallet_public_key,
      notification_token,
      username: extractUsernameFromEmail(email),
    }).save();
    try {
      await createUserATA(wallet_public_key);
    } catch (error) {
      console.log("ERROR IN CREATE USER ATA::", error);
    }

    // Checking if the user email was invited to any group
    const emailInvite = await emailInviteModel.findOne({
      email: userWithPrivyId.email,
    });
    if (emailInvite) {
      await Promise.all(emailInvite.groups_invited?.map(async (groupId) => {
        return await groupModel.findByIdAndUpdate(
          groupId,
          {
            $addToSet: {
              member_emails: userWithPrivyId.email,
              members: userWithPrivyId._id
            }
          },
          { timestamps: true }
        );
      }));
    }

  } else if (!userWithPrivyId?.wallet_public_key) {
    await userModel.findByIdAndUpdate(userWithPrivyId?._id, {
      wallet_public_key,
    });
  }
  const token = jwt.sign({ userId: userWithPrivyId._id }, envConfig.JWT_SECRET, { expiresIn: "30d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Login successful",
    data: { token },
  });

}

async function registerPin(req, res) {

  const { email, userPin } = req.body
  try {
    const data = await userModel.findOne({ email })
    if (data) {
      const hashedPIN = await bcrypt.hash(userPin, 5)
      await userModel.updateOne({ email }, { userPIN: hashedPIN })
      return res.status(200).json({ success: true, message: "Successfully registered the PIN" })
    } else {
      return res.status(400).json({ success: false, message: "There is no record of this email in the database" })
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: "Something went wrong while registering PIN" })
  }
}


async function verifyPin(req, res) {

  const { email, userPin } = req.body
  try {

    const data = await userModel.findOne({ email })
    const isTrue = await bcrypt.compare(userPin, data.userPIN)
    return res.status(isTrue ? 200 : 400).json({ "success": isTrue, message: isTrue ? "Correct PIN" : "Wrong PIN" })

  } catch (err) {
    return res.status(500).json({ "success": false, message: "Something went wrong while verifying pin" })
  }
}
// TODO: Implement Google OAuth login if necessary in future
async function loginWithGoogle(req, res) { }
async function handleGoogleCallback(req, res) { }

export default {
  signup,
  login,
  signupOrLoginWithPrivy,
  loginWithGoogle,
  handleGoogleCallback,
  registerPin,
  verifyPin
};
