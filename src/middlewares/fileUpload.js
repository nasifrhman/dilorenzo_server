const multer = require("multer");
const path = require("path");

module.exports = function (UPLOADS_FOLDER) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_FOLDER);
    },
    filename: (req, file, cb) => {
      const fileExt = path.extname(file.originalname);
      const filename =
        file.originalname
          .replace(fileExt, "")
          .toLowerCase()
          .split(" ")
          .join("-") +
        "-" +
        Date.now();

      cb(null, filename + fileExt);
    },
  });

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 500 * 1024 * 1024, // 500 MB
    },
    fileFilter: (req, file, cb) => {
      const field = file.fieldname.toLowerCase();

      // IMAGE CHECK
      const imageTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/heic",
        "image/heif",
        "image/gif"
      ];

      // VIDEO CHECK
      const videoTypes = [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/quicktime",
        "video/mov",
        "video/x-matroska",
        "video/mkv",
        "video/avi",
        "video/x-msvideo"
      ];

      // AUDIO/VOICE CHECK
      const audioTypes = [
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
        "audio/mp4",
        "audio/webm"
      ];

      // DOCUMENT CHECK
      const docTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain"
      ];

      if (/image/i.test(field)) {
        if (imageTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error("Only image formats are allowed!"));
      } else if (/video/i.test(field)) {
        if (videoTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error("Only video formats are allowed!"));
      } else if (/audio|voice/i.test(field)) {
        if (audioTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error("Only audio/voice formats are allowed!"));
      } else if (/doc/i.test(field)) {
        if (docTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error("Only document formats are allowed!"));
      } else {
        // General or 'file' field: allow valid image, video, audio, or doc
        const allAllowed = [...imageTypes, ...videoTypes, ...audioTypes, ...docTypes];
        if (
          allAllowed.includes(file.mimetype) ||
          file.mimetype.startsWith("video/") ||
          file.mimetype.startsWith("image/")
        ) {
          cb(null, true);
        } else {
          cb(new Error("Unsupported file format!"));
        }
      }
    },
  });

  return upload;
};
