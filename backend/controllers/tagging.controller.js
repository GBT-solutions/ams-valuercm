const ApiErrorResponce = require("../utils/ApiErrorResponce");
const ApiResponse = require("../utils/ApiResponse");
const pool = require("../utils/dbConnect");
const { getISTString } = require("../utils/helperFunctions");

async function getTaggingDetails(req, res) {
    const { tenantId } = req.user;
    const { assetId, employeeCode } = req.body;

    if (!assetId && !employeeCode) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Asset ID or Employee Code is required"));
    }

    const assetTable = `assets_${tenantId}`;
    const employeeTable = `employees_${tenantId}`;
    const taggingTable = `taggings_${tenantId}`;

    try {
        // Fetch asset and employee IDs in parallel
        const [[assetRow], [employeeRow]] = await Promise.all([
            assetId
                ? pool.query(`SELECT * FROM ${assetTable} WHERE asset_id = ?`, [assetId])
                : [[], []],
            employeeCode
                ? pool.query(`SELECT * FROM ${employeeTable} WHERE emp_code = ?`, [employeeCode])
                : [[], []],
        ]);

        const asset = assetRow?.[0] ?? null;
        const employee = employeeRow?.[0] ?? null;

        if (assetId && !asset) {
            return res.status(404).json(new ApiErrorResponce(404, {}, "Asset not found"));
        }

        if (employeeCode && !employee) {
            return res.status(404).json(new ApiErrorResponce(404, {}, "Employee not found"));
        }

        // Build query for taggings dynamically
        const whereClauses = [];
        const params = [];

        if (asset) {
            whereClauses.push("asset_id = ?");
            params.push(asset.id);
        }
        if (employee) {
            whereClauses.push("employee_id = ?");
            params.push(employee.id);
        }

        let taggedRows = [];
        if (whereClauses.length > 0) {
            const [rows] = await pool.query(
                `SELECT * FROM ${taggingTable} WHERE ${whereClauses.join(" OR ")}`,
                params
            );
            taggedRows = rows;
        }

        if (taggedRows.length > 0) {
            const tagged = taggedRows[0];
            if (asset && tagged.asset_id === asset.id) {
                return res
                    .status(400)
                    .json(new ApiErrorResponce(400, {}, "Asset is already tagged to an employee"));
            } else if (employee && tagged.employee_id === employee.id) {
                return res
                    .status(400)
                    .json(new ApiErrorResponce(400, {}, "Employee is already tagged to an asset"));
            } else {
                return res
                    .status(400)
                    .json(new ApiErrorResponce(400, {}, "Asset or Employee already tagged"));
            }
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    asset,
                    employee,
                },
                "Asset and Employee details fetched successfully"
            )
        );
    } catch (error) {
        console.error("Error fetching tagging details:", error);
        return res
            .status(500)
            .json(new ApiErrorResponce(500, {}, error.message || "Internal server error"));
    }
}

async function addTagging(req, res) {
    const { tenantId } = req.user;
    const tableName = `taggings_${tenantId}`;
    const { assetId, employeeId, assignedAt, assignedSubmission, remarks } = req.body;
    const query1 = `SELECT * FROM ${tableName} WHERE asset_id = ? OR employee_id = ?;`;
    try {
        const [rows] = await pool.query(query1, [assetId, employeeId]);
        if (rows.length > 0) {
            return res
                .status(409)
                .json(new ApiErrorResponce(409, {}, "Asset or Employee already tagged"));
        }

        const query2 = `INSERT INTO ${tableName} (asset_id, employee_id, assigned_at, assigned_submission) VALUES (?, ?, ?, ?);`;
        const [result] = await pool.query(query2, [
            assetId,
            employeeId,
            assignedAt,
            assignedSubmission ? assignedSubmission : null,
        ]);
        if (remarks) {
            const query3 = `UPDATE assets_${tenantId} SET remarks = ? WHERE id = ?;`;
            await pool.query(query3, [remarks, assetId]);
        }
        res.status(201).json(
            new ApiResponse(201, { id: result.insertId }, "Tagging created successfully")
        );
    } catch (error) {
        console.error("Error creating tagging:", error);
        res.status(500).json(new ApiErrorResponce(500, {}, "Internal server error"));
    }
}

async function removeTagging(req, res) {
    const { tenantId } = req.user;
    const tableName = `taggings_${tenantId}`;
    const { assetId, employeeId } = req.body;

    if (!assetId || !employeeId) {
        return res
            .status(400)
            .json(new ApiErrorResponce(400, {}, "Asset ID and Employee ID are required"));
    }

    try {
        const [check] = await pool.query(
            `SELECT * FROM ${tableName} WHERE asset_id = ? AND employee_id = ?;`,
            [assetId, employeeId]
        );
        if (check.length === 0) {
            return res.status(404).json(new ApiErrorResponce(404, {}, "Tagging not found"));
        }
        await pool.query(`DELETE FROM ${tableName} WHERE asset_id = ? AND employee_id = ?;`, [
            assetId,
            employeeId,
        ]);
        await pool.query(
            `INSERT INTO history_${tenantId} (asset_id, employee_id, assigned_at, detagged_at) VALUES (?, ?, ?, ?);`,
            [
                assetId,
                employeeId,
                getISTString(new Date(check[0].assigned_at)),
                getISTString(new Date()),
            ]
        );
        res.status(200).json(new ApiResponse(200, {}, "Tagging removed successfully"));
    } catch (error) {
        console.log("Error removing tagging:", error);

        res.status(500).json(new ApiErrorResponce(500, {}, "Internal server error"));
    }
}

async function getTaggingList(req, res) {
    const { tenantId } = req.user;
    const tableName = `taggings_${tenantId}`;
    const employeeTable = `employees_${tenantId}`;
    const assetTable = `assets_${tenantId}`;
    const size = parseInt(req.query?.size) || 10;
    const page = parseInt(req.query?.page) || 1;
    const offset = (page - 1) * size;

    const query = `
        SELECT t.*, e.*, a.*, e.id AS employee_id, a.id AS asset_uid
        FROM ${tableName} t
        JOIN ${employeeTable} e ON t.employee_id = e.id
        JOIN ${assetTable} a ON t.asset_id = a.id
        LIMIT ? OFFSET ?;
    `;

    try {
        const totalQuery = `SELECT COUNT(*) AS total FROM ${tableName};`;
        const [totalRows] = await pool.query(totalQuery);

        if (totalRows[0].total === 0) {
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
                    "No tagging details found"
                )
            );
        }
        const [rows] = await pool.query(query, [size, offset]);
        const totalItems = totalRows[0].total;
        const totalPages = Math.ceil(totalItems / size);
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    items: rows,
                    totalItems: totalItems,
                    totalPages: totalPages,
                    currentPage: page,
                    pageSize: size,
                },
                "Tagging details fetched successfully"
            )
        );
    } catch (error) {
        console.error("Error fetching tagging details:", error);
        res.status(500).json(new ApiErrorResponce(500, {}, "Internal server error"));
    }
}

module.exports = {
    getTaggingDetails,
    addTagging,
    removeTagging,
    getTaggingList,
};
