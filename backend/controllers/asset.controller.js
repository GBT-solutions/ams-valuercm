const path = require("path");
const fs = require("fs");
const { format } = require("@fast-csv/format");

const ApiErrorResponce = require("../utils/ApiErrorResponce");
const ApiResponse = require("../utils/ApiResponse");
const pool = require("../utils/dbConnect");
const {
    validateAssetId,
    capitalizeWords,
    getISTString,
    validateEmployeeCode,
    formatDate,
    getSqlDate,
} = require("../utils/helperFunctions");
const { parseCSVFile, cleanupFile } = require("../utils/csvUpload");
const env = process.env.NODE_ENV || "development";

async function addNewAsset(req, res) {
    const { tenantId } = req.user;
    const {
        assetId,
        serial = null,
        type,
        modelNo = null,
        glAccount = null,
        assetCode = null,
        location = null,
        remarks = null,
        expDate = null,
        supplierName = null,
        pisDate = null,
        assetCriticality = null,
        assetType = null,
        childAssets = [],
    } = req.body;
    const child_asset = childAssets.length > 0 ? 1 : 0;
    if (!assetId || !type || !tenantId) {
        return res
            .status(400)
            .json(
                new ApiErrorResponce(
                    400,
                    {},
                    "Asset ID, Category, and Tenant ID are required"
                )
            );
    }

    if (!validateAssetId(assetId)) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Invalid asset ID format"));
    }

    const assetTable = `assets_${tenantId}`;
    const query = `
        INSERT INTO ${assetTable} 
        (asset_id, serial, type, model_no, status, location, remarks, exp_date, pis_date, gl_account, asset_code, supplier_name, asset_criticality, asset_type, child_asset)
        VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(query, [
            assetId,
            serial ? serial : null,
            type,
            modelNo,
            location,
            remarks,
            expDate,
            pisDate,
            glAccount,
            assetCode,
            supplierName,
            assetCriticality,
            assetType,
            child_asset,
        ]);

        if (child_asset === 1 && childAssets && childAssets.length > 0) {
            const mappingTable = `child_assets_${tenantId}`;

            // Validation: child asset cannot already be a child of another asset
            const [alreadyAssigned] = await connection.query(
                `SELECT child_asset_id FROM ${mappingTable} WHERE child_asset_id IN (?) AND remove_at IS NULL`,
                [childAssets]
            );
            if (alreadyAssigned.length > 0) {
                await connection.rollback();
                connection.release();
                return res
                    .status(400)
                    .json(
                        new ApiErrorResponce(
                            400,
                            {},
                            "Some assets are already assigned as child assets of another asset"
                        )
                    );
            }

            // Validation: child asset cannot have its own child assets
            const [hasChildren] = await connection.query(
                `SELECT asset_id FROM ${mappingTable} WHERE asset_id IN (?) AND remove_at IS NULL`,
                [childAssets]
            );
            if (hasChildren.length > 0) {
                await connection.rollback();
                connection.release();
                return res
                    .status(400)
                    .json(
                        new ApiErrorResponce(
                            400,
                            {},
                            "An asset that already has child assets cannot be added as a child asset"
                        )
                    );
            }

            const childAssetQueries = childAssets.map((childId) => [
                result.insertId,
                childId,
                getISTString(),
            ]);
            const childQuery = `INSERT INTO ${mappingTable} (asset_id, child_asset_id, created_at) VALUES ?`;
            await connection.query(childQuery, [childAssetQueries]);
        }

        await connection.commit();
        connection.release();

        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    id: result.insertId,
                    assetId,
                    serial,
                    type,
                    modelNo,
                    location,
                    remarks,
                    expDate,
                    pisDate,
                    glAccount,
                    assetCode,
                    supplierName,
                    assetCriticality,
                    assetType,
                },
                "Asset created successfully"
            )
        );
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }

        const msg = error.sqlMessage || "";

        if (/serial/i.test(msg)) {
            return res
                .status(409)
                .json(
                    new ApiErrorResponce(
                        409,
                        {},
                        "Serial number already exists"
                    )
                );
        }

        if (/asset_id/i.test(msg)) {
            return res
                .status(409)
                .json(new ApiErrorResponce(409, {}, "Asset ID already exists"));
        }

        if (msg) {
            return res
                .status(409)
                .json(
                    new ApiErrorResponce(
                        409,
                        {},
                        "Asset ID or Serial already exists"
                    )
                );
        }
        return res
            .status(500)
            .json(new ApiErrorResponce(500, {}, "Internal server error"));
    }
}

async function getAssets(req, res) {
    const { tenantId } = req.user;
    const assetTable = `assets_${tenantId}`;
    const taggingTable = `taggings_${tenantId}`;
    const employeeTable = `employees_${tenantId}`;

    const status = req.query?.status;
    const size = parseInt(req.query?.size) || 5;
    const page = parseInt(req.query?.page) || 1;
    const search = req.query?.search?.trim();
    const offset = (page - 1) * size;

    if (size < 1 || page < 1) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Invalid page or size"));
    }

    let whereClauses = ["a.disposalDate IS NULL"];
    let dataParams = [];
    let countParams = [];

    // Build WHERE clause
    if (status && ["active", "inactive"].includes(status)) {
        whereClauses.push("a.status = ?");
        dataParams.push(status);
        countParams.push(status);
    }

    if (search) {
        const like = `%${search}%`;
        const searchClause = `(a.asset_id LIKE ? OR a.type LIKE ? OR a.model_no LIKE ? OR a.serial LIKE ?)`;
        whereClauses.push(searchClause);
        dataParams.push(like, like, like, like);
        countParams.push(like, like, like, like);
    }

    const whereSql = whereClauses.length
        ? `WHERE ${whereClauses.join(" AND ")}`
        : "";

    // Count query (no joins for performance)
    const countQuery = `
        SELECT COUNT(*) as count
        FROM ${assetTable} a
        ${whereSql}
    `;

    const assetChildrenTable = `child_assets_${tenantId}`;

    // Data query with LEFT JOINs and child assets subquery
    const dataQuery = `
        SELECT 
            a.*,
            e.id as emp_id,
            e.emp_code,
            e.name,
            t.assigned_submission,
            (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', ca.id,
                        'asset_id', ca.asset_id,
                        'type', ca.type,
                        'model_no', ca.model_no,
                        'serial', ca.serial
                    )
                )
                FROM ${assetChildrenTable} ac
                JOIN ${assetTable} ca ON ac.child_asset_id = ca.id
                WHERE ac.asset_id = a.id AND ac.remove_at IS NULL
            ) AS child_assets,
            (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', ca.id,
                        'asset_id', ca.asset_id,
                        'type', ca.type,
                        'model_no', ca.model_no,
                        'serial', ca.serial
                    )
                )
                FROM ${assetChildrenTable} ac
                JOIN ${assetTable} ca ON ac.child_asset_id = ca.id
                WHERE ac.asset_id = a.id AND ac.remove_at IS NOT NULL
            ) AS child_assets_history
        FROM ${assetTable} a
        LEFT JOIN ${taggingTable} t ON a.id = t.asset_id
        LEFT JOIN ${employeeTable} e ON t.employee_id = e.id
        ${whereSql}
        ORDER BY a.asset_id ASC
        LIMIT ? OFFSET ?
    `;

    try {
        // Execute count query
        const [countResult] = await pool.query(countQuery, countParams);
        const totalItems = countResult[0].count;
        const totalPages = Math.ceil(totalItems / size);

        if (page > totalPages && totalPages !== 0) {
            return res
                .status(404)
                .json(new ApiErrorResponce(404, {}, "Page not found"));
        }

        if (totalItems === 0) {
            return res.status(200).json(
                new ApiErrorResponce(
                    200,
                    {
                        items: [],
                        totalItems: 0,
                        totalPages: 0,
                        currentPage: 0,
                        pageSize: size,
                    },
                    "No assets found"
                )
            );
        }

        // Execute data query
        const [assets] = await pool.query(dataQuery, [
            ...dataParams,
            size,
            offset,
        ]);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    items: assets,
                    totalItems,
                    totalPages,
                    currentPage: page,
                    pageSize: size,
                },
                "Assets retrieved successfully"
            )
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

async function update(req, res) {
    const { tenantId } = req.user;
    const { id } = req.params;
    const {
        asset_id,
        serial,
        type,
        model_no,
        status,
        location,
        remarks,
        exp_date,
        pis_date,
        gl_account,
        asset_code,
        supplier_name,
        assigned_to,
        assigned_submission,
        asset_criticality,
        asset_type,
        childAssets = [],
    } = req.body;

    const child_asset = childAssets && childAssets.length > 0 ? 1 : 0;

    if (!asset_id || !status || !serial || !type || !model_no || !asset_type) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Required fields are missing"));
    }

    if (!validateAssetId(asset_id)) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Invalid asset ID format"));
    }

    if (!["active", "inactive"].includes(status)) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Invalid status value"));
    }

    const assetTable = `assets_${tenantId}`;
    const taggingTable = `taggings_${tenantId}`;
    const employeeTable = `employees_${tenantId}`;

    let employeeId = null;

    try {
        // Lookup employee ID if assigned_to is present
        if (assigned_to) {
            if (!validateEmployeeCode(assigned_to)) {
                return res
                    .status(400)
                    .json(
                        new ApiErrorResponce(
                            400,
                            {},
                            "Invalid assigned_to format"
                        )
                    );
            }

            const [employeeResult] = await pool.query(
                `SELECT id FROM ${employeeTable} WHERE emp_code = ?`,
                [assigned_to]
            );

            if (employeeResult.length === 0) {
                return res
                    .status(404)
                    .json(
                        new ApiErrorResponce(
                            404,
                            {},
                            "Assigned employee not found"
                        )
                    );
            }

            employeeId = employeeResult[0].id;
            // Check if employee is tagged
            const [taggingResult] = await pool.query(
                `SELECT * FROM ${taggingTable} WHERE employee_id = ?`,
                [employeeId]
            );

            if (
                taggingResult.length > 0 &&
                taggingResult[0].employee_id !== employeeId
            ) {
                return res
                    .status(400)
                    .json(
                        new ApiErrorResponce(
                            400,
                            {},
                            "Employee is already tagged to another asset"
                        )
                    );
            }

            // Check if asset is already tagged
            const [tagResult] = await pool.query(
                `SELECT id, assigned_at FROM ${taggingTable} WHERE asset_id = ?`,
                [id]
            );

            if (tagResult.length > 0) {
                if (tagResult[0].employee_id !== employeeId) {
                    await pool.query(
                        `UPDATE ${taggingTable} SET employee_id = ?, assigned_submission = ? WHERE asset_id = ?`,
                        [employeeId, assigned_submission, id]
                    );
                    await pool.query(
                        `INSERT INTO history_${tenantId} (asset_id, employee_id, assigned_at, detagged_at) VALUES (?, ?, ?, ?);`,
                        [
                            id,
                            employeeId,
                            getISTString(new Date(tagResult[0].assigned_at)),
                            getISTString(new Date()),
                        ]
                    );
                }
            } else {
                // If not tagged, insert a new record
                await pool.query(
                    `INSERT INTO ${taggingTable} (asset_id, employee_id, assigned_submission, assigned_at) VALUES (?, ?, ?, ?)`,
                    [id, employeeId, assigned_submission, getISTString()]
                );
            }
        }

        const [result] = await pool.query(
            `UPDATE ${assetTable}
            SET 
                status = ?, 
                serial = ?, 
                type = ?, 
                model_no = ?, 
                location = ?, 
                remarks = ?, 
                exp_date = ?, 
                asset_id = ?, 
                pis_date = ?, 
                gl_account = ?, 
                asset_code = ?, 
                supplier_name = ?, 
                asset_criticality = ?, 
                asset_type = ?,
                child_asset = ?
            WHERE id = ?`,
            [
                status,
                serial,
                type,
                model_no,
                location ? capitalizeWords(location) : null,
                remarks || null,
                exp_date || null,
                asset_id.toUpperCase(),
                pis_date || null,
                gl_account || null,
                asset_code || null,
                supplier_name || null,
                asset_criticality || null,
                asset_type,
                child_asset,
                parseInt(id, 10),
            ]
        );

        const mappingTable = `child_assets_${tenantId}`;
        const newChildAssets = childAssets ? childAssets.map(Number) : [];

        // Validation: If we are assigning child assets, the parent asset itself cannot be a child asset
        if (newChildAssets.length > 0) {
            const [isChild] = await pool.query(
                `SELECT child_asset_id FROM ${mappingTable} WHERE child_asset_id = ? AND remove_at IS NULL`,
                [parseInt(id, 10)]
            );

            if (isChild.length > 0) {
                return res
                    .status(400)
                    .json(
                        new ApiErrorResponce(
                            400,
                            {},
                            "This asset is a child asset of another asset and cannot have its own child assets"
                        )
                    );
            }
        }

        // Fetch existing active child assets
        const [existingChildrenObj] = await pool.query(
            `SELECT child_asset_id FROM ${mappingTable} WHERE asset_id = ? AND remove_at IS NULL`,
            [parseInt(id, 10)]
        );
        const existingChildIds = existingChildrenObj.map(
            (row) => row.child_asset_id
        );

        // Find which assets to remove and which to add
        const toRemove = existingChildIds.filter(
            (childId) => !newChildAssets.includes(childId)
        );
        const toAdd = newChildAssets.filter(
            (childId) => !existingChildIds.includes(childId)
        );

        if (toRemove.length > 0) {
            await pool.query(
                `UPDATE ${mappingTable} SET remove_at = CURRENT_TIMESTAMP WHERE asset_id = ? AND child_asset_id IN (?) AND remove_at IS NULL`,
                [parseInt(id, 10), toRemove]
            );
        }

        if (toAdd.length > 0) {
            // Validation 1: asset cannot be its own child
            if (toAdd.includes(parseInt(id, 10))) {
                return res
                    .status(400)
                    .json(
                        new ApiErrorResponce(
                            400,
                            {},
                            "An asset cannot be added as its own child asset"
                        )
                    );
            }

            // Validation 2: child asset cannot already be a child of another asset
            const [alreadyAssigned] = await pool.query(
                `SELECT child_asset_id, asset_id FROM ${mappingTable} WHERE child_asset_id IN (?) AND asset_id != ? AND remove_at IS NULL`,
                [toAdd, parseInt(id, 10)]
            );

            if (alreadyAssigned.length > 0) {
                return res
                    .status(400)
                    .json(
                        new ApiErrorResponce(
                            400,
                            {},
                            `Some assets are already assigned as child assets of another asset`
                        )
                    );
            }

            // Validation 3: child asset cannot have its own child assets
            const [hasChildren] = await pool.query(
                `SELECT asset_id FROM ${mappingTable} WHERE asset_id IN (?) AND remove_at IS NULL`,
                [toAdd]
            );

            if (hasChildren.length > 0) {
                return res
                    .status(400)
                    .json(
                        new ApiErrorResponce(
                            400,
                            {},
                            "An asset that already has child assets cannot be added as a child asset"
                        )
                    );
            }

            const childAssetQueries = toAdd.map((childId) => [
                parseInt(id, 10),
                childId,
                getISTString(),
            ]);
            const childQuery = `INSERT INTO ${mappingTable} (asset_id, child_asset_id, created_at) VALUES ?`;
            await pool.query(childQuery, [childAssetQueries]);
        }

        if (newChildAssets.length > 0) {
            await pool.query(
                `UPDATE ${assetTable} SET child_asset = 1 WHERE id = ?`,
                [parseInt(id, 10)]
            );
        } else {
            await pool.query(
                `UPDATE ${assetTable} SET child_asset = 0 WHERE id = ?`,
                [parseInt(id, 10)]
            );
        }

        if (result.affectedRows === 0) {
            return res
                .status(404)
                .json(new ApiErrorResponce(404, {}, "Asset not found"));
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    id,
                    asset_id,
                    serial,
                    type,
                    model_no,
                    status,
                    location: location || null,
                    remarks: remarks || null,
                    exp_date: exp_date || null,
                    pis_date: pis_date || null,
                    gl_account: gl_account || null,
                    asset_code: asset_code || null,
                    supplier_name: supplier_name || null,
                    asset_criticality: asset_criticality || null,
                    asset_type,
                    employee_id: employeeId,
                    child_assets: childAssets,
                },
                "Asset updated successfully"
            )
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

async function createCSVBackup(req, res) {
    const { tenantId } = req.user;
    const type = req.query?.type || "all";
    const assetTable = `assets_${tenantId}`;
    const taggingTable = `taggings_${tenantId}`;
    const employeeTable = `employees_${tenantId}`;
    const query = `
        SELECT 
            a.asset_id,
            a.serial,
            a.type,
            a.model_no,
            a.status,
            a.location,
            a.exp_date,
            a.disposalDate AS disposal_date,
            a.diposalMethod AS disposal_method,
            a.saleTo AS sale_to,
            a.donatedTo AS donated_to,
            a.trashTo AS trash_to,
            a.pis_date,
            a.gl_account,
            a.asset_code,
            a.supplier_name,
            a.asset_criticality,
            a.asset_type,
            a.remarks,
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
        WHERE a.disposalDate IS NULL
        ${type == "all" ? "" : type == "it" ? "AND a.asset_type = 'it'" : "AND a.asset_type = 'admin'"}
    `;

    const uploadsDir =
        env == "production"
            ? path.join(__dirname, "uploads")
            : path.join(__dirname, "../uploads");
    const filename = `assets_${Math.floor(Date.now() / 1000)}.csv`;
    const filePath = path.join(uploadsDir, filename);

    const headerMap = {
        type: "category",
        asset_type: "type",
        asset_code: "us_asset_code",
    };

    try {
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const [rows] = await pool.query(query);

        if (rows.length === 0) {
            return res
                .status(404)
                .json(new ApiErrorResponce(404, {}, "No assets found"));
        }

        const ws = fs.createWriteStream(filePath);
        const csvStream = format({ headers: true });
        csvStream.pipe(ws);

        rows.forEach((row) => {
            const formattedRow = {};
            Object.keys(row).forEach((key) => {
                const newHeader = headerMap[key] || key;
                let value = row[key];
                if (value instanceof Date) {
                    value = getSqlDate(value);
                }

                formattedRow[newHeader] = value;
            });

            csvStream.write(formattedRow);
        });

        csvStream.end();

        ws.on("finish", () => {
            return res.download(filePath, filename, (err) => {
                cleanupFile(filePath);
                if (err) {
                    console.error("Error sending file:", err);
                    if (!res.headersSent) {
                        res.status(500).json(
                            new ApiErrorResponce(
                                500,
                                {},
                                "Error sending CSV file for download"
                            )
                        );
                    }
                }
            });
        });

        ws.on("error", (err) => {
            console.error("Stream error:", err);
            cleanupFile(filePath);
            if (!res.headersSent) {
                res.status(500).json(
                    new ApiErrorResponce(500, {}, "File stream error")
                );
            }
        });
    } catch (error) {
        console.error("Error creating CSV backup:", error);
        cleanupFile(filePath);
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

async function generateQRCode(req, res) {
    const PDFDocument = require("pdfkit");
    const qr = require("qrcode");
    try {
        const assets = req.body.assets;
        const doc = new PDFDocument({
            size: [50 * 2.83465, 25 * 2.83465], // 50mm x 25mm
            margins: { top: 0, left: 0, right: 0, bottom: 0 },
        });

        const buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `inline; filename="qrcodes_${Date.now()}.pdf"`
            );
            res.send(pdfData);
        });

        for (let i = 0; i < assets.length; i++) {
            const asset = assets[i];

            const qrText = `Asset ID: ${asset.asset_id}\nAsset Type: ${
                asset.type
            }\nModel No: ${asset.model_no}\nSerial No: ${asset.serial}${
                asset.exp_date
                    ? `\nExp Date: ${formatDate(new Date(asset.exp_date))}`
                    : ""
            }`;

            // Generate QR code as data URL
            const qrUrl = await qr.toDataURL(qrText, { margin: 0, width: 120 });

            // If not the first label, add a new page
            if (i > 0) doc.addPage();

            // Draw QR code
            doc.image(qrUrl, 5, 5, { width: 50, height: 50 });

            const imgPath =
                env == "production"
                    ? path.join(__dirname, "templates", "logo.png")
                    : path.join(__dirname, "../templates/logo.png");
            doc.image(imgPath, 141.73 - 55, 5, { width: 50, height: 50 });

            // Draw asset text
            doc.font("Helvetica-Bold")
                .fontSize(8)
                .text(`${asset.asset_id}`, 0, 62, {
                    width: 50 * 2.83465,
                    height: 10,
                    align: "center",
                });
        }

        doc.end();
    } catch (error) {
        console.error("Unexpected error:", error);
        res.status(500).json({
            error: "Unexpected server error while generating QR PDF",
        });
    }
}

async function getAllAssets(req, res) {
    const { tenantId } = req.user;
    const assetTable = `assets_${tenantId}`;
    const query = `
        SELECT 
            id,
            asset_id,
            type,
            model_no,
            serial,
            exp_date
        FROM ${assetTable} WHERE disposalDate IS NULL
    `;
    try {
        const [assets] = await pool.query(query);
        res.status(200).json(
            new ApiResponse(200, assets, "Active assets retrieved successfully")
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

async function getAssetTypes(req, res) {
    const { tenantId } = req.user;
    const assetTable = `assets_${tenantId}`;
    const query = `SELECT DISTINCT type FROM ${assetTable}`;
    try {
        let [rows] = await pool.query(query);
        if (rows.length === 0) {
            return res
                .status(299)
                .json(new ApiResponse(200, [], "No asset types found"));
        }
        const types = rows.map((row) => row.type);
        [rows] = await pool.query(
            `SELECT DISTINCT model_no FROM ${assetTable}`
        );
        const models = rows.map((row) => row.model_no);
        res.status(200).json(
            new ApiResponse(
                200,
                { types, models },
                "Asset types retrieved successfully"
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

function chageDateFormat(dateStr) {
    const [day, month, year] = dateStr.split("-");
    if (!day || !month || !year) return null;
    if (year.length !== 4) return dateStr;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

async function uploadAssetsCSV(req, res) {
    const { tenantId } = req.user;

    try {
        if (!req.file) {
            return res
                .status(400)
                .json(new ApiErrorResponce(400, {}, "No CSV file uploaded"));
        }

        // Parse CSV
        const csvDataRaw = await parseCSVFile(req.file.path);

        if (csvDataRaw.length < 2) {
            cleanupFile(req.file.path);
            return res
                .status(400)
                .json(new ApiErrorResponce(400, {}, "CSV file is empty"));
        }

        // Normalize headers
        const csvData = csvDataRaw.map((row) => {
            const normalized = {};
            for (const key in row) {
                const lowerKey = key.trim().toLowerCase();

                if (["asset_id", "assetid"].includes(lowerKey)) {
                    normalized.asset_id = row[key];
                } else if (
                    ["serial", "serial_no", "serialnumber"].includes(lowerKey)
                ) {
                    normalized.serial = row[key];
                } else if (["category", "Category"].includes(lowerKey)) {
                    normalized.type = row[key];
                } else if (["type", "Type"].includes(lowerKey)) {
                    normalized.asset_type = row[key];
                } else if (
                    ["model_no", "model", "modelnumber"].includes(lowerKey)
                ) {
                    normalized.model_no = row[key];
                } else if (["status", "Status"].includes(lowerKey)) {
                    normalized.status = row[key];
                } else if (["location", "Location"].includes(lowerKey)) {
                    normalized.location = row[key];
                } else if (
                    ["exp_date", "expiry_date", "expiration"].includes(lowerKey)
                ) {
                    normalized.exp_date = row[key];
                } else if (
                    ["pisDate", "Pis_date", "Pisdate", "pis_date"].includes(
                        lowerKey
                    )
                ) {
                    normalized.pisDate = row[key];
                } else if (["remarks", "Remarks"].includes(lowerKey)) {
                    normalized.remarks = row[key];
                } else if (
                    ["glAccount", "gl_account", "Glaccount"].includes(lowerKey)
                ) {
                    normalized.glAccount = row[key];
                } else if (
                    [
                        "assetCode",
                        "asset_code",
                        "Assetcode",
                        "us_asset_code",
                    ].includes(lowerKey)
                ) {
                    normalized.assetCode = row[key];
                } else if (
                    ["supplierName", "supplier_name", "Suppliername"].includes(
                        lowerKey
                    )
                ) {
                    normalized.supplierName = row[key];
                } else if (
                    [
                        "assetCriticality",
                        "asset_criticality",
                        "Assetcriticality",
                    ].includes(lowerKey)
                ) {
                    normalized.assetCriticality = row[key];
                } else if (
                    ["disposal_date", "disposalDate", "Disposaldate"].includes(
                        lowerKey
                    )
                ) {
                    normalized.disposal_date = row[key];
                } else if (
                    [
                        "disposal_method",
                        "disposalMethod",
                        "Disposalmethod",
                    ].includes(lowerKey)
                ) {
                    normalized.disposal_method = row[key];
                } else if (["sale_to", "saleTo", "Saleto"].includes(lowerKey)) {
                    normalized.sale_to = row[key];
                } else if (
                    ["donated_to", "donatedTo", "Donatedto"].includes(lowerKey)
                ) {
                    normalized.donated_to = row[key];
                } else if (
                    ["trash_to", "trashTo", "Trashto"].includes(lowerKey)
                ) {
                    normalized.trash_to = row[key];
                }
            }
            return normalized;
        });

        // Validate required headers
        const headers = Object.keys(csvData[0]);
        const requiredHeaders = ["asset_id", "type", "model_no", "asset_type"]; // serial removed
        const missingHeaders = requiredHeaders.filter(
            (header) => !headers.includes(header)
        );

        if (missingHeaders.length > 0) {
            cleanupFile(req.file.path);

            return res
                .status(400)
                .json(
                    new ApiErrorResponce(
                        400,
                        {},
                        `Missing required headers: ${missingHeaders.join(
                            ", "
                        )}. Required headers: ${requiredHeaders.join(", ")}`
                    )
                );
        }

        const assetTable = `assets_${tenantId}`;
        const validAssets = [];
        let duplicateCount = 0;
        const duplicates = [];
        let validationFailureCount = 0;
        const failed = [];

        for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i];
            // console.log("exp: ", row.exp_date);

            try {
                const assetId = row.asset_id?.trim();
                const serial = row.serial?.trim() || null;
                const type = row.type?.trim();
                const modelNo = row.model_no?.trim();
                const status = row.status?.toLowerCase().trim() || "active";
                const location = row.location?.trim() || null;
                const expDate = row.exp_date
                    ? chageDateFormat(row.exp_date)
                    : null;
                const pis_Date = row.pisDate
                    ? chageDateFormat(row.pisDate)
                    : null;
                const remarks = row.remarks?.trim() || null;
                const glAccount = row.glAccount?.trim() || null;
                const assetCode = row.assetCode?.trim() || null;
                const supplierName = row.supplierName?.trim() || null;
                const assetCriticality = row.assetCriticality?.trim() || null;
                let assetType = row.asset_type?.trim() || null;
                if (assetType) {
                    assetType = assetType.toLowerCase();
                    if (!["it", "admin"].includes(assetType)) {
                        assetType = null;
                    }
                }
                const disposalDate = row.disposal_date
                    ? chageDateFormat(row.disposal_date)
                    : null;
                const disposalMethod = row.disposal_method?.trim() || null;
                const saleTo = row.sale_to?.trim() || null;
                const donatedTo = row.donated_to?.trim() || null;
                const trashTo = row.trash_to?.trim() || null;
                const childAssetsStr = row.child_assets?.trim() || null;
                let childAssets = [];
                if (childAssetsStr) {
                    childAssets = childAssetsStr
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                }

                // Required field checks
                if (!assetId) {
                    validationFailureCount++;
                    failed.push({
                        row: i + 1,
                        error: "asset_id is required",
                    });
                    continue;
                }
                if (!type) {
                    validationFailureCount++;
                    failed.push({
                        row: i + 1,
                        error: "Category is required",
                    });
                    continue;
                }
                if (!modelNo) {
                    validationFailureCount++;
                    failed.push({
                        row: i + 1,
                        error: "model_no is required",
                    });
                    continue;
                }
                if (!assetType) {
                    validationFailureCount++;
                    failed.push({
                        row: i + 1,
                        error: "asset_type is required",
                    });
                    continue;
                }

                // Status validation
                if (status && !["active", "inactive"].includes(status)) {
                    validationFailureCount++;
                    failed.push({
                        row: i + 1,
                        error: "Invalid status. Allowed values are 'active' or 'inactive'",
                    });
                    continue;
                }

                if (!validateAssetId(assetId)) {
                    validationFailureCount++;
                    failed.push({
                        row: i + 1,
                        error: "Invalid asset_id format",
                    });
                    continue;
                }

                if (childAssets.length > 0) {
                    const invalidChildren = childAssets.filter(
                        (c) => !validateAssetId(c)
                    );
                    if (invalidChildren.length > 0) {
                        validationFailureCount++;
                        failed.push({
                            row: i + 1,
                            error: `Invalid Child Asset IDs format: ${invalidChildren.join(", ")}`,
                        });
                        continue;
                    }
                }

                // Duplicate check
                let checkQuery, params;
                if (serial) {
                    checkQuery = `SELECT id, asset_id, serial FROM ${assetTable} WHERE asset_id = ? OR serial = ?`;
                    params = [assetId, serial];
                } else {
                    checkQuery = `SELECT id, asset_id FROM ${assetTable} WHERE asset_id = ?`;
                    params = [assetId];
                }

                const [existing] = await pool.query(checkQuery, params);

                if (existing.length > 0) {
                    duplicateCount++;
                    if (existing[0].asset_id === assetId) {
                        duplicates.push({
                            row: i + 1,
                            error: `Duplicate asset_id: ${assetId}`,
                        });
                    } else if (serial && existing[0].serial === serial) {
                        duplicates.push({
                            row: i + 1,
                            error: `Duplicate serial: ${serial}`,
                        });
                    }
                    continue;
                }

                validAssets.push({
                    assetId,
                    serial,
                    type,
                    modelNo,
                    status,
                    location,
                    expDate,
                    remarks,
                    pis_Date,
                    glAccount,
                    assetCode,
                    supplierName,
                    assetCriticality,
                    assetType,
                    disposalDate,
                    disposalMethod,
                    saleTo,
                    donatedTo,
                    trashTo,
                    childAssets,
                    originalRowIndex: i + 1,
                });
            } catch (err) {
                validationFailureCount++;
                failed.push({
                    row: i + 1,
                    error: "Unexpected processing error",
                });
            }
        }

        // Insert valid rows
        let successfullyUploadedCount = 0;
        if (validAssets.length > 0) {
            const insertQuery = `
                INSERT INTO ${assetTable} 
                (asset_id, serial, type, model_no, status, location, exp_date, pis_date, remarks, gl_account, asset_code, supplier_name, asset_criticality, asset_type, disposalDate, diposalMethod, saleTo, donatedTo, trashTo, child_asset)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            for (let k = 0; k < validAssets.length; k++) {
                const asset = validAssets[k];
                const connection = await pool.getConnection();
                try {
                    await connection.beginTransaction();

                    const child_asset =
                        asset.childAssets && asset.childAssets.length > 0
                            ? 1
                            : 0;

                    const [insertResult] = await connection.query(insertQuery, [
                        asset.assetId,
                        asset.serial,
                        asset.type,
                        asset.modelNo,
                        asset.status,
                        asset.location,
                        asset.expDate,
                        asset.pis_Date,
                        asset.remarks,
                        asset.glAccount,
                        asset.assetCode,
                        asset.supplierName,
                        asset.assetCriticality,
                        asset.assetType,
                        asset.disposalDate,
                        asset.disposalMethod,
                        asset.saleTo,
                        asset.donatedTo,
                        asset.trashTo,
                        child_asset,
                    ]);

                    const newAssetId = insertResult.insertId;

                    if (child_asset === 1) {
                        const mappingTable = `child_assets_${tenantId}`;
                        const [childRows] = await connection.query(
                            `SELECT id, asset_id FROM ${assetTable} WHERE asset_id IN (?)`,
                            [asset.childAssets]
                        );
                        const foundIds = childRows.map((r) => r.id);
                        const foundAssetIds = childRows.map((r) => r.asset_id);

                        const missing = asset.childAssets.filter(
                            (c) => !foundAssetIds.includes(c)
                        );
                        if (missing.length > 0) {
                            throw new Error(
                                `Child assets not found in DB: ${missing.join(", ")}`
                            );
                        }

                        // Validation 1: child asset cannot already be a child of another asset
                        const [alreadyAssigned] = await connection.query(
                            `SELECT child_asset_id FROM ${mappingTable} WHERE child_asset_id IN (?) AND remove_at IS NULL`,
                            [foundIds]
                        );
                        if (alreadyAssigned.length > 0) {
                            throw new Error(
                                "One or more child assets are already assigned to another asset"
                            );
                        }

                        // Validation 2: child asset cannot have its own child assets
                        const [hasChildren] = await connection.query(
                            `SELECT asset_id FROM ${mappingTable} WHERE asset_id IN (?) AND remove_at IS NULL`,
                            [foundIds]
                        );
                        if (hasChildren.length > 0) {
                            throw new Error(
                                "An asset that already has child assets cannot be added as a child asset"
                            );
                        }

                        // Validation 3: circular dependency check (cannot be its own child, though handled implicitly by 'missing' or 'alreadyAssigned' and we just check against self)
                        if (foundIds.includes(newAssetId)) {
                            throw new Error(
                                "An asset cannot be added as its own child asset"
                            );
                        }

                        // Insert mappings
                        const childAssetQueries = foundIds.map((childId) => [
                            newAssetId,
                            childId,
                            getISTString(),
                        ]);
                        const childQuery = `INSERT INTO ${mappingTable} (asset_id, child_asset_id, created_at) VALUES ?`;
                        await connection.query(childQuery, [childAssetQueries]);
                    }

                    await connection.commit();
                    successfullyUploadedCount++;
                } catch (err) {
                    await connection.rollback();
                    console.log("Error inserting row:", err.message);

                    validationFailureCount++;
                    failed.push({
                        row: asset.originalRowIndex,
                        error: err.message || "Failed to insert asset",
                    });
                } finally {
                    connection.release();
                }
            }
        }

        cleanupFile(req.file.path);

        const response = {
            totalRows: csvData.length,
            uploadedCount: successfullyUploadedCount,
            duplicateCount,
            validationFailureCount,
            duplicates,
            failed,
        };

        res.status(200).json(
            new ApiResponse(
                200,
                response,
                successfullyUploadedCount > 0
                    ? `Successfully uploaded ${successfullyUploadedCount} assets`
                    : "No valid assets found in CSV file"
            )
        );
    } catch (error) {
        if (req.file) cleanupFile(req.file.path);
        res.status(500).json(
            new ApiErrorResponce(
                500,
                {},
                error.message || "Internal server error"
            )
        );
    }
}

