const path = require("path");
const fs = require("fs");

const ApiErrorResponce = require("../utils/ApiErrorResponce");
const ApiResponse = require("../utils/ApiResponse");
const pool = require("../utils//dbConnect");
const { validateEmployeeCode, validateStatus } = require("../utils/helperFunctions");
const { parseCSVFile, cleanupFile } = require("../utils/csvUpload");
const { format } = require("@fast-csv/format");
const env = process.env.NODE_ENV || "development";

async function addEmployee(req, res) {
    const { tenantId } = req.user;
    let { emp_code, name, status } = req.body;
    if (!emp_code || !name) {
        return res.status(400).json(new ApiErrorResponce(400, {}, "All fields are required"));
    }
    if (!validateEmployeeCode(emp_code)) {
        return res.status(400).json(new ApiErrorResponce(400, {}, "Invalid employee code format"));
    }
    const employeeTable = `employees_${tenantId}`;
    const query = `INSERT INTO ${employeeTable} (emp_code, name, status) VALUES (?, ?, ?)`;
    try {
        if (!status) {
            status = "active";
        }
        const [result] = await pool.query(query, [emp_code, name, status]);
        res.status(201).json(
            new ApiResponse(
                201,
                { emp_code, name, status, id: result.insertId },
                "Employee added successfully"
            )
        );
    } catch (error) {
        return res
            .status(500)
            .json(new ApiErrorResponce(500, {}, error.message || "Internal server error"));
    }
}

async function updateEmployee(req, res) {
    const { tenantId } = req.user;
    const { id } = req.params;
    let { emp_code, name, status } = req.body;

    if (!emp_code || !name) {
        return res.status(400).json(new ApiErrorResponce(400, {}, "All fields are required"));
    }

    if (status && status == "inactive") {
        try {
            const [tags] = await pool.query(
                `SELECT id FROM taggings_${tenantId} WHERE employee_id = ?`,
                [id]
            );
            if (tags.length > 0) {
                return res
                    .status(400)
                    .json(
                        new ApiErrorResponce(400, {}, "Employee is currently tagged to an asset.")
                    );
            }
        } catch (error) {
            return res.status(500).json(new ApiErrorResponce(500, {}, "Internal server error"));
        }
    }

    const employeeTable = `employees_${tenantId}`;
    const query = `UPDATE ${employeeTable} SET emp_code = ?, name = ?, status = ? WHERE id = ?`;

    try {
        if (!status) {
            status = "active";
        }
        const [result] = await pool.query(query, [emp_code, name, status, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json(new ApiErrorResponce(404, {}, "Employee not found"));
        }
        res.status(200).json(
            new ApiResponse(200, { emp_code, name, status }, "Employee updated successfully")
        );
    } catch (error) {
        return res.status(500).json(new ApiErrorResponce(500, {}, "Internal server error"));
    }
}

async function uploadEmployeesCSV(req, res) {
    const { tenantId } = req.user;

    try {
        if (!req.file) {
            return res.status(400).json(new ApiErrorResponce(400, {}, "No CSV file uploaded"));
        }

        // Parse CSV
        const csvDataRaw = await parseCSVFile(req.file.path);

        if (csvDataRaw.length === 0) {
            cleanupFile(req.file.path);
            return res.status(400).json(new ApiErrorResponce(400, {}, "CSV file is empty"));
        }

        // Normalize headers: support empcode or emp_code
        const csvData = csvDataRaw.map((row) => {
            const normalized = {};
            for (const key in row) {
                const lowerKey = key.trim().toLowerCase();
                if (["empcode", "emp_code"].includes(lowerKey)) {
                    normalized.empcode = row[key];
                } else if (["empname", "emp_name", "name"].includes(lowerKey)) {
                    normalized.empname = row[key];
                } else if (lowerKey === "status") {
                    normalized.status = row[key];
                }
            }
            return normalized;
        });

        // Validate required headers
        const headers = Object.keys(csvData[0]);
        const requiredHeaders = ["empcode", "empname", "status"];
        const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));

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

        // Validate and process each row
        const employeeTable = `employees_${tenantId}`;
        const validEmployees = [];
        let duplicateCount = 0;
        const duplicates = [];
        let validationFailureCount = 0;
        const failed = [];

        for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i];

            try {
                const empCode = row.empcode?.toUpperCase().trim();
                const empName = row.empname?.trim();
                const status = row.status?.toLowerCase().trim() || "active";

                if (!empCode || !empName) {
                    validationFailureCount++;
                    failed.push({
                        row: i + 1,
                        error: "emp_code and emp_name are required",
                    });
                    continue;
                }

                if (!validateEmployeeCode(empCode)) {
                    validationFailureCount++;
                    failed.push({
                        row: i + 1,
                        error: "Invalid emp_code format",
                    });
                    continue;
                }

                if (!validateStatus(status)) {
                    validationFailureCount++;
                    failed.push({
                        row: i + 1,
                        error: "Invalid status. Allowed values are 'active' or 'inactive'",
                    });
                    continue;
                }

                const checkQuery = `SELECT id FROM ${employeeTable} WHERE emp_code = ?`;
                const [existing] = await pool.query(checkQuery, [empCode]);

                if (existing.length > 0) {
                    duplicateCount++;
                    duplicates.push(i + 1);
                    continue;
                }

                validEmployees.push({ empCode, empName, status });
            } catch {
                validationFailureCount++;
            }
        }

        // Insert valid rows
        if (validEmployees.length > 0) {
            const insertQuery = `INSERT INTO ${employeeTable} (emp_code, name, status) VALUES (?, ?, ?)`;

            for (const emp of validEmployees) {
                try {
                    await pool.query(insertQuery, [emp.empCode, emp.empName, emp.status]);
                } catch {
                    const idx = validEmployees.indexOf(emp);
                    if (idx > -1) validEmployees.splice(idx, 1);
                }
            }
        }

        cleanupFile(req.file.path);

        const response = {
            totalRows: csvData.length,
            uploadedCount: validEmployees.length,
            duplicateCount,
            validationFailureCount,
            duplicates,
            failed,
        };

        res.status(200).json(
            new ApiResponse(
                200,
                response,
                validEmployees.length > 0
                    ? `Successfully uploaded ${validEmployees.length} employees`
                    : "No valid employees found in CSV file"
            )
        );
    } catch (error) {
        if (req.file) cleanupFile(req.file.path);
        res.status(500).json(
            new ApiErrorResponce(500, {}, error.message || "Internal server error")
        );
    }
}

