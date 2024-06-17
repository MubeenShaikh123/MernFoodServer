const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  const token = req.header('x-access-token');
  if (!token) {
    console.log("No token")
    return res.status(401).json({ error: 'No token, authorization denied' });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT);
      req.user = decoded;
      next();
      } catch (error) {
        res.status(401).json({ error: 'Token is not valid' });
  }
};
