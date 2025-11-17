// src/server.js
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { createServer } from "http";
import app from "./app.js";
import { initSocket } from "./socket/index.js";
import { startMatchmakingLoop } from "./services/matchmaking.service.js";
import { startMatchTimeoutWatcher } from "./services/matchTimeout.service.js";

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const DBNAME = process.env.DBNAME;

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DBNAME,
    });
    console.log("MongoDB connected:", MONGODB_URI);

    const httpServer = createServer(app);
    initSocket(httpServer);
    startMatchmakingLoop();
    startMatchTimeoutWatcher();

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start the server:", err);
  }
}

startServer();
