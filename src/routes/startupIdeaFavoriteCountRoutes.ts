// routes/startupIdeaFavoriteCountRoutes.ts
import { Router } from "express";
import {
  getFavoriteCount,
  incrementFavoriteCount,
  setFavoriteCount,
  getFavoriteCountsBulk,
  favoriteIdea,
} from "../controllers/startupIdeaFavoriteCountController";

const startupIdeaFavoriteCountRoutes = Router();

startupIdeaFavoriteCountRoutes.get("/:ideaId", getFavoriteCount);
startupIdeaFavoriteCountRoutes.post(
  "/:ideaId/increment",
  incrementFavoriteCount
);
startupIdeaFavoriteCountRoutes.put("/:ideaId", setFavoriteCount);
startupIdeaFavoriteCountRoutes.post("/bulk", getFavoriteCountsBulk);

// unified favorite endpoint
startupIdeaFavoriteCountRoutes.post("/:ideaId/favorite", favoriteIdea);

export default startupIdeaFavoriteCountRoutes;
