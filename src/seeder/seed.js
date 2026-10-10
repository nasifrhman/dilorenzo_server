const User = require("../modules/User/user.model");


const seedAdmin = async () => {
  try {
    const user = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (user) {
      return;
    }
    await User.create({
      fullName: "Admin",
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: "admin"
    });

    console.log("✅ Super Admin created successfully.");
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  }
};


module.exports = {
  seedAdmin
}

