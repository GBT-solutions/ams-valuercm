const fs = require("fs-extra");
const path = require("path");
const { sendBackupFailedMail } = require("./controllers/mail.controller");
require("dotenv").config();
const { initLogger } = require("./utils/logger");
initLogger();
const { exec, fork } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const pool = require("./utils/dbConnect");
const { getSqlDate } = require("./utils/helperFunctions");
const { encryptFile, decryptFile } = require("./utils/encryption");
const BACKUP_DIR = path.join(__dirname, "backups");

const cleanErrorReason = (message) => {
    if (!message) return "";
    let clean = message.replace(/System error \d+ has occurred\.?/gi, "");
    clean = clean.replace(/Command failed:[\s\S]*?(?=\r?\n|$)/gi, "");
    clean = clean.replace(/code:\s*\d+/gi, "");
    return clean.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
};

const getTimeStamp = () => {
    const date = new Date();
    const year = (date.getFullYear() % 100).toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${day}${month}${year}${hours}${minutes}${seconds}`;
};

async function backupDatabaseLocally() {
    await fs.ensureDir(BACKUP_DIR);
    const mysqldumpPath =
        '"C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe"';

    const timestamp = getTimeStamp();
    const sqlFileName = `backup_${process.env.DB_NAME}_${timestamp}.sql`;
    const sqlOutputPath = path.join(BACKUP_DIR, sqlFileName);

    const cmd = `${mysqldumpPath} -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} > "${sqlOutputPath}"`;
    try {
        const { stderr } = await execPromise(cmd);
        if (stderr) {
            // console.warn("MySQL Warning/Notes:", stderr);
        }

        const amsFileName = `backup_${process.env.DB_NAME}_${timestamp}.ams`;
        const amsOutputPath = path.join(BACKUP_DIR, amsFileName);

        // Encrypt the SQL file to .ams
        await encryptFile(sqlOutputPath, amsOutputPath);

        // Delete the original SQL file
        if (fs.existsSync(sqlOutputPath)) {
            fs.unlinkSync(sqlOutputPath);
        }

        const stats = fs.statSync(amsOutputPath);
        const fileSize = parseFloat((stats.size / 1024).toFixed(2));

        return { fileName: amsFileName, fileSize, outputPath: amsOutputPath };
    } catch (error) {
        if (fs.existsSync(sqlOutputPath)) {
            try {
                fs.unlinkSync(sqlOutputPath);
            } catch (err) {}
        }
        const detail = cleanErrorReason(
            error.stderr ? error.stderr.trim() : error.message || String(error)
        );
        throw new Error(`Failed to backup data locally: ${detail}`);
    }
}

async function clearNetworkConnections(finalIp, networkPath) {
    const targets = [
        networkPath,
        `\\\\${finalIp}`,
        `\\\\${finalIp}\\IPC$`,
        `\\\\${finalIp}\\C$`,
        `\\\\${finalIp}\\admin$`,
    ];

    for (const target of targets) {
        try {
            await execPromise(`net use "${target}" /delete /y`);
        } catch (err) {}
    }

    // Inspect active 'net use' entries to delete any mapped drive letters or UNC paths targeting finalIp
    try {
        const { stdout } = await execPromise("net use");
        if (stdout) {
            const lines = stdout.split(/\r?\n/);
            for (const line of lines) {
                if (line.toLowerCase().includes(finalIp.toLowerCase())) {
                    const match = line.match(/([A-Z]:|\\\\[\w.-]+\\[^\s]+)/i);
                    if (match && match[1]) {
                        try {
                            await execPromise(
                                `net use "${match[1]}" /delete /y`
                            );
                        } catch (err) {}
                    }
                }
            }
        }
    } catch (err) {}
}

async function backupToNetwork(outputPath) {
    const query = `SELECT \`config_key\`, \`value\` FROM config_a1b2c3d4 WHERE \`config_key\`='user' OR \`config_key\`='password' OR \`config_key\`='shared_folder' OR \`config_key\`='backup_ip'`;

    let [result] = await pool.query(query);

    result = result.reduce((acc, item) => {
        acc[item.config_key] = item.value;
        return acc;
    }, {});

    const {
        user,
        password,
        shared_folder: sharedFolder,
        backup_ip: backupIp,
    } = result;

    if (!user || !password || !sharedFolder || !backupIp) {
        throw new Error("Network configuration is incomplete");
    }

    const finalIp = backupIp;
    const finalFolder = sharedFolder;
    const networkPath = `\\\\${finalIp}\\${finalFolder}`;
    const fileName = path.basename(outputPath);

    try {
        // Purge all existing connections to the target server PC before attempting authentication
        await clearNetworkConnections(finalIp, networkPath);

        // Authenticate & connect
        await execPromise(
            `net use "${networkPath}" /user:"${user}" "${password}"`
        );
        await execPromise(`copy "${outputPath}" "${networkPath}\\${fileName}"`);

        // Server upload succeeded, delete local copy
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
    } catch (error) {
        console.log(error);
        const detail = cleanErrorReason(
            error.stderr ? error.stderr.trim() : error.message || String(error)
        );
        throw new Error(`Failed to backup data to network: ${detail}`);
    } finally {
        // Always disconnect/clean up network connections after attempt completes
        await clearNetworkConnections(finalIp, networkPath);
    }
}