async function getEmployees(req, res) {
    const { tenantId } = req.user;
    let page = 1,
        size = 5,
        search;
    if (req.query) {
        page = parseInt(req.query.page || page);
        size = parseInt(req.query.size || size);
        search = req.query.search;
    }

    const employeeTable = `employees_${tenantId}`;
    try {
        // Get total count
        let query1, values;
        if (search) {
            query1 = `SELECT COUNT(*) as count FROM ${employeeTable} WHERE emp_code LIKE ? OR name LIKE ? OR status LIKE ?`;
            values = [`%${search}%`, `%${search}%`, `%${search}%`];
        } else {
            query1 = `SELECT COUNT(*) as count FROM ${employeeTable}`;
            values = [];
        }
        const [countRows] = await pool.query(query1, values);
        const totalItems = countRows[0].count;
        const totalPages = Math.ceil(totalItems / size);

        // Get paginated rows
        const offset = (page - 1) * size;
        let query2, values2;
        if (search) {
            query2 = `SELECT * FROM ${employeeTable}
                      WHERE emp_code LIKE ? OR name LIKE ? OR status LIKE ?
                      ORDER BY emp_code ASC
                      LIMIT ? OFFSET ?
            `;
            values2 = [`%${search}%`, `%${search}%`, `%${search}%`, size, offset];
        } else {
            query2 = `SELECT * FROM ${employeeTable} ORDER BY emp_code ASC LIMIT ? OFFSET ?`;
            values2 = [size, offset];
        }
        const [rows] = await pool.query(query2, values2);

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    items: rows,
                    totalItems,
                    totalPages,
                    currentPage: page,
                    pageSize: size,
                },
                "Employees fetched successfully"
            )
        );
    } catch (error) {
        console.log(error);

        return res
            .status(500)
            .json(new ApiErrorResponce(500, {}, error.message || "Internal server error"));
    }
}

