const cron = require("node-cron");
const {
    checkExpDate,
    checkSubmissionDate,
    sendRunningMail,
} = require("../controllers/mail.controller");
const { backupDatabase } = require("../backup");
const pool = require("./dbConnect");

let backupTasks = [];
let runningMailTasks = [];

const timeToCron = (timeStr, defaultCron) => {
    if (!timeStr) return defaultCron;
    const parts = timeStr.trim().split(/\s+/);
    if (parts.length === 5) {
        return timeStr.trim();
    }
    const timeMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
        const hour = parseInt(timeMatch[1], 10);
        const minute = parseInt(timeMatch[2], 10);
        return `0 ${minute} ${hour} * * *`;
    }
    return defaultCron;
};

const parseConfigSchedule = (dbValue, defaultTimes = ["06:00"]) => {
    if (!dbValue) {
        return defaultTimes.map((t) => timeToCron(t));
    }
    const trimmed = dbValue.trim();
    if (trimmed.split(/\s+/).length === 5) {
        return [trimmed];
    }
    return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
        .map((t) => timeToCron(t));
};

const initScheduler = async () => {
    try {
        backupTasks.forEach((task) => task.stop());
        backupTasks = [];

        runningMailTasks.forEach((task) => task.stop());
        runningMailTasks = [];

        const [rows] = await pool.query(
            `SELECT config_key, value FROM config_a1b2c3d4 WHERE config_key = 'backup_schedule' OR config_key = 'status_report_schedule'`
        );

        const config = rows.reduce((acc, row) => {
            acc[row.config_key] = row.value;
            return acc;
        }, {});

        const backupCronPatterns = parseConfigSchedule(
            config["backup_schedule"],
            ["06:00", "18:00"]
        );
        const statusReportCronPatterns = parseConfigSchedule(
            config["status_report_schedule"],
            ["05:00"]
        );

        backupCronPatterns.forEach((pattern) => {
            if (cron.validate(pattern)) {
                const task = cron.schedule(
                    pattern,
                    () => {
                        checkExpDate();
                        checkSubmissionDate();
                        backupDatabase();
                    },
                    {
                        timezone: "Asia/Kolkata",
                    }
                );
                backupTasks.push(task);
            } else {
                console.error(`Invalid backup cron pattern: "${pattern}"`);
            }
        });

        statusReportCronPatterns.forEach((pattern) => {
            if (cron.validate(pattern)) {
                const task = cron.schedule(
                    pattern,
                    () => {
                        sendRunningMail();
                    },
                    {
                        timezone: "Asia/Kolkata",
                    }
                );
                runningMailTasks.push(task);
            } else {
                console.error(
                    `Invalid status report cron pattern: "${pattern}"`
                );
            }
        });
    } catch (error) {
        console.error("Failed to initialize scheduler:", error);
    }
};

module.exports = { initScheduler };
