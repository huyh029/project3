import { AuthService } from "../services/auth.service.js";

export class AuthController {
  // ======================
  // Đăng ký (Register)
  // ======================
  static async register(req, res) {
    try {
      const { name, email, password } = req.body;

      // Gọi service để tạo user mới
      const { player, token } = await AuthService.register({ name, email, password });

      // Trả về client
      return res.status(201).json({
        success: true,
        message: "Đăng ký thành công",
        data: {
          player,
          token,
        },
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  // ======================
  // Đăng nhập (Login)
  // ======================
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const { player, token } = await AuthService.login({ email, password });

      return res.status(200).json({
        success: true,
        message: "Đăng nhập thành công",
        data: {
          player,
          token,
        },
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  // ======================
  // Kiểm tra token (tùy chọn)
  // ======================
  static async verifyToken(req, res) {
    try {
      const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
      if (!token) throw new Error("Token không được cung cấp");

      const decoded = AuthService.verifyToken(token);

      return res.status(200).json({
        success: true,
        message: "Token hợp lệ",
        data: decoded,
      });
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: err.message,
      });
    }
  }
}
