const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Student } = require("../Models");

const JWT_SECRET = process.env.JWT_SECRET;

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ msg: "User exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    // If student → create student profile
    if (role === "student") {
      await Student.create({
        user_id: user.id,
      });
    }

    res.json({ msg: "User registered", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.login = async (req, res) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ error: "JWT_SECRET is not configured" });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ msg: "Invalid email" });

    let isMatch = await bcrypt.compare(password, user.password);
    // Supports one-time migration if a legacy plaintext password exists.
    if (!isMatch && user.password === password) {
      const upgradedHash = await bcrypt.hash(password, 10);
      await user.update({ password: upgradedHash });
      isMatch = true;
    }

    if (!isMatch) return res.status(400).json({ msg: "Wrong password" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ msg: "currentPassword and newPassword are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ msg: "New password must be at least 6 characters" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    res.json({ msg: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

