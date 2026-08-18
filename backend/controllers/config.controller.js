const ApiErrorResponce = require("../utils/ApiErrorResponce");
const ApiResponse = require("../utils/ApiResponse");
const pool = require("../utils//dbConnect");
const { initScheduler } = require("../utils/scheduler");

async function updateConfig(req, res) {
    const keys = [
        "exp_days",
        "exp_emails",
        "submission_days",
        "submission_emails",
        "backup_fail_email",
        "exp_text",
        "submission_text",
        "backup_fail_text",
        "running_emails",
        "user",
        "password",
        "shared_folder",
        "backup_ip",
        "backup_schedule",
        "status_report_schedule",
        "backup_retry_count",
        "backup_retry_interval",
    ];

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        for (const key of keys) {
            if (req.body[key] !== undefined) {
                const value = String(req.body[key]);
                const [rows] = await connection.query(
                    `SELECT id FROM config_a1b2c3d4 WHERE config_key = ?`,
                    [key]
                );
                if (rows.length > 0) {
                    await connection.query(
                        `UPDATE config_a1b2c3d4 SET value = ? WHERE config_key = ?`,
                        [value, key]
                    );
                } else {
                    await connection.query(
                        `INSERT INTO config_a1b2c3d4 (config_key, value) VALUES (?, ?)`,
                        [key, value]
                    );
                }
            }
        }

        await connection.commit();
        connection.release();

        // Reload scheduler tasks with updated configuration
        initScheduler().catch((err) => console.error("Error reloading scheduler:", err));

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Config updated successfully"));
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.log(error);
        return res
            .status(500)
            .json(new ApiErrorResponce(500, {}, "Internal server error"));
    }
}

async function getConfig(req, res) {
    try {
        const [rows] = await pool.query(`SELECT * FROM config_a1b2c3d4`);
        const data = {};
        rows.forEach((row) => {
            data[row.config_key] = row.value;
        });
        return res
            .status(200)
            .json(new ApiResponse(200, data, "Config fetched successfully"));
    } catch (error) {
        console.log(error);
        res.status(500).json(
            new ApiErrorResponce(500, {}, "Internal server error")
        );
    }
}

async function getLastBackup(req, res) {
    try {
        const [rows] = await pool.query(
            `SELECT \`value\` FROM config_a1b2c3d4 WHERE config_key = 'last_backup'`
        );
        if (rows.length > 0) {
            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200,
                        { lastBackup: rows[0].value },
                        "Last backup fetched successfully"
                    )
                );
        } else {
            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200,
                        { lastBackup: null },
                        "Last backup not found"
                    )
                );
        }
    } catch (error) {
        console.log(error);
        return res
            .status(500)
            .json(new ApiErrorResponce(500, {}, "Internal server error"));
    }
}

module.exports = {
    updateConfig,
    getConfig,
    getLastBackup,
};