async function getSampleCSV(req, res) {
    const sampleCSV = [
        {
            asset_id: "VRCM/XX/XX-001",
            serial: "76Z9V53",
            category: "Laptop",
            model_no: "Dell 16 Premium",
            status: "active",
            location: "Kolkata",
            exp_date: "31-12-2025",
            disposal_date: "",
            disposal_method: "",
            sale_to: "",
            donated_to: "",
            trash_to: "",
            pis_date: "16-12-2025",
            gl_account: "23435343224",
            us_asset_code: "29009",
            supplier_name: "ABC Supplier",
            asset_criticality: "  ",
            type: "it",
            remarks: "New asset",
            child_assets: "VRCM/XX/XX-002, VRCM/XX/XX-003",
        },
        {
            asset_id: "VRCM/XX/XX-002",
            serial: "D45E6F5",
            category: "Monitor",
            model_no: "LG-27UL500",
            status: "inactive",
            location: "Mumbai",
            exp_date: "30-06-2024",
            disposal_date: "",
            disposal_method: "",
            sale_to: "",
            donated_to: "",
            trash_to: "",
            pis_date: "15-12-2025",
            gl_account: "23435343824",
            us_asset_code: "29007",
            supplier_name: "ABC Supplier",
            asset_criticality: "",
            type: "admin",
            remarks: "Old asset",
        },
    ];

    const uploadsDir =
        env == "production"
            ? path.join(__dirname, "uploads", "sample")
            : path.join(__dirname, "../uploads/sample");
    const filename = "sample_assets.csv";
    const filePath = path.join(uploadsDir, filename);

    try {
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // If file already exists, send it directly
        if (fs.existsSync(filePath)) {
            return res.download(filePath, filename, (err) => {
                if (err) {
                    return res
                        .status(500)
                        .json(
                            new ApiErrorResponce(
                                500,
                                {},
                                "Error sending sample CSV file"
                            )
                        );
                }
            });
        }

        // File doesn't exist — create it
        const ws = fs.createWriteStream(filePath);
        const csvStream = format({ headers: true });
        csvStream.pipe(ws);

        sampleCSV.forEach((row) => csvStream.write(row));
        csvStream.end();

        ws.on("finish", () => {
            return res.download(filePath, filename, (err) => {
                if (err) {
                    return res
                        .status(500)
                        .json(
                            new ApiErrorResponce(
                                500,
                                {},
                                "Error sending sample CSV file"
                            )
                        );
                }
            });
        });

        ws.on("error", (err) => {
            // Remove partially created file on error
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            return res
                .status(500)
                .json(
                    new ApiErrorResponce(
                        500,
                        {},
                        "Error writing sample CSV file"
                    )
                );
        });
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

async function getExpiringAssets(req, res) {
    const { tenantId } = req.user;
    const assetTable = `assets_${tenantId}`;

    try {
        // const [rows] = await pool.query(
        //   `SELECT * FROM ${assetTable} WHERE DATE(exp_date) = CURDATE()`
        // );
        const [assets] = await pool.query(
            `SELECT * FROM assets_a1b2c3d4 
                WHERE exp_date BETWEEN CURDATE() AND CURDATE() + INTERVAL ? DAY;`,
            [daysBefore]
        );
        let temp = [];
        if (assets.length > 0) {
            for (const asset of assets) {
                temp.push(asset.asset_id);
                console.log("Array of expiring asset id : ", temp);
            }
        }
        // if(assets.length>0){
        //     for(const asset of assets){
        //         const message = `Asset ${asset.asset_id} (${asset.type}, ${asset.model_no}) will expire in ${daysBefore} days.`;
        //     }
        // }
        else {
            console.log(`No asset expiring in ${daysBefore} days`);
            return;
        }
        let joinedString = temp.join(",");
        console.log("joined string of asset IDs:", joinedString);
        // return res.status(200).json(
        //   new ApiResponse(200, { expiredToday, expiredTomorrow }, "Expiring assets retrieved")
        // );
    } catch (error) {
        return res
            .status(500)
            .json(new ApiErrorResponce(500, {}, error.message));
    }
}

async function disposeAsset(req, res) {
    const { tenantId } = req.user;

    const {
        assetId,
        disposalDate,
        disposalMethod,
        saleTo,
        donatedTo,
        trashTo,
    } = req.body;

    try {
        if (!assetId || !disposalDate || !disposalMethod) {
            return res
                .status(400)
                .json(
                    new ApiErrorResponce(
                        400,
                        {},
                        "Asset ID, Disposal Date, and Method are required"
                    )
                );
        }

        const [tagged] = await pool.query(
            `SELECT COUNT(*) as count FROM taggings_${tenantId} WHERE asset_id = ?`,
            [assetId]
        );

        const [childAssets] = await pool.query(
            `SELECT COUNT(*) as count FROM child_assets_${tenantId} WHERE (asset_id = ? OR child_asset_id = ?) AND remove_at IS NULL`,
            [assetId, assetId]
        );

        if (childAssets[0].count > 0) {
            return res
                .status(400)
                .json(
                    new ApiErrorResponce(
                        400,
                        {},
                        "Asset is assigned as child asset or has child assets"
                    )
                );
        }

        if (tagged[0].count > 0) {
            return res
                .status(400)
                .json(new ApiErrorResponce(400, {}, "Asset is tagged"));
        }

        await pool.query(
            `UPDATE assets_${tenantId} 
            SET disposalDate = ?, diposalMethod = ?, saleTo = ?, donatedTo= ?, trashTo= ? WHERE id = ?`,
            [
                disposalDate,
                disposalMethod,
                saleTo || null,
                donatedTo || null,
                trashTo || null,
                assetId,
            ]
        );

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    assetId,
                    disposalDate,
                    disposalMethod,
                    saleTo: saleTo || null,
                    donatedTo: donatedTo || null,
                    trashTo: trashTo || null,
                },
                "Asset disposed successfully"
            )
        );
    } catch (error) {
        return res
            .status(500)
            .json(new ApiErrorResponce(500, {}, error.message));
    }
}

