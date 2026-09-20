import multer from "multer";

const storage = multer.memoryStorage();

export const spaceImageUpload = multer({
  storage,
  limits: {
    fileSize: 6 * 1024 * 1024,
    files: 8
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }

    cb(new Error("Only image files are allowed"));
  }
});