async function updateLastBackupDate(fileName, fileSize, location) {
    const tableName = `config_a1b2c3d4`;
    const logTable = `backup_log_a1b2c3d4`;
    try {
        const timestamp = getSqlDate();
        const res = await pool.query(
            `SELECT * FROM ${tableName} WHERE config_key = 'last_backup'`
        );
        if (res.length === 0) {
            await pool.query(
                `INSERT INTO ${tableName} (config_key, \`value\`) VALUES ('last_backup', ?)`,
                [timestamp]
            );
        } else {
            await pool.query(
                `UPDATE ${tableName} SET \`value\` = ? WHERE config_key = 'last_backup'`,
                [timestamp]
            );
        }

        if (fileName && fileSize && location) {
            await pool.query(
                `INSERT INTO ${logTable} (file_name, file_size, location, created_at) VALUES (?, ?, ?, ?)`,
                [fileName, fileSize, location, timestamp]
            );
        }
        return timestamp;
    } catch (error) {
        console.error("Error updating last backup date:", error);
        return false;
    }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getBackupRetrySettings() {
    try {
        const query = `SELECT \`config_key\`, \`value\` FROM config_a1b2c3d4 WHERE \`config_key\`='backup_retry_count' OR \`config_key\`='backup_retry_interval'`;
        const [rows] = await pool.query(query);
        let retryCount = 10;
        let retryInterval = 2;
        rows.forEach((row) => {
            if (row.config_key === "backup_retry_count") {
                const parsed = parseInt(row.value, 10);
                if (!isNaN(parsed) && parsed > 0) retryCount = parsed;
            } else if (row.config_key === "backup_retry_interval") {
                const parsed = parseFloat(row.value);
                if (!isNaN(parsed) && parsed >= 0) retryInterval = parsed;
            }
        });
        return { retryCount, retryInterval };
    } catch (error) {
        console.error("Error fetching backup retry settings:", error);
        return { retryCount: 10, retryInterval: 2 };
    }
}

async function runBackupTask(fromApi = false) {
    if (fromApi) {
        let localbackup;
        let location = "local";
        let backupError = null;

        try {
            localbackup = await backupDatabaseLocally();
        } catch (error) {
            let errorReason = error.message || "Failed to backup data locally";
            throw new Error(errorReason);
        }

        try {
            await backupToNetwork(localbackup.outputPath);
            location = "server";
        } catch (error) {
            backupError = error;
        }

        const lastBackup = await updateLastBackupDate(
            localbackup.fileName,
            localbackup.fileSize,
            location
        );

        if (backupError) {
            let errorReason =
                backupError.message || "Failed to backup data to network";
            throw new Error(errorReason);
        }

        return { lastBackup };
    }

    // Task scheduler execution with retry logic
    const { retryCount, retryInterval } = await getBackupRetrySettings();
    const retryIntervalMs = retryInterval * 60 * 1000;

    let localbackup = null;
    let location = "local";
    let lastError = null;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
        lastError = null;

        // Step 1: Create local backup if not already created
        if (!localbackup) {
            try {
                localbackup = await backupDatabaseLocally();
            } catch (error) {
                lastError = error;
            }
        }

        // Step 2: If local backup exists, attempt to upload to network server
        if (localbackup) {
            try {
                await backupToNetwork(localbackup.outputPath);
                location = "server";
                lastError = null;
            } catch (error) {
                lastError = error;
            }
        }

        // Step 3: Check if upload succeeded
        if (location === "server") {
            console.log(
                `Backup upload succeeded on attempt ${attempt}/${retryCount}`
            );
            const lastBackup = await updateLastBackupDate(
                localbackup.fileName,
                localbackup.fileSize,
                location
            );
            return { lastBackup };
        }

        // Step 4: If failed, log and check if retries remain
        const errMsg = lastError
            ? lastError.message || String(lastError)
            : "Unknown backup error";
        console.warn(
            `Backup attempt ${attempt}/${retryCount} failed: ${errMsg}`
        );

        if (attempt < retryCount) {
            console.log(
                `Waiting ${retryInterval} minute(s) before retry attempt ${attempt + 1}...`
            );
            await sleep(retryIntervalMs);
        }
    }

    // If all retry attempts failed
    if (localbackup) {
        await updateLastBackupDate(
            localbackup.fileName,
            localbackup.fileSize,
            "local"
        );
    }

    let finalErrorReason = lastError
        ? lastError.message || String(lastError)
        : `Failed to backup data after ${retryCount} attempts`;

    try {
        await sendBackupFailedMail(finalErrorReason);
    } catch (err) {
        console.error("Error sending backup failed mail:", err);
    }

    return;
}