async function getDisposedAssets(req, res) {
    const { tenantId } = req.user;
    const assetTable = `assets_${tenantId}`;
    const taggingTable = `taggings_${tenantId}`;
    const employeeTable = `employees_${tenantId}`;

    const status = req.query?.status;
    const size = parseInt(req.query?.size) || 5;
    const page = parseInt(req.query?.page) || 1;
    const search = req.query?.search?.trim();
    const offset = (page - 1) * size;

    if (size < 1 || page < 1) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Invalid page or size"));
    }

    let whereClauses = ["a.disposalDate IS NOT NULL"];
    let dataParams = [];
    let countParams = [];

    // Build WHERE clause
    if (status && ["active", "inactive"].includes(status)) {
        whereClauses.push("a.status = ?");
        dataParams.push(status);
        countParams.push(status);
    }

    if (search) {
        const like = `%${search}%`;
        const searchClause = `(a.asset_id LIKE ? OR a.type LIKE ? OR a.model_no LIKE ? OR a.serial LIKE ?)`;
        whereClauses.push(searchClause);
        dataParams.push(like, like, like, like);
        countParams.push(like, like, like, like);
    }

    const whereSql = whereClauses.length
        ? `WHERE ${whereClauses.join(" AND ")}`
        : "";

    // Count query (no joins for performance)
    const countQuery = `
        SELECT COUNT(*) as count
        FROM ${assetTable} a
        ${whereSql}
    `;

    // Data query with LEFT JOINs
    const dataQuery = `
        SELECT 
            a.*,
            e.id as emp_id,
            e.emp_code,
            e.name,
            t.assigned_submission
        FROM ${assetTable} a
        LEFT JOIN ${taggingTable} t ON a.id = t.asset_id
        LEFT JOIN ${employeeTable} e ON t.employee_id = e.id
        ${whereSql}
        ORDER BY a.asset_id ASC
        LIMIT ? OFFSET ?
    `;

    try {
        // Execute count query
        const [countResult] = await pool.query(countQuery, countParams);
        const totalItems = countResult[0].count;
        const totalPages = Math.ceil(totalItems / size);

        if (page > totalPages && totalPages !== 0) {
            return res
                .status(404)
                .json(new ApiErrorResponce(404, {}, "Page not found"));
        }

        if (totalItems === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        items: [],
                        totalItems: 0,
                        totalPages: 0,
                        currentPage: 0,
                        pageSize: size,
                    },
                    "No disposed assets found"
                )
            );
        }

        // Execute data query
        const [assets] = await pool.query(dataQuery, [
            ...dataParams,
            size,
            offset,
        ]);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    items: assets,
                    totalItems,
                    totalPages,
                    currentPage: page,
                    pageSize: size,
                },
                "Disposed assets retrieved successfully"
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

