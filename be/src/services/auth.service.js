import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Player from "../models/player.model.js";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "1d";

export class AuthService {
  static async register({ name, email, password }) {
    const existing = await Player.findOne({ email });
    if (existing) {
      throw new Error("Email đã được sử dụng");
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const player = await Player.create({
      name,
      email,
      password: hashedPassword,
      rank: "Bronze",
      level: 1,
      coin: 0,
      rating: 1200,
    });

    const token = this.generateToken(player);
    return { player, token };
  }

  static async login({ email, password }) {
    const player = await Player.findOne({ email });
    if (!player) {
      throw new Error("Email không tồn tại");
    }

    const valid = await bcrypt.compare(password, player.password);
    if (!valid) {
      throw new Error("Mật khẩu không đúng");
    }

    const token = this.generateToken(player);
    return { player, token };
  }

  static async hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static generateToken(player) {
    const payload = { id: player._id, email: player.email, name: player.name };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      throw new Error("Token không hợp lệ");
    }
  }
}

export default AuthService;
