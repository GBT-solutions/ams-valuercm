const fs = require("fs");
const path = require("path");
const util = require("util");

// Base log directory defaults to backend/logs or custom LOG_DIR env variable
const BASE_LOG_DIR =
    process.env.LOG_DIR || path.resolve(__dirname, "..", "logs");

// Store original console methods
const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug ? console.debug.bind(console) : console.log.bind(console),
};

/**
 * Returns formatted date components based on a Date object.
 * @param {Date} date
 */
function getDateParts(date = new Date()) {
    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

    return {
        year,
        month,
        day,
        dateString: `${year}-${month}-${day}`,
        timeString: `${hours}:${minutes}:${seconds}.${milliseconds}`,
        fullTimestamp: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`,
    };
}

/**
 * Returns the destination log file path for the given date.
 * E.g., logs/2026/08/24.log
 * @param {Date} date
 */
function getLogFilePath(date = new Date()) {
    const { year, month, day } = getDateParts(date);
    const directory = path.join(BASE_LOG_DIR, year, month);
    const filePath = path.join(directory, `${day}.log`);
    return { directory, filePath };
}

/**
 * Strips ANSI color/control codes for clean plain text log files.
 * @param {string} str
 */
function stripAnsi(str) {
    if (typeof str !== "string") return str;
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

/**
 * Appends a log line to the date-partitioned file (YYYY/MM/DD.log).
 * @param {string} level - Log level (LOG, INFO, WARN, ERROR, DEBUG)
 * @param {Array} args - Arguments passed to console method
 */
function writeToFile(level, args) {
    try {
        const now = new Date();
        const { fullTimestamp } = getDateParts(now);
        const { directory, filePath } = getLogFilePath(now);

        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        const formattedMessage = util.format(...args);
        const cleanMessage = stripAnsi(formattedMessage);
        const logEntry = `[${fullTimestamp}] [${level.toUpperCase().padEnd(5)}] ${cleanMessage}\n`;

        fs.appendFileSync(filePath, logEntry, "utf8");
    } catch (err) {
        originalConsole.error("Failed to write to log file:", err);
    }
}

let isInitialized = false;

/**
 * Initializes the logger to intercept console output and save to YYYY/MM/DD.log.
 */
function initLogger() {
    if (isInitialized) return;
    isInitialized = true;

    console.log = function (...args) {
        writeToFile("LOG", args);
        originalConsole.log(...args);
    };

    console.info = function (...args) {
        writeToFile("INFO", args);
        originalConsole.info(...args);
    };

    console.warn = function (...args) {
        writeToFile("WARN", args);
        originalConsole.warn(...args);
    };

    console.error = function (...args) {
        writeToFile("ERROR", args);
        originalConsole.error(...args);
    };

    console.debug = function (...args) {
        writeToFile("DEBUG", args);
        originalConsole.debug(...args);
    };

    // Capture uncaught exceptions and unhandled rejections
    process.on("uncaughtException", (err) => {
        console.error("Uncaught Exception:", err);
    });

    process.on("unhandledRejection", (reason, promise) => {
        console.error("Unhandled Rejection at:", promise, "reason:", reason);
    });
}

/**
 * Express middleware for logging incoming HTTP requests.
 */
function requestLogger(req, res, next) {
    const start = Date.now();
    const { method, originalUrl, ip } = req;

    res.on("finish", () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        console.log(
            `[HTTP] ${method} ${originalUrl} ${status} - ${duration}ms (IP: ${ip || req.socket.remoteAddress})`
        );
    });

    next();
}

module.exports = {
    initLogger,
    requestLogger,
    getLogFilePath,
    BASE_LOG_DIR,
    originalConsole,
    log: (...args) => console.log(...args),
    info: (...args) => console.info(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
    debug: (...args) => console.debug(...args),
};
