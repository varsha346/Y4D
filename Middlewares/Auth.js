const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

exports.verifyToken = (req, res, next) => {
  if (!JWT_SECRET) {
    return res.status(500).json({ msg: "JWT_SECRET is not configured" });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "Token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ msg: "Invalid token" });
  }
};
