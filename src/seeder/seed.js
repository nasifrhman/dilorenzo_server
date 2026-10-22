const User = require("../modules/User/user.model");


const seedAdmin = async () => {
  try {
    const user = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (user) {
      if (!user.isSuperAdmin) {
        user.isSuperAdmin = true;
        user.isEmailVerified = true;
        user.isProfileCompleted = true;
        await user.save();
      }
      return;
    }
    await User.create({
      fullName: "Di Lorenzo Admin",
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: "admin",
      isSuperAdmin: true,
      isEmailVerified: true,
      isProfileCompleted: true,
      roleTitle: "Head of Operations & Academy Director"
    });

    console.log("✅ Super Admin created successfully.");
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  }
};


module.exports = {
  seedAdmin
}

