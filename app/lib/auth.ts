import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectDB from "./connectDB";
import User from "@/app/models/User";

const JWT_SECRET = process.env.JWT_SECRET!;

export const registerUser = async (
  username: string,
  email: string,
  password: string,
) => {
  await connectDB();
  const existing = await User.findOne({ email });
  if (existing) throw new Error("Email already in use");
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, password: hashed });
  return user;
};

export const loginUser = async (email: string, password: string) => {
  await connectDB();
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid password");

  const token = jwt.sign(
    { userId: user._id, username: user.username },
    JWT_SECRET,
    {
      expiresIn: "1h",
    },
  );

  return { token, username: user.username, email: user.email };
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
      email: string;
    };
  } catch {
    return null;
  }
};