async function createCSVBackup(req, res) {
    const { tenantId } = req.user;
    const employeeTable = `employees_${tenantId}`;
    const query = `SELECT * FROM ${employeeTable}`;
    const uploadsDir =
        env == "production" ? path.join(__dirname, "uploads") : path.join(__dirname, "../uploads");
    const filename = `employees_${tenantId}_${Math.floor(Date.now() / 1000)}.csv`;
    const filePath = path.join(uploadsDir, filename);
    try {
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const [rows] = await pool.query(query);
        if (rows.length === 0) {
            return res.status(404).json(new ApiErrorResponce(404, {}, "No employees found"));
        }
        const ws = fs.createWriteStream(filePath);
        const csvStream = format({ headers: true });
        csvStream.pipe(ws);
        rows.forEach((row) => csvStream.write(row));
        csvStream.end();
        ws.on("finish", () => {
            return res.download(filePath, filename, (err) => {
                if (err) {
                    cleanupFile(filePath);
                    return res
                        .status(500)
                        .json(new ApiErrorResponce(500, {}, "Error sending CSV file for download"));
                } else {
                    cleanupFile(filePath);
                }
            });
        });
    } catch (error) {
        return res
            .status(500)
            .json(new ApiErrorResponce(500, {}, error.message || "Internal server error"));
    }
}

async function getAllUntaggedEmployees(req, res) {
    const { tenantId } = req.user;
    const employeeTable = `employees_${tenantId}`;
    const query = `
            SELECT emp_code, name 
            FROM ${employeeTable}
            WHERE status = 'active'
            ORDER BY emp_code ASC
        `;
    try {
        const [rows] = await pool.query(query);
        if (rows.length === 0) {
            return res.status(404).json(new ApiErrorResponce(404, {}, "No employees found"));
        }
        res.status(200).json(new ApiResponse(200, rows, "Employees fetched successfully"));
    } catch (error) {
        console.error(error);
        return res
            .status(500)
            .json(new ApiErrorResponce(500, {}, error.message || "Internal server error"));
    }
}

async function getSampleCSV(req, res) {
    const sampleCSV = [
        { emp_code: "VK0000001", name: "Employee One", status: "active" },
        { emp_code: "VK0000002", name: "Employee Two", status: "inactive" },
        { emp_code: "VK0000003", name: "Employee Three", status: "active" },
    ];

    const uploadsDir =
        env == "production"
            ? path.join(__dirname, "uploads", "sample")
            : path.join(__dirname, "../uploads/sample");
    const filename = "sample_employees.csv";
    const filePath = path.join(uploadsDir, filename);

    try {
        // Ensure sample folder exists
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // If file already exists, just send it
        if (fs.existsSync(filePath)) {
            return res.download(filePath, filename, (err) => {
                if (err) {
                    return res
                        .status(500)
                        .json(new ApiErrorResponce(500, {}, "Error sending sample CSV file"));
                }
            });
        }

        // Create CSV file if not exists
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
                        .json(new ApiErrorResponce(500, {}, "Error sending sample CSV file"));
                }
            });
        });

        ws.on("error", () => {
            // Remove partially created file if error occurs
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            return res
                .status(500)
                .json(new ApiErrorResponce(500, {}, "Error writing sample CSV file"));
        });
    } catch (error) {
        return res
            .status(500)
            .json(new ApiErrorResponce(500, {}, error.message || "Internal server error"));
    }
}

module.exports = {
    addEmployee,
    updateEmployee,
    uploadEmployeesCSV,
    getEmployees,
    createCSVBackup,
    getAllUntaggedEmployees,
    getSampleCSV,
};