async function createDisposedCSVBackup(req, res) {
    const { tenantId } = req.user;
    const type = req.query?.type || "all";
    const assetTable = `assets_${tenantId}`;
    const taggingTable = `taggings_${tenantId}`;
    const employeeTable = `employees_${tenantId}`;
    const query = `
        SELECT
            a.asset_id,
            a.serial,
            a.type,
            a.model_no,
            a.status,
            a.location,
            a.exp_date,
            a.disposalDate AS disposal_date,
            a.diposalMethod AS disposal_method,
            a.saleTo AS sale_to,
            a.donatedTo AS donated_to,
            a.trashTo AS trash_to,
            a.pis_date,
            a.gl_account,
            a.asset_code,
            a.supplier_name,
            a.asset_criticality,
            a.asset_type,
            a.remarks,
            e.name AS employee_name,
            e.emp_code AS employee_code,
            t.assigned_at,
            CASE WHEN t.id IS NOT NULL THEN 'tagged' ELSE 'detagged' END AS tag_status
        FROM ${assetTable} a
        LEFT JOIN ${taggingTable} t ON a.id = t.asset_id
        LEFT JOIN ${employeeTable} e ON t.employee_id = e.id
        WHERE a.disposalDate IS NOT NULL ${type == "all" ? "" : type == "it" ? "AND a.asset_type = 'it'" : "AND a.asset_type = 'admin'"}
    `;

    const uploadsDir =
        env == "production"
            ? path.join(__dirname, "uploads")
            : path.join(__dirname, "../uploads");
    const filename = `disposed_assets_${tenantId}_${Math.floor(Date.now() / 1000)}.csv`;
    const filePath = path.join(uploadsDir, filename);

    const headerMap = {
        type: "category",
        asset_type: "type",
        asset_code: "us_asset_code",
    };

    try {
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const [rows] = await pool.query(query);

        if (rows.length === 0) {
            return res
                .status(404)
                .json(new ApiErrorResponce(404, {}, "No assets found"));
        }

        const ws = fs.createWriteStream(filePath);
        const csvStream = format({ headers: true });
        csvStream.pipe(ws);

        rows.forEach((row) => {
            const formattedRow = {};
            Object.keys(row).forEach((key) => {
                const newHeader = headerMap[key] || key;
                let value = row[key];
                if (value instanceof Date) {
                    value = getSqlDate(value);
                }

                formattedRow[newHeader] = value;
            });

            csvStream.write(formattedRow);
        });

        csvStream.end();

        ws.on("finish", () => {
            return res.download(filePath, filename, (err) => {
                cleanupFile(filePath);
                if (err) {
                    console.error("Error sending file:", err);
                    if (!res.headersSent) {
                        res.status(500).json(
                            new ApiErrorResponce(
                                500,
                                {},
                                "Error sending CSV file for download"
                            )
                        );
                    }
                }
            });
        });

        ws.on("error", (err) => {
            console.error("Stream error:", err);
            cleanupFile(filePath);
            if (!res.headersSent) {
                res.status(500).json(
                    new ApiErrorResponce(500, {}, "File stream error")
                );
            }
        });
    } catch (error) {
        console.error("Error creating CSV backup:", error);
        cleanupFile(filePath);
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

async function assetAllocationHistory(req, res) {
    const size = parseInt(req.query?.size) || 5;
    const page = parseInt(req.query?.page) || 1;
    const search = req.query?.search?.trim();
    const offset = (page - 1) * size;

    const { tenantId } = req.user;
    const assetTable = `assets_${tenantId}`;
    const historyTable = `history_${tenantId}`;
    const employeeTable = `employees_${tenantId}`;

    try {
        let whereClause = "";
        let params = [];

        if (search) {
            whereClause = ` WHERE a.asset_id LIKE ? OR a.serial LIKE ? OR a.model_no LIKE ? OR e.emp_code LIKE ? OR e.name LIKE ?`;
            const searchVal = `%${search}%`;
            params = [searchVal, searchVal, searchVal, searchVal, searchVal];
        }

        const countQuery = `
            SELECT COUNT(*) as totalItems
            FROM ${historyTable} h
            JOIN ${assetTable} a ON a.id = h.asset_id
            JOIN ${employeeTable} e ON h.employee_id = e.id
            ${whereClause}`;

        const [countRows] = await pool.query(countQuery, params);
        const totalItems = countRows[0].totalItems;

        if (totalItems === 0) {
            return res
                .status(404)
                .json(new ApiErrorResponce(404, {}, "No records found"));
        }

        const dataQuery = `
            SELECT 
                a.asset_id, a.serial, a.model_no, a.status as asset_status,
                e.emp_code, e.name as emp_name, e.status as employee_status, 
                h.assigned_at, h.detagged_at 
            FROM ${historyTable} h
            JOIN ${assetTable} a ON a.id = h.asset_id
            JOIN ${employeeTable} e ON h.employee_id = e.id
            ${whereClause}
            ORDER BY h.assigned_at DESC
            LIMIT ? OFFSET ?`;

        const [rows] = await pool.query(dataQuery, [...params, size, offset]);

        const totalPages = Math.ceil(totalItems / size);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    items: rows,
                    totalItems,
                    totalPages,
                    currentPage: page,
                    pageSize: size,
                },
                "Asset history retrieved successfully"
            )
        );
    } catch (error) {
        console.error("Error retrieving asset allocation history:", error);
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
    addNewAsset,
    getAssets,
    getAllAssets,
    update,
    // getAssetById,
    createCSVBackup,
    generateQRCode,
    getAssetTypes,
    uploadAssetsCSV,
    getSampleCSV,
    getExpiringAssets,
    disposeAsset,
    getDisposedAssets,
    createDisposedCSVBackup,
    assetAllocationHistory,
};
