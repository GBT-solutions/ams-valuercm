const { sendMail } = require("../utils/sendMail.js");
const pool = require("../utils/dbConnect");
const ejs = require("ejs");
const path = require("path");

const templateDir =
    (process.env.NODE_ENV || "development") == "production"
        ? path.join(__dirname, "templates")
        : path.join(__dirname, "..", "templates");

function changeDateFormat(date) {
    const d = new Date(date);
    const m = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];
    const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];
    const day = days[d.getDay()];
    const month = m[d.getMonth()];
    const year = d.getFullYear();
    const dat = (d.getDate() + "").padStart(2, "0");
    return `${day}, ${dat} ${month}, ${year}`;
}

const checkExpDate = async () => {
    try {
        let daysBefore = 3,
            expEmails = "",
            expText = "";
        const [details] = await pool.query(
            `SELECT config_key,value FROM config_a1b2c3d4 WHERE config_key = 'exp_days' OR config_key = 'exp_emails' OR config_key = 'exp_text'`
        );
        for (let i = 0; i < details.length; i++) {
            if (details[i].config_key == "exp_emails") {
                expEmails = details[i].value;
            }
            if (details[i].config_key == "exp_days") {
                daysBefore = details[i].value;
            }
            if (details[i].config_key === "exp_text") {
                expText = details[i].value;
            }
        }

        const [assets] = await pool.query(
            `SELECT * FROM assets_a1b2c3d4 
                WHERE exp_date BETWEEN CURDATE() AND CURDATE() + INTERVAL ? DAY;`,
            [daysBefore]
        );
        if (assets.length == 0) return;
        for (let i = 0; i < assets.length; i++) {
            assets[i].expiery_date = changeDateFormat(assets[i].exp_date);
        }
        const template = path.join(templateDir, "exp.ejs");
        const html = await ejs.renderFile(template, { rows: assets, expText });

        if (expEmails) {
            const result = await sendMail(
                expEmails,
                "List of Exp assets",
                html
            );
            console.log("Asset expiry notification mail sent");
        }
    } catch (error) {
        console.log(error);
    }
};
const checkSubmissionDate = async () => {
    try {
        let daysBefore = 3,
            subEmails = "";
        submissionText = "";

        // Fetch config values for submission notifications
        const [details] =
            await pool.query(`SELECT config_key,value FROM config_a1b2c3d4 WHERE config_key = 'submission_days' 
            OR config_key = 'submission_emails' OR config_key = 'submission_text'
        `);

        for (let i = 0; i < details.length; i++) {
            if (details[i].config_key === "submission_emails") {
                subEmails = details[i].value;
            }
            if (details[i].config_key === "submission_days") {
                daysBefore = details[i].value;
            }
            if (details[i].config_key === "submission_text") {
                submissionText = details[i].value;
            }
        }

        // Fetch assets submitted within the given days
        const [assets] = await pool.query(
            `SELECT 
                t.assigned_at, 
                t.assigned_submission,
                a.asset_id, 
                a.serial,
                a.model_no,
                e.emp_code,
                e.name
            FROM 
                taggings_a1b2c3d4 t
            INNER JOIN 
                assets_a1b2c3d4 a ON t.asset_id = a.id
            INNER JOIN 
                employees_a1b2c3d4 e ON t.employee_id = e.id
            WHERE
                t.assigned_submission IS NOT NULL AND
                t.assigned_submission BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY);`,
            [daysBefore]
        );

        if (assets.length === 0) return;

        // Format submission date for email display
        for (let i = 0; i < assets.length; i++) {
            assets[i].submission_date = changeDateFormat(
                assets[i].assigned_submission
            );
        }

        // Load submission email template
        const template = path.join(templateDir, "submit.ejs");
        const html = await ejs.renderFile(template, {
            rows: assets,
            submissionText,
        });
        // const fs = require("fs");

        // Send email if recipients are configured
        if (subEmails) {
            const result = await sendMail(
                subEmails,
                "List of Submitted Assets",
                html
            );
            console.log("Asset submission notification mail sent");
        }
    } catch (error) {
        console.log(error);
    }
};

const sendBackupFailedMail = async (errorReason = "") => {
    try {
        const [details] = await pool.query(
            `SELECT config_key,value FROM config_a1b2c3d4 WHERE config_key = 'backup_fail_email' OR config_key = 'backup_fail_text'`
        );

        const configMap = details.reduce((acc, item) => {
            acc[item.config_key] = item.value;
            return acc;
        }, {});

        const recipientEmail = configMap["backup_fail_email"];
        let backupFailedText = configMap["backup_fail_text"] || "Backup failed.";

        if (errorReason) {
            backupFailedText += ` (Reason: ${errorReason})`;
        }

        // Render EJS template
        const template = path.join(templateDir, "backupFailed.ejs");
        const data = {
            failureTime: changeDateFormat(new Date()),
            backupFailedText,
        };
        const html = await ejs.renderFile(template, data);
        if (recipientEmail) {
            const result = await sendMail(
                recipientEmail,
                `Backup Failed - ${data.failureTime}`,
                html
            );
            console.log("Backup failed notification mail sent");
        }
    } catch (err) {
        console.error("Error sending backup failed mail:", err);
    }
};

const sendRunningMail = async () => {
    try {
        let runningEmails = "";
        let lastBackup = "Never";
        let dbStatus = "running";

        try {
            const [details] = await pool.query(
                `SELECT config_key,value FROM config_a1b2c3d4 WHERE config_key = 'running_emails' OR config_key = 'last_backup'`
            );
            for (let i = 0; i < details.length; i++) {
                if (details[i].config_key === "running_emails") {
                    runningEmails = details[i].value;
                }
                if (details[i].config_key === "last_backup") {
                    lastBackup = details[i].value;
                }
            }
        } catch (dbError) {
            dbStatus = "stopped";
            console.error("Database status check failed:", dbError.message);
        }

        let lastBackupFormatted = "Never";
        if (lastBackup && lastBackup !== "Never" && lastBackup !== "N/A") {
            try {
                const backupDateObj = new Date(lastBackup.replace(" ", "T"));
                if (!isNaN(backupDateObj.getTime())) {
                    const formattedDate = changeDateFormat(backupDateObj);
                    const hours = String(backupDateObj.getHours()).padStart(
                        2,
                        "0"
                    );
                    const minutes = String(backupDateObj.getMinutes()).padStart(
                        2,
                        "0"
                    );
                    const seconds = String(backupDateObj.getSeconds()).padStart(
                        2,
                        "0"
                    );
                    lastBackupFormatted = `${formattedDate} ${hours}:${minutes}:${seconds}`;
                } else {
                    lastBackupFormatted = lastBackup;
                }
            } catch (e) {
                lastBackupFormatted = lastBackup;
            }
        }

        const template = path.join(templateDir, "servicesStatus.ejs");
        const data = {
            services: [
                {
                    name: "API",
                    status: "running",
                },
                {
                    name: "Database",
                    status: dbStatus,
                },
                {
                    name: "Backup",
                    status: dbStatus,
                },
            ],
            reportTime: changeDateFormat(new Date()),
            runningTime: changeDateFormat(new Date()),
            lastBackup: lastBackupFormatted,
        };
        const html = await ejs.renderFile(template, data);

        if (runningEmails) {
            const result = await sendMail(
                runningEmails,
                `Running - ${data.runningTime}`,
                html
            );
            console.log("Running notification mail sent");
        }
    } catch (err) {
        console.error("Error sending running mail:", err);
    }
};

module.exports = {
    checkExpDate,
    checkSubmissionDate,
    sendBackupFailedMail,
    sendRunningMail,
};
