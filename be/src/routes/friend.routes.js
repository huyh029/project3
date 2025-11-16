import express from "express";
import authMiddleware from "../middlewares/auth.js";
import { FriendController } from "../controllers/friend.controller.js";

const router = express.Router();

router.get("/", authMiddleware, FriendController.listFriends);
router.get("/requests", authMiddleware, FriendController.listRequests);
router.post("/requests", authMiddleware, FriendController.sendRequest);
router.patch("/requests/:requestId", authMiddleware, FriendController.respondRequest);

export default router;
