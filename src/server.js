import app from "./app.js";
import { connectMongoose } from "./services/database.service.js";
import envConfig from "./configs/env.config.js";

const PORT = envConfig.PORT;

connectMongoose().then((connection) => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error("❌ Database connection error:", error?.message);
  process.exit(1); // Exit the application if the database connection fails
});

