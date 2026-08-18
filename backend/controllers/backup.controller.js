const path = require("path");
const fs = require("fs");
const { backupDatabase, restoreDatabase, BACKUP_DIR } = require("../backup");
const ApiErrorResponce = require("../utils/ApiErrorResponce");
const ApiResponse = require("../utils/ApiResponse");
const pool = require("../utils/dbConnect");
const bcrypt = require("bcrypt");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const { decryptFile } = require("../utils/encryption");



async function createManualBackup(req, res) {
    try {
        const backup = await backupDatabase(true);
        res.status(200).json(
            new ApiResponse(200, backup, "Backup created successfully")
        );
    } catch (error) {
        console.log(error);

        res.status(500).json(
            new ApiErrorResponce(
                500,
                {},
                error.message || "Internal server error"
            )
        );
    }
}

const getBackupList = async (req, res) => {
    const tenantId = req.user.tenantId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.size) || 8;
    const offset = (page - 1) * limit;

    try {
        // Get total count and size
        const [[{ total, totalSize }]] = await pool.query(
            `SELECT COUNT(*) AS total, COALESCE(SUM(file_size), 0) AS totalSize FROM backup_log_${tenantId}`
        );

        // Get location-based statistics
        const [statsRows] = await pool.query(
            `SELECT location, COUNT(*) AS count, COALESCE(SUM(file_size), 0) AS size FROM backup_log_${tenantId} GROUP BY location`
        );

        let totalItemsLocal = 0;
        let totalItemsNetwork = 0;
        let totalSizeLocal = 0;
        let totalSizeNetwork = 0;

        for (const row of statsRows) {
            if (row.location === "local") {
                totalItemsLocal = row.count;
                totalSizeLocal = row.size;
            } else if (
                row.location === "server" ||
                row.location === "network"
            ) {
                totalItemsNetwork = row.count;
                totalSizeNetwork = row.size;
            }
        }

        const [rows] = await pool.query(
            `SELECT file_name AS filename, file_size AS size, location, created_at AS date FROM backup_log_${tenantId} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        return res.status(200).json({
            success: true,
            backups: rows,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalItems: total,
            totalSize: totalSize,
            totalItemsLocal,
            totalItemsNetwork,
            totalSizeLocal,
            totalSizeNetwork,
        });
    } catch (error) {
        console.error("Error reading backups:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve backup logs",
            error: error.message,
        });
    }
};

const deleteLocalBackupRange = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Start date and end date are required",
            });
        }

        const start = `${startDate} 00:00:00`;
        const end = `${endDate} 23:59:59`;

        // Get local backups in the date range
        const [rows] = await pool.query(
            `SELECT file_name FROM backup_log_${tenantId} WHERE location = 'local' AND created_at BETWEEN ? AND ?`,
            [start, end]
        );

        // Unlink files from local storage
        for (const row of rows) {
            const filePath = path.join(BACKUP_DIR, row.file_name);
            if (fs.existsSync(filePath)) {
                try {
                    await fs.promises.unlink(filePath);
                } catch (err) {
                    console.error(
                        `Error deleting file ${row.file_name}:`,
                        err.message
                    );
                }
            }
        }

        // Delete database records
        const [result] = await pool.query(
            `DELETE FROM backup_log_${tenantId} WHERE location = 'local' AND created_at BETWEEN ? AND ?`,
            [start, end]
        );

        return res.status(200).json({
            success: true,
            message: `Deleted ${result.affectedRows} local backups successfully`,
            deletedCount: result.affectedRows,
        });
    } catch (error) {
        console.error("Error deleting local backup range:", error);
        return res.status(500).json({
            success: false,
            message: "Delete failed",
            error: error.message,
        });
    }
};

async function downloadBackupFile(req, res) {
    try {
        const { filename } = req.params;
        const filePath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return res
                .status(404)
                .json(new ApiErrorResponce(404, {}, "Backup file not found"));
        }

        return res.download(filePath, filename);
    } catch (error) {
        console.error("Download backup file error:", error);
        return res
            .status(500)
            .json(
                new ApiErrorResponce(500, {}, "Failed to download backup file")
            );
    }
}

async function deleteBackupFile(req, res) {
    try {
        const tenantId = req.user.tenantId;
        const { filename } = req.params;
        const filePath = path.join(BACKUP_DIR, filename);

        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }

        // Delete database record
        await pool.query(
            `DELETE FROM backup_log_${tenantId} WHERE file_name = ?`,
            [filename]
        );

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Backup file deleted successfully"));
    } catch (error) {
        console.error("Delete backup file error:", error);
        return res
            .status(500)
            .json(
                new ApiErrorResponce(500, {}, "Failed to delete backup file")
            );
    }
}

async function restoreBackup(req, res) {
    const { password } = req.body;
    const tenantId = req.user.tenantId;

    if (!req.file || !password) {
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {}
        }
        return res
            .status(400)
            .json(
                new ApiErrorResponce(
                    400,
                    {},
                    "Backup file and password are required"
                )
            );
    }

    const amsFilePath = req.file.path;

    try {
        const userTable = `users_${tenantId}`;
        const [rows] = await pool.query(
            `SELECT password FROM ${userTable} WHERE id = ?`,
            [req.user.id]
        );
        if (rows.length === 0) {
            return res
                .status(404)
                .json(new ApiErrorResponce(404, {}, "User not found"));
        }

        const isMatch = await bcrypt.compare(password, rows[0].password);
        if (!isMatch) {
            return res
                .status(401)
                .json(new ApiErrorResponce(401, {}, "Incorrect password"));
        }

        await restoreDatabase(amsFilePath);

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Database restored successfully"));
    } catch (error) {
        console.error("Restore backup error:", error);
        return res
            .status(500)
            .json(
                new ApiErrorResponce(
                    500,
                    {},
                    error.message || "Failed to restore backup"
                )
            );
    } finally {
        if (fs.existsSync(amsFilePath)) {
            try {
                fs.unlinkSync(amsFilePath);
            } catch (err) {}
        }
    }
}

module.exports = {
    createManualBackup,
    getBackupList,
    deleteLocalBackupRange,
    downloadBackupFile,
    deleteBackupFile,
    restoreBackup,
};
