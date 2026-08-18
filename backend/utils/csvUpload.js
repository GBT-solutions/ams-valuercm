const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ApiErrorResponce = require("./ApiErrorResponce");
const env = process.env.NODE_ENV;

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create uploads directory if it doesn't exist
        const uploadDir =
            env == "production"
                ? path.join(__dirname, "uploads", "csv")
                : path.join(__dirname, "../uploads/csv");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "csv-" + uniqueSuffix + path.extname(file.originalname));
    },
});

// File filter to only accept CSV files
const fileFilter = (req, file, cb) => {
    // Check file type
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
        cb(null, true);
    } else {
        cb(new Error("Only CSV files are allowed!"), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1, // Only allow 1 file
    },
});

// Middleware for single file upload
const uploadCSV = upload.single("csvFile");

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res
                .status(400)
                .json(new ApiErrorResponce(400, {}, "File size too large. Maximum size is 5MB."));
        }
        if (err.code === "LIMIT_FILE_COUNT") {
            return res
                .status(400)
                .json(new ApiErrorResponce(400, {}, "Too many files. Only one file is allowed."));
        }
        console.log(err);

        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "File upload error: " + err.message));
    } else if (err) {
        return res.status(400).json(new ApiErrorResponce(400, {}, err.message));
    }
    next();
};

// Utility function to read and parse CSV file
const parseCSVFile = (filePath) => {
    return new Promise((resolve, reject) => {
        const fs = require("fs");
        const csv = require("csv-parser");
        const results = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", () => {
                resolve(results);
            })
            .on("error", (error) => {
                reject(error);
            });
    });
};

// Utility function to validate CSV headers
const validateCSVHeaders = (headers, requiredHeaders) => {
    const missingHeaders = requiredHeaders.filter(
        (header) => !headers.some((h) => h.toLowerCase() === header.toLowerCase())
    );

    return {
        isValid: missingHeaders.length === 0,
        missingHeaders: missingHeaders,
    };
};

// Utility function to clean up uploaded file
const cleanupFile = (filePath) => {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

module.exports = {
    uploadCSV,
    handleUploadError,
    parseCSVFile,
    validateCSVHeaders,
    cleanupFile,
};