async function runRestoreTask(amsFilePath) {
    const tempSqlPath = path.join(
        path.dirname(amsFilePath),
        `temp_restore_${Date.now()}.sql`
    );

    try {
        await decryptFile(amsFilePath, tempSqlPath);

        const mysqlPath =
            '"C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe"';
        const cmd = `${mysqlPath} -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} < "${tempSqlPath}"`;

        await execPromise(cmd);
        return { restored: true };
    } catch (error) {
        const detail = cleanErrorReason(
            error.stderr ? error.stderr.trim() : error.message || String(error)
        );
        throw new Error(`Failed to restore backup: ${detail}`);
    } finally {
        if (fs.existsSync(tempSqlPath)) {
            try {
                fs.unlinkSync(tempSqlPath);
            } catch (err) {}
        }
    }
}

function forkWorkerTask(action, payload = {}) {
    return new Promise((resolve, reject) => {
        let isResolved = false;
        const child = fork(__filename, ["--child-task"], {
            stdio: ["inherit", "inherit", "inherit", "ipc"],
        });

        child.on("message", (msg) => {
            isResolved = true;
            if (msg.success) {
                resolve(msg.result);
            } else {
                reject(new Error(msg.error || "Child process task failed"));
            }
        });

        child.on("error", (err) => {
            if (!isResolved) {
                isResolved = true;
                reject(err);
            }
        });

        child.on("exit", (code) => {
            if (!isResolved) {
                isResolved = true;
                if (code !== 0) {
                    reject(
                        new Error(
                            `Backup worker process exited with code ${code}`
                        )
                    );
                } else {
                    resolve({});
                }
            }
        });

        child.send({ action, ...payload });
    });
}

async function backupDatabase(fromApi = false) {
    return await forkWorkerTask("backup", { fromApi });
}

async function restoreDatabase(amsFilePath) {
    return await forkWorkerTask("restore", { amsFilePath });
}

if (process.argv.includes("--child-task")) {
    process.on("message", async (msg) => {
        try {
            if (msg.action === "backup") {
                const result = await runBackupTask(msg.fromApi);
                if (process.send) process.send({ success: true, result });
            } else if (msg.action === "restore") {
                const result = await runRestoreTask(msg.amsFilePath);
                if (process.send) process.send({ success: true, result });
            } else {
                if (process.send)
                    process.send({ success: false, error: "Unknown action" });
            }
        } catch (error) {
            if (process.send) {
                process.send({
                    success: false,
                    error: error.message || String(error),
                });
            }
        } finally {
            try {
                await pool.end();
            } catch (e) {}
            process.exit(0);
        }
    });
}

if (require.main === module && !process.argv.includes("--child-task")) {
    backupDatabase()
        .then((res) => {
            console.log("Backup process finished successfully:", res);
        })
        .catch((err) => {
            console.error("Backup process failed:", err);
            process.exit(1);
        });
}

module.exports = { backupDatabase, restoreDatabase, BACKUP_DIR };
