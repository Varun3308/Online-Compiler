const mongoose = require("mongoose");

const DBConnection = async () => {
  try {
    console.log("DB Connection with Server Starting...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB Connection with Server established");
  } catch (error) {
    console.log("DB Connection with Server error " + error);
    throw error;
  }
};

module.exports = DBConnection;
