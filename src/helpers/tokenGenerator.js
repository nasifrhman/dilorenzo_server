const jwt = require('jsonwebtoken');

const tokenGenerator = async (user, admin) => {

  const payload = {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    number: user.number,
    countryCode: user.countryCode,
    image: user.image, role: user.role,
    // isLoginToken: user.isLoginToken ? user.isLoginToken : false
    tokenVersion: user.tokenVersion
  }
  if (admin && admin !== null && admin !== 'null') {
    payload.isSupperAdmin = admin.isSupperAdmin;
    payload.parent = admin.parent;
  }
  // console.log("payload", payload);
  return await jwt.sign(payload, process.env.JWT_ACCESS_TOKEN, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
}


const refreshTokenGenerator = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      role: user.role,
      tokenVersion: user.tokenVersion || 0
    },
    process.env.JWT_REFRESH_TOKEN,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
    }
  );
};



const resetTokenGenerator = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      purpose: "reset-password"
    },
    process.env.JWT_ACCESS_TOKEN,
    {
      expiresIn: "10m"
    }
  );
};



module.exports = { tokenGenerator, refreshTokenGenerator, resetTokenGenerator };