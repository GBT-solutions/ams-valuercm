const path = require("path");
const fs = require("fs");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");
const crypto = require("crypto");
const ejs = require("ejs");

const pool = require("../utils/dbConnect");
const ApiErrorResponce = require("../utils/ApiErrorResponce");
const ApiResponse = require("../utils/ApiResponse");
const {
    validateEmail,
    validateContact,
    validateUsername,
    formatDate,
    getISTString,
    isStrongPassword,
    getSqlDate,
} = require("../utils/helperFunctions");
const { cleanupFile } = require("../utils/csvUpload");
const { format } = require("@fast-csv/format");
const { sendMail } = require("../utils/sendMail.js");

const cookieOptions = {
    httpOnly: true,
    secure: true,
    expire: Date.now() + 1000 * 60 * 60 * process.env.COOKIE_EXPIRE, // 8 hours
    path: "/",
    sameSite: true,
};

const env = process.env.NODE_ENV || "development";

const templateDir =
    env === "production"
        ? path.join(__dirname, "templates")
        : path.join(__dirname, "..", "templates");

async function signUp(req, res) {
    const { name, username, password, role, tenantId, email, contact } =
        req.body;

    if (!name || !contact || !password || !role || !tenantId || !username) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "All fields are required"));
    }

    if (!validateEmail(email)) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Invalid email format"));
    }

    if (!validateContact(contact)) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Invalid contact format"));
    }

    if (!validateUsername(username)) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Invalid username format"));
    }

    const userTable = `users_${tenantId}`;

    try {
        const [existingUsers] = await pool.query(
            `SELECT id FROM ${userTable} WHERE display_username = ? OR email = ?`,
            [username.toLowerCase(), email]
        );

        if (existingUsers.length > 0) {
            return res
                .status(409)
                .json(
                    new ApiErrorResponce(
                        409,
                        {},
                        "Username or email already exists"
                    )
                );
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({
                message:
                    "Weak password. Must include uppercase, lowercase, number, special char, and be at least 8 chars long.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [lastUser] = await pool.query(
            `SELECT id FROM ${userTable} ORDER BY id DESC LIMIT 1`
        );
        const nextId = lastUser.length > 0 ? lastUser[0].id + 1 : 1;
        const internalUsername = `user_${nextId}`;

        const insertQuery = `
            INSERT INTO ${userTable}
                (name, display_username, username, password, role, email, contact)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(insertQuery, [
            name,
            username.toLowerCase(),
            internalUsername,
            hashedPassword,
            role,
            email,
            contact,
        ]);

        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    id: result.insertId,
                    username: username.toLowerCase(),
                    role,
                    tenantId,
                },
                "User created successfully"
            )
        );
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res
                .status(409)
                .json(
                    new ApiErrorResponce(
                        409,
                        {},
                        "Username or email already exists"
                    )
                );
        }

        return res
            .status(500)
            .json(
                new ApiErrorResponce(
                    500,
                    {},
                    error.message || "Internal server error"
                )
            );
    }
}

async function signIn(req, res) {
    const { username, password, tenantId } = req.body;

    if (!username || !password || !tenantId) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "All fields are required"));
    }

    const userTable = `users_${tenantId}`;
    const query = `SELECT * FROM ${userTable} WHERE display_username = ?`;
    try {
        const [rows] = await pool.query(query, [username.toLowerCase()]);
        if (rows.length === 0) {
            return res
                .status(404)
                .json(new ApiErrorResponce(404, {}, "Invalid credentials"));
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res
                .status(401)
                .json(new ApiErrorResponce(401, {}, "Invalid credentials"));
        }

        const sessionId = uuid().replace(/-/g, "");
        const updateQuery = `UPDATE ${userTable} SET seasson_id = ? WHERE id = ?`;
        await pool.query(updateQuery, [sessionId, user.id]);

        const token = jwt.sign(
            { id: user.id, tenantId, sessionId },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRE || "8h",
            }
        );

        const { password: _, seasson_id: __, ...userSafe } = user;
        userSafe.token = token;

        return res
            .status(200)
            .cookie("token", token, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    { user: userSafe },
                    "User signed in successfully"
                )
            );
    } catch (error) {
        return res
            .status(500)
            .json(
                new ApiErrorResponce(
                    500,
                    {},
                    error.message || "Internal server error"
                )
            );
    }
}

function signOut(req, res) {
    return res
        .clearCookie("token", cookieOptions)
        .status(200)
        .json(new ApiResponse(200, {}, "User signed out successfully"));
}

async function getUsers(req, res) {
    const { tenantId } = req.user;

    if (!tenantId) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Tenant ID is required"));
    }

    // Destructure query with defaults
    const { size = 5, page = 1 } = req.query;
    const pageSize = parseInt(size);
    const currentPage = parseInt(page);
    const offset = (currentPage - 1) * pageSize;
    const userTable = `users_${tenantId}`;

    try {
        // Step 1: Count total
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM ${userTable}`
        );

        if (total === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        items: [],
                        totalItems: 0,
                        totalPages: 0,
                        currentPage: 0,
                        pageSize,
                    },
                    "No users found"
                )
            );
        }

        // Step 2: Fetch paginated users
        const [rows] = await pool.query(
            `SELECT * FROM ${userTable} LIMIT ? OFFSET ?`,
            [pageSize, offset]
        );

        const users = rows.map((user) => {
            const {
                password,
                seasson_id,
                display_username,
                username, // assuming internal use
                ...rest
            } = user;

            return {
                ...rest,
                username: display_username?.toLowerCase() || "",
            };
        });

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    items: users,
                    totalItems: total,
                    totalPages: Math.ceil(total / pageSize),
                    currentPage,
                    pageSize,
                },
                "Users retrieved successfully"
            )
        );
    } catch (error) {
        return res
            .status(500)
            .json(
                new ApiErrorResponce(
                    500,
                    {},
                    error.message || "Internal server error"
                )
            );
    }
}

async function updateUser(req, res) {
    const { tenantId } = req.user;
    const { name, username, email, contact, password } = req.body;
    const { id } = req.params;

    try {
        const userTable = `users_${tenantId}`;

        const [rows] = await pool.query(
            `SELECT * FROM ${userTable} WHERE id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res
                .status(404)
                .json(new ApiErrorResponce(404, {}, "User not found"));
        }

        const existingUser = rows[0];

        const updatedFields = {
            name: name ?? existingUser.name,
            display_username:
                username?.toLowerCase() ?? existingUser.display_username,
            email: email?.toLowerCase() ?? existingUser.email,
            contact: contact ?? existingUser.contact,
            password: existingUser.password,
        };

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updatedFields.password = await bcrypt.hash(password, salt);
        }

        const updateQuery = `
            UPDATE ${userTable}
            SET name = ?, display_username = ?, email = ?, contact = ?, password = ?
            WHERE id = ?
        `;
        await pool.query(updateQuery, [
            updatedFields.name,
            updatedFields.display_username,
            updatedFields.email,
            updatedFields.contact,
            updatedFields.password,
            id,
        ]);

        const responseUser = {
            ...updatedFields,
            id,
        };
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { user: responseUser },
                    "User updated successfully"
                )
            );
    } catch (error) {
        return res
            .status(500)
            .json(
                new ApiErrorResponce(
                    500,
                    {},
                    error.message || "Internal server error"
                )
            );
    }
}

async function getDaashboardData(req, res) {
    let tenantId = req?.user?.tenantId;
    if (!tenantId) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Tenant ID is required"));
    }
    const { expiredFrom, expiredTo, upcommingFrom, upcommingTo, selected } =
        req.body;
    try {
        const [totalAsset] = await pool.query(
            `SELECT COUNT(*) AS total from assets_${tenantId} WHERE disposalDate IS NULL ${selected == "all" ? "" : selected == "it" ? "AND asset_type = 'it'" : "AND asset_type = 'admin'"}`
        );
        const total_asset = totalAsset[0].total;
        const [taggedAsset] = await pool.query(
            `SELECT COUNT(t.id) AS total FROM taggings_${tenantId} t
            LEFT JOIN assets_${tenantId} a ON a.id = t.asset_id
            WHERE a.disposalDate IS NULL
            ${selected == "all" ? "" : selected == "it" ? "AND a.asset_type = 'it'" : "AND a.asset_type = 'admin'"}
            `
        );
        const total_tagged = taggedAsset[0].total;
        // const [detaggedAsset] = await pool.query(
        //     `SELECT COUNT(DISTINCT h.asset_id) AS total FROM history_${tenantId} h
        //     LEFT JOIN assets_${tenantId} a ON a.id = h.asset_id
        //     ${selected == "all" ? "" : selected == "it" ? "WHERE a.asset_type = 'it'" : "WHERE a.asset_type = 'admin'"}
        //     `
        // );
        // const total_detagged = detaggedAsset[0].total;
        // const not_assigned = total_asset - (total_tagged + total_detagged);

        const [assetStatusCounts] = await pool.query(`
            SELECT 
                COUNT(CASE WHEN t.asset_id IS NULL AND h.asset_id IS NULL THEN 1 END) as unusedAssets,
                COUNT(DISTINCT CASE WHEN t.asset_id IS NULL AND h.asset_id IS NOT NULL THEN a.id END) as historyOnlyAssets
            FROM assets_${tenantId} a
            LEFT JOIN taggings_${tenantId} t ON a.id = t.asset_id
            LEFT JOIN history_${tenantId} h ON a.id = h.asset_id
            WHERE a.disposalDate IS NULL
            ${selected == "all" ? "" : selected == "it" ? "AND a.asset_type = 'it'" : "AND a.asset_type = 'admin'"}
        `);

        const total_detagged = assetStatusCounts[0].historyOnlyAssets;
        const not_assigned = assetStatusCounts[0].unusedAssets;

        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        d.setSeconds(-1);
        const [upcommingExp] = await pool.query(
            `
                SELECT asset_id,model_no,type,serial,exp_date,asset_code FROM assets_${tenantId} 
                WHERE
                    exp_date IS NOT NULL
                    ${selected == "all" ? "" : selected == "it" ? "AND asset_type = 'it'" : "AND asset_type = 'admin'"}
                    AND exp_date BETWEEN ? AND ?
                ORDER BY exp_date ASC
            `,
            [upcommingFrom, upcommingTo]
        );

        const [upcommingSubmission] = await pool.query(
            `
                SELECT asset_id,model_no,type,serial,exp_date,asset_code FROM assets_${tenantId} 
                    WHERE
                        exp_date IS NOT NULL
                        ${selected == "all" ? "" : selected == "it" ? "AND asset_type = 'it'" : "AND asset_type = 'admin'"}
                        AND exp_date BETWEEN ? AND ?
                    ORDER BY exp_date ASC
            `,
            [expiredFrom, expiredTo]
        );

        let [monthData] = await pool.query(
            `SELECT
                (MONTH(exp_date) - 1) AS month_no,
                COUNT(id) AS total
            FROM assets_${tenantId}
            WHERE exp_date IS NOT NULL
            ${selected == "all" ? "" : selected == "it" ? "AND asset_type = 'it'" : "AND asset_type = 'admin'"}
            AND exp_date > ?
            AND exp_date < DATE_ADD(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY month_no
            ORDER BY month_no`,
            [getISTString(d)]
        );
        const monthNos = new Set();
        for (let i = 0; i < monthData.length; i++) {
            monthNos.add(monthData[i].month_no);
        }

        for (let i = 0; i < 12; i++) {
            if (!monthNos.has(i)) {
                monthData.push({
                    month_no: i,
                    total: 0,
                });
            }
        }

        monthData.sort((a, b) => a.month_no - b.month_no);
        const day = new Date();
        day.setDate(1);
        day.setHours(0, 0, 0, 0);
        day.setSeconds(day.getSeconds() - 1);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [expThisMon] = await pool.query(
            `SELECT COUNT(*) AS total from assets_${tenantId} WHERE (exp_date BETWEEN ? AND ?) ${selected == "all" ? "" : selected == "it" ? "AND asset_type = 'it'" : "AND asset_type = 'admin'"}`,
            [getSqlDate(day), getSqlDate(today)]
        );
        const currentMonth = today.getMonth();
        if (expThisMon[0].total > 0) {
            for (let i = 0; i < monthData.length; i++) {
                if (monthData[i].month_no == currentMonth) {
                    monthData[i].total -= expThisMon[0].total;
                    break;
                }
            }
        }

        const p1 = monthData.slice(0, currentMonth);
        const p2 = monthData.slice(currentMonth, 12);
        monthData = [...p2, ...p1];
        const months = [
            "JAN",
            "FEB",
            "MAR",
            "APR",
            "MAY",
            "JUN",
            "JUL",
            "AUG",
            "SEP",
            "OCT",
            "NOV",
            "DEC",
        ];
        for (let i = 0; i < monthData.length; i++) {
            monthData[i].month_name = months[monthData[i].month_no];
            delete monthData[i].month_no;
        }
        const data = {
            total_asset,
            total_tagged,
            total_detagged,
            not_assigned,
            upcommingExp,
            upcommingSubmission,
            monthData: [...p2, ...p1],
        };
        res.status(200).json(
            new ApiResponse(200, data, "Dashboard data fetched")
        );
    } catch (error) {
        console.log(error);

        return res
            .status(500)
            .json(
                new ApiErrorResponce(
                    500,
                    {},
                    error.message || "Internal server error"
                )
            );
    }
}

async function backupCSV(req, res) {
    const { tenantId } = req.user;
    const { category, type } = req.body; // tagged, detagged, tagged-detagged
    if (!tenantId) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Tenant ID is required"));
    }
    const uploadsDir =
        env == "production"
            ? path.join(__dirname, "uploads")
            : path.join(__dirname, "../uploads");
    const filename = `dashboard_${Math.floor(Date.now() / 1000)}.csv`;
    const filePath = path.join(uploadsDir, filename);
    const assetTable = `assets_${tenantId}`;
    let query = `
            SELECT
                a.asset_id,
                a.serial,
                a.type AS category,
                a.model_no,
                a.status,
                a.location,
                a.exp_date,
                a.disposalDate AS disposal_date,
                a.diposalMethod AS diposal_method,
                a.saleTo AS sale_to,
                a.donatedTo AS donated_to,
                a.trashTo AS trash_to,
                a.pis_date,
                a.gl_account,
                a.asset_code AS us_asset_code,
                a.supplier_name,
                a.asset_criticality,
                a.asset_type AS type,
                a.remarks,
                COALESCE(e1.name, e2.name) AS employee_name,
                COALESCE(e1.emp_code, e2.emp_code) AS employee_code,
                COALESCE(t.assigned_at, h.assigned_at) AS assigned_at,
                CASE WHEN t.id IS NOT NULL THEN 'tagged' ELSE 'detagged' END AS tag_status,
                (
                    SELECT GROUP_CONCAT(ca.asset_id SEPARATOR ', ')
                    FROM child_assets_${tenantId} ca_rel
                    JOIN ${assetTable} ca ON ca_rel.child_asset_id = ca.id
                    WHERE ca_rel.asset_id = a.id AND ca_rel.remove_at IS NULL
                ) AS child_assets,
                (
                    SELECT GROUP_CONCAT(ca.asset_id SEPARATOR ', ')
                    FROM child_assets_${tenantId} ca_rel_h
                    JOIN ${assetTable} ca ON ca_rel_h.child_asset_id = ca.id
                    WHERE ca_rel_h.asset_id = a.id AND ca_rel_h.remove_at IS NOT NULL
                ) AS child_assets_history

            FROM assets_${tenantId} a

            LEFT JOIN taggings_${tenantId} t ON t.asset_id = a.id
            LEFT JOIN employees_${tenantId} e1 ON t.employee_id = e1.id
            LEFT JOIN (
                SELECT h1.*
                FROM history_${tenantId} h1
                INNER JOIN (
                    SELECT asset_id, MAX(id) AS max_id
                    FROM history_${tenantId}
                    GROUP BY asset_id
                ) h2 ON h1.asset_id = h2.asset_id AND h1.id = h2.max_id
            ) h ON h.asset_id = a.id AND t.id IS NULL
            LEFT JOIN employees_${tenantId} e2 ON h.employee_id = e2.id

            WHERE a.disposalDate IS NULL AND (t.id IS NOT NULL OR h.id IS NOT NULL)
            ${type == "all" ? "" : type == "it" ? "AND a.asset_type = 'it'" : "AND a.asset_type = 'admin'"};
        `;
    if (category == "tagged") {
        query = `
            SELECT
                a.asset_id,
                a.serial,
                a.type AS category,
                a.model_no,
                a.status,
                a.location,
                a.exp_date,
                a.disposalDate AS disposal_date,
                a.diposalMethod AS diposal_method,
                a.saleTo AS sale_to,
                a.donatedTo AS donated_to,
                a.trashTo AS trash_to,
                a.pis_date,
                a.gl_account,
                a.asset_code AS us_asset_code,
                a.supplier_name,
                a.asset_criticality,
                a.asset_type AS type,
                a.remarks,
                e1.name AS employee_name,
                e1.emp_code AS employee_code,
                t.assigned_at,
                'tagged' AS tag_status,
                (
                    SELECT GROUP_CONCAT(ca.asset_id SEPARATOR ', ')
                    FROM child_assets_${tenantId} ca_rel
                    JOIN ${assetTable} ca ON ca_rel.child_asset_id = ca.id
                    WHERE ca_rel.asset_id = a.id AND ca_rel.remove_at IS NULL
                ) AS child_assets,
                (
                    SELECT GROUP_CONCAT(ca.asset_id SEPARATOR ', ')
                    FROM child_assets_${tenantId} ca_rel_h
                    JOIN ${assetTable} ca ON ca_rel_h.child_asset_id = ca.id
                    WHERE ca_rel_h.asset_id = a.id AND ca_rel_h.remove_at IS NOT NULL
                ) AS child_assets_history

            FROM assets_${tenantId} a

            INNER JOIN taggings_${tenantId} t ON t.asset_id = a.id
            LEFT JOIN employees_${tenantId} e1 ON t.employee_id = e1.id
            WHERE a.disposalDate IS NULL
            ${type == "all" ? "" : type == "it" ? "AND a.asset_type = 'it'" : "AND a.asset_type = 'admin'"};
        `;
    } else if (category == "detagged") {
        query = `
            SELECT
                a.asset_id,
                a.serial,
                a.type AS category,
                a.model_no,
                a.status,
                a.location,
                a.exp_date,
                a.disposalDate AS disposal_date,
                a.diposalMethod AS diposal_method,
                a.saleTo AS sale_to,
                a.donatedTo AS donated_to,
                a.trashTo AS trash_to,
                a.pis_date,
                a.gl_account,
                a.asset_code AS us_asset_code,
                a.supplier_name,
                a.asset_criticality,
                a.asset_type AS type,
                a.remarks,
                e2.name AS employee_name,
                e2.emp_code AS employee_code,
                h.assigned_at,
                'detagged' AS tag_status,
                (
                    SELECT GROUP_CONCAT(ca.asset_id SEPARATOR ', ')
                    FROM child_assets_${tenantId} ca_rel
                    JOIN ${assetTable} ca ON ca_rel.child_asset_id = ca.id
                    WHERE ca_rel.asset_id = a.id AND ca_rel.remove_at IS NULL
                ) AS child_assets,
                (
                    SELECT GROUP_CONCAT(ca.asset_id SEPARATOR ', ')
                    FROM child_assets_${tenantId} ca_rel_h
                    JOIN ${assetTable} ca ON ca_rel_h.child_asset_id = ca.id
                    WHERE ca_rel_h.asset_id = a.id AND ca_rel_h.remove_at IS NOT NULL
                ) AS child_assets_history

            FROM assets_${tenantId} a

            INNER JOIN (
                SELECT h1.*
                FROM history_${tenantId} h1
                INNER JOIN (
                    SELECT asset_id, MAX(id) AS max_id
                    FROM history_${tenantId}
                    GROUP BY asset_id
                ) h2 ON h1.asset_id = h2.asset_id AND h1.id = h2.max_id
            ) h ON h.asset_id = a.id
            LEFT JOIN employees_${tenantId} e2 ON h.employee_id = e2.id

            LEFT JOIN taggings_${tenantId} t ON t.asset_id = a.id
            WHERE a.disposalDate IS NULL AND t.asset_id IS NULL
            ${type == "all" ? "" : type == "it" ? "AND a.asset_type = 'it'" : "AND a.asset_type = 'admin'"};
        `;
    } else if (category == "not_assigned") {
        query = `
            SELECT
                a.asset_id,
                a.serial,
                a.type AS category,
                a.model_no,
                a.status,
                a.location,
                a.exp_date,
                a.disposalDate AS disposal_date,
                a.diposalMethod AS diposal_method,
                a.saleTo AS sale_to,
                a.donatedTo AS donated_to,
                a.trashTo AS trash_to,
                a.pis_date,
                a.gl_account,
                a.asset_code AS us_asset_code,
                a.supplier_name,
                a.asset_criticality,
                a.asset_type AS type,
                a.remarks,
                NULL AS employee_name,
                NULL AS employee_code,
                NULL AS assigned_at,
                'detagged' AS tag_status,
                (
                    SELECT GROUP_CONCAT(ca.asset_id SEPARATOR ', ')
                    FROM child_assets_${tenantId} ca_rel
                    JOIN ${assetTable} ca ON ca_rel.child_asset_id = ca.id
                    WHERE ca_rel.asset_id = a.id AND ca_rel.remove_at IS NULL
                ) AS child_assets,
                (
                    SELECT GROUP_CONCAT(ca.asset_id SEPARATOR ', ')
                    FROM child_assets_${tenantId} ca_rel_h
                    JOIN ${assetTable} ca ON ca_rel_h.child_asset_id = ca.id
                    WHERE ca_rel_h.asset_id = a.id AND ca_rel_h.remove_at IS NOT NULL
                ) AS child_assets_history

            FROM assets_${tenantId} a
            LEFT JOIN taggings_${tenantId} t ON t.asset_id = a.id
            LEFT JOIN history_${tenantId} h ON h.asset_id = a.id
            WHERE a.disposalDate IS NULL AND t.asset_id IS NULL AND h.asset_id IS NULL
            ${type == "all" ? "" : type == "it" ? "AND a.asset_type = 'it'" : "AND a.asset_type = 'admin'"};
        `;
    }
    try {
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const [rows] = await pool.query(query);
        if (rows.length === 0) {
            return res
                .status(404)
                .json(new ApiErrorResponce(404, {}, "No data found"));
        }

        const ws = fs.createWriteStream(filePath);
        const csvStream = format({ headers: true });
        csvStream.pipe(ws);
        rows.forEach((row) => {
            const updatedRow = {
                ...row,
                exp_date: row.exp_date
                    ? formatDate(new Date(row.exp_date))
                    : "",
                disposal_date: row.disposal_date
                    ? formatDate(new Date(row.disposal_date))
                    : "",
                pis_date: row.pis_date
                    ? formatDate(new Date(row.pis_date))
                    : "",
                assigned_at: row.assigned_at
                    ? formatDate(new Date(row.assigned_at))
                    : "",
            };
            csvStream.write(updatedRow);
        });
        csvStream.end();
        ws.on("finish", () => {
            return res.download(filePath, filename, (err) => {
                if (err) {
                    cleanupFile(filePath);
                    return res
                        .status(500)
                        .json(
                            new ApiErrorResponce(
                                500,
                                {},
                                "Error sending CSV file for download"
                            )
                        );
                } else {
                    cleanupFile(filePath);
                }
            });
        });
    } catch (error) {
        console.log(error);

        return res
            .status(500)
            .json(
                new ApiErrorResponce(
                    500,
                    {},
                    error.message || "Internal server error"
                )
            );
    }
}

async function backupUpcommingCSV(req, res) {
    const { tenantId } = req.user;
    if (!tenantId) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Tenant ID is required"));
    }
    const { upcommingFrom, upcommingTo, type } = req.body;
    if (!upcommingFrom || !upcommingTo) {
        return res
            .status(400)
            .json(
                new ApiErrorResponce(400, {}, "Plese select from and to date")
            );
    }
    const uploadsDir =
        env == "production"
            ? path.join(__dirname, "uploads")
            : path.join(__dirname, "../uploads");
    const filename = `upcomming_exp_assets_${Math.floor(Date.now() / 1000)}.csv`;
    const filePath = path.join(uploadsDir, filename);
    const assetTable = `assets_${tenantId}`;
    const taggingTable = `taggings_${tenantId}`;
    const employeeTable = `employees_${tenantId}`;
    try {
        const [upcommingExp] = await pool.query(
            `
                    SELECT 
                        a.asset_id,a.serial,a.type,a.model_no,a.status,a.location,a.exp_date,a.disposalDate,a.diposalMethod,a.saleTo,a.donatedTo,a.trashTo,a.pis_date,a.gl_account,a.supplier_name,a.asset_criticality,a.asset_type,
                        e.name AS employee_name,
                        e.emp_code AS employee_code,
                        t.assigned_at,
                        CASE WHEN t.id IS NOT NULL THEN 'tagged' ELSE 'detagged' END AS tag_status,
                        (
                            SELECT GROUP_CONCAT(ca.asset_id SEPARATOR ', ')
                            FROM child_assets_${tenantId} ca_rel
                            JOIN ${assetTable} ca ON ca_rel.child_asset_id = ca.id
                            WHERE ca_rel.asset_id = a.id AND ca_rel.remove_at IS NULL
                        ) AS child_assets,
                        (
                            SELECT GROUP_CONCAT(ca.asset_id SEPARATOR ', ')
                            FROM child_assets_${tenantId} ca_rel_h
                            JOIN ${assetTable} ca ON ca_rel_h.child_asset_id = ca.id
                            WHERE ca_rel_h.asset_id = a.id AND ca_rel_h.remove_at IS NOT NULL
                        ) AS child_assets_history
                    FROM ${assetTable} a
                    LEFT JOIN ${taggingTable} t ON a.id = t.asset_id
                    LEFT JOIN ${employeeTable} e ON t.employee_id = e.id
                    WHERE
                        a.exp_date IS NOT NULL 
                        AND a.disposalDate IS NULL
                        AND a.exp_date BETWEEN ? AND ?
                        ${type == "all" ? "" : type == "it" ? "AND a.asset_type = 'it'" : "AND a.asset_type = 'admin'"}
                    ORDER BY a.exp_date ASC
                `,
            [upcommingFrom, upcommingTo]
        );

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        if (upcommingExp.length === 0) {
            return res
                .status(404)
                .json(new ApiErrorResponce(404, {}, "No data found"));
        }
        const ws = fs.createWriteStream(filePath);
        const csvStream = format({ headers: true });
        csvStream.pipe(ws);
        upcommingExp.forEach((row) => {
            const updatedRow = {
                ...row,
                exp_date: row.exp_date
                    ? formatDate(new Date(row.exp_date))
                    : "",
                pis_date: row.pis_date
                    ? formatDate(new Date(row.pis_date))
                    : "",
                assigned_at: row.assigned_at
                    ? formatDate(new Date(row.assigned_at))
                    : "",
                disposalDate: row.disposalDate
                    ? formatDate(new Date(row.disposalDate))
                    : "",
            };
            csvStream.write(updatedRow);
        });
        csvStream.end();
        ws.on("finish", () => {
            return res.download(filePath, filename, (err) => {
                if (err) {
                    cleanupFile(filePath);
                    return res
                        .status(500)
                        .json(
                            new ApiErrorResponce(
                                500,
                                {},
                                "Error sending CSV file for download"
                            )
                        );
                } else {
                    cleanupFile(filePath);
                }
            });
        });
    } catch (error) {
        console.log(error);
        return res
            .status(500)
            .json(
                new ApiErrorResponce(
                    500,
                    {},
                    "Error sending CSV file for download"
                )
            );
    }
}

async function backupExpiredCSV(req, res) {
    const { tenantId } = req.user;
    if (!tenantId) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Tenant ID is required"));
    }

    const { expiredFrom, expiredTo, type } = req.body;
    if (!expiredFrom || !expiredTo) {
        return res
            .status(400)
            .json(
                new ApiErrorResponce(400, {}, "Please select from and to date")
            );
    }

    const uploadsDir =
        env === "production"
            ? path.join(__dirname, "uploads")
            : path.join(__dirname, "../uploads");

    const filename = `expired_assets_${tenantId}_${Math.floor(Date.now() / 1000)}.csv`;
    const filePath = path.join(uploadsDir, filename);
    const assetTable = `assets_${tenantId}`;
    const taggingTable = `taggings_${tenantId}`;
    const employeeTable = `employees_${tenantId}`;

    try {
        const [expiredAssets] = await pool.query(
            `
           SELECT 
                a.asset_id,a.serial,a.type,a.model_no,a.status,a.location,a.exp_date,a.disposalDate,a.diposalMethod,a.saleTo,a.donatedTo,a.trashTo,a.pis_date,a.gl_account,a.supplier_name,a.asset_criticality,a.asset_type,
                e.name AS employee_name,
                e.emp_code AS employee_code,
                t.assigned_at,
                CASE WHEN t.id IS NOT NULL THEN 'tagged' ELSE 'detagged' END AS tag_status,
                (
                    SELECT GROUP_CONCAT(ca.asset_id SEPARATOR ', ')
                    FROM child_assets_${tenantId} ca_rel
                    JOIN ${assetTable} ca ON ca_rel.child_asset_id = ca.id
                    WHERE ca_rel.asset_id = a.id AND ca_rel.remove_at IS NULL
                ) AS child_assets,
                (
                    SELECT GROUP_CONCAT(ca.asset_id SEPARATOR ', ')
                    FROM child_assets_${tenantId} ca_rel_h
                    JOIN ${assetTable} ca ON ca_rel_h.child_asset_id = ca.id
                    WHERE ca_rel_h.asset_id = a.id AND ca_rel_h.remove_at IS NOT NULL
                ) AS child_assets_history
            FROM ${assetTable} a
            LEFT JOIN ${taggingTable} t ON a.id = t.asset_id
            LEFT JOIN ${employeeTable} e ON t.employee_id = e.id
            WHERE a.exp_date IS NOT NULL 
              AND a.disposalDate IS NULL
              AND a.exp_date BETWEEN ? AND ?
              ${type == "all" ? "" : type == "it" ? "AND a.asset_type = 'it'" : "AND a.asset_type = 'admin'"}
            ORDER BY a.exp_date ASC
            `,
            [expiredFrom, expiredTo]
        );

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        if (expiredAssets.length === 0) {
            return res
                .status(404)
                .json(new ApiErrorResponce(404, {}, "No expired assets found"));
        }

        const ws = fs.createWriteStream(filePath);
        const csvStream = format({ headers: true });
        csvStream.pipe(ws);

        expiredAssets.forEach((row) => {
            const updatedRow = {
                ...row,
                exp_date: row.exp_date
                    ? formatDate(new Date(row.exp_date))
                    : "",
                pis_date: row.pis_date
                    ? formatDate(new Date(row.pis_date))
                    : "",
                assigned_at: row.assigned_at
                    ? formatDate(new Date(row.assigned_at))
                    : "",
                disposalDate: row.disposalDate
                    ? formatDate(new Date(row.disposalDate))
                    : "",
            };
            csvStream.write(updatedRow);
        });

        csvStream.end();

        ws.on("finish", () => {
            return res.download(filePath, filename, (err) => {
                if (err) {
                    cleanupFile(filePath);
                    return res
                        .status(500)
                        .json(
                            new ApiErrorResponce(
                                500,
                                {},
                                "Error sending expired CSV file for download"
                            )
                        );
                } else {
                    cleanupFile(filePath);
                }
            });
        });
    } catch (error) {
        return res
            .status(500)
            .json(new ApiErrorResponce(500, {}, "Internal server error"));
    }
}

async function forgotPassword(req, res) {
    const { email } = req.body;
    if (!email) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Email is required"));
    }
    if (!validateEmail(email)) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Invalid email format"));
    }
    try {
        const [rows] = await pool.query(
            `SELECT * FROM users_a1b2c3d4 WHERE email = ?`,
            [email]
        );
        if (rows.length === 0) {
            return res
                .status(404)
                .json(
                    new ApiErrorResponce(
                        404,
                        {},
                        "User not found with this email"
                    )
                );
        }
        const user = rows[0];
        // create jwt token to reset password
        const token = crypto.randomBytes(16).toString("hex"); //
        let tokenExp = new Date();
        tokenExp.setMinutes(tokenExp.getMinutes() + 10);
        tokenExp = getISTString(tokenExp);

        // save token to db
        const [result] = await pool.query(
            `UPDATE users_a1b2c3d4 SET token = ?, token_exp = ? WHERE id = ?`,
            [token, tokenExp, user.id]
        );
        if (result.affectedRows === 0) {
            return res
                .status(500)
                .json(new ApiErrorResponce(500, {}, "Failed to update token"));
        }
        // send email to user with token
        const resetLink = `http://10.172.31.131:7778/reset-password/${token}`;
        const data = { name: user.name, resetLink, expiryTime: "10" };
        const template = path.join(templateDir, "resetPassword.ejs");
        const html = await ejs.renderFile(template, data);
        await sendMail(user.email, "Password reset link", html);

        res.status(200).json(
            new ApiResponse(200, {}, "Token sent successfully")
        );
    } catch (error) {
        res.status(500).json(
            new ApiErrorResponce(
                500,
                {},
                error.message || "Internal server error"
            )
        );
    }
}

async function resetPassword(req, res) {
    const { token, password } = req.body;
    if (!token || !password) {
        return res
            .status(400)
            .json(
                new ApiErrorResponce(400, {}, "Token and password are required")
            );
    }
    try {
        const [rows] = await pool.query(
            `SELECT * FROM users_a1b2c3d4 WHERE token = ? AND token_exp > ?`,
            [token, getISTString()]
        );
        if (rows.length === 0) {
            return res
                .status(400)
                .json(new ApiErrorResponce(400, {}, "Invalid token"));
        }
        const user = rows[0];

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            `UPDATE users_a1b2c3d4 SET password = ?, token = ?, token_exp = ? WHERE id = ?`,
            [hashedPassword, null, null, user.id]
        );
        if (result.affectedRows === 0) {
            return res
                .status(500)
                .json(
                    new ApiErrorResponce(500, {}, "Failed to update password")
                );
        }
        res.status(200).json(
            new ApiResponse(200, {}, "Password updated successfully")
        );
    } catch (error) {
        console.log(error);
        res.status(400).json(new ApiErrorResponce(400, {}, "Invalid token"));
    }
}

async function changePassword(req, res) {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const { id, tenantId } = req.user;

    if (!oldPassword || !newPassword || !confirmPassword) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "All password fields are required"));
    }

    if (newPassword !== confirmPassword) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "New password and confirmation password do not match"));
    }

    if (!isStrongPassword(newPassword)) {
        return res.status(400).json(
            new ApiErrorResponce(
                400,
                {},
                "Weak password. Must include uppercase, lowercase, number, special char, and be at least 8 chars long."
            )
        );
    }

    const userTable = `users_${tenantId}`;
    try {
        const [rows] = await pool.query(
            `SELECT password FROM ${userTable} WHERE id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res
                .status(404)
                .json(new ApiErrorResponce(404, {}, "User not found"));
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res
                .status(400)
                .json(new ApiErrorResponce(400, {}, "Incorrect old password"));
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            `UPDATE ${userTable} SET password = ? WHERE id = ?`,
            [hashedPassword, id]
        );

        return res.status(200).json(
            new ApiResponse(200, {}, "Password changed successfully")
        );
    } catch (error) {
        return res
            .status(500)
            .json(
                new ApiErrorResponce(
                    500,
                    {},
                    error.message || "Internal server error"
                )
            );
    }
}

module.exports = {
    signUp,
    signIn,
    signOut,
    getUsers,
    updateUser,
    getDaashboardData,
    backupCSV,
    forgotPassword,
    resetPassword,
    backupUpcommingCSV,
    backupExpiredCSV,
    changePassword,
};
