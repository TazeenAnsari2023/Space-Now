import { Router } from "express";
import { attachUserIfPresent, verifyOwner, verifyToken } from "../middleware/auth.middleware";
import { spaceImageUpload } from "../middleware/upload.middleware";
import {
  createSpace,
  deleteOwnerSpace,
  geocodeSpaceAddress,
  getIndiaCityStats,
  getIndiaRegionsGeo,
  getNearbySpaces,
  getOwnerEnquiryNotifications,
  getOwnerSpaces,
  getSpaceById,
  updateOwnerSpace,
  uploadSpacePhotos
} from "../controllers/space.controller";

const router = Router();

router.get("/nearby", getNearbySpaces);
router.get("/cities/india", getIndiaCityStats);
router.get("/geo/india", getIndiaRegionsGeo);
router.get("/owner", verifyToken, verifyOwner, getOwnerSpaces);
router.get("/owner/me", verifyToken, verifyOwner, getOwnerSpaces);
router.get("/owner/enquiries", verifyToken, verifyOwner, getOwnerEnquiryNotifications);
router.post("/geocode", verifyToken, verifyOwner, geocodeSpaceAddress);
router.post(
  "/upload-photo",
  verifyToken,
  verifyOwner,
  spaceImageUpload.array("photos", 8),
  uploadSpacePhotos
);
router.get("/:id", attachUserIfPresent, getSpaceById);
router.post("/", verifyToken, verifyOwner, createSpace);
router.put("/:id", verifyToken, verifyOwner, updateOwnerSpace);
router.delete("/:id", verifyToken, verifyOwner, deleteOwnerSpace);

export default router;
