const pool = require("./dbConnect");

async function createAssetTable(tenantId) {
    const query = `
        CREATE TABLE IF NOT EXISTS \`assets_${tenantId}\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`asset_id\` VARCHAR(255) NOT NULL UNIQUE,
            \`serial\` VARCHAR(255) DEFAULT NULL UNIQUE,
            \`type\` VARCHAR(255) NOT NULL,
            \`model_no\` VARCHAR(255) DEFAULT NULL,
            \`status\` ENUM('active', 'inactive') DEFAULT 'active',
            \`location\` VARCHAR(255) DEFAULT NULL,
            \`remarks\` TEXT,
            \`exp_date\` DATETIME DEFAULT NULL,
            \`disposal_date\` DATETIME DEFAULT NULL,
            \`disposal_method\` VARCHAR(50) DEFAULT NULL,
            \`sale_to\` VARCHAR(255) DEFAULT NULL,
            \`donated_to\` VARCHAR(255) DEFAULT NULL,
            \`trash_to\` VARCHAR(255) DEFAULT NULL,
            \`pis_date\` DATETIME DEFAULT NULL,
            \`gl_account\` VARCHAR(50) DEFAULT NULL,
            \`asset_code\` VARCHAR(50) DEFAULT NULL,
            \`supplier_name\` VARCHAR(100) DEFAULT NULL,
            \`asset_criticality\` VARCHAR(255) DEFAULT NULL,
            \`asset_type\` ENUM('it', 'admin') DEFAULT 'admin',
            \`child_asset\` TINYINT(1) DEFAULT 0
        );
    `;
    try {
        await pool.query(query);
        console.log(`Asset table created for tenant ${tenantId}`);
    } catch (error) {
        console.error(
            `Error creating asset table for tenant ${tenantId}:`,
            error
        );
    }
}

async function createChildAssetTable(tenantId) {
    const query = `
        CREATE TABLE IF NOT EXISTS \`child_assets_${tenantId}\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`asset_id\` INT NOT NULL,
            \`child_asset_id\` INT NOT NULL,
            \`created_at\` DATETIME NOT NULL,
            \`removed_at\` DATETIME DEFAULT NULL,
            
            FOREIGN KEY (\`asset_id\`) REFERENCES \`assets_${tenantId}\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (\`child_asset_id\`) REFERENCES \`assets_${tenantId}\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        );
    `;
    try {
        await pool.query(query);
        console.log(`Child asset table created for tenant ${tenantId}`);
    } catch (error) {
        console.error(
            `Error creating child asset table for tenant ${tenantId}:`,
            error
        );
    }
}

async function createEmployeesTable(tenantId) {
    const query = `
        CREATE TABLE IF NOT EXISTS \`employees_${tenantId}\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`emp_code\` VARCHAR(255) NOT NULL UNIQUE,
            \`name\` VARCHAR(255) NOT NULL,
            \`status\` ENUM('active', 'inactive') DEFAULT 'active'
        );
    `;
    try {
        await pool.query(query);
        console.log(`Employees table created for tenant ${tenantId}`);
    } catch (error) {
        console.error(
            `Error creating employees table for tenant ${tenantId}:`,
            error
        );
    }
}

async function createConfigTable(tenantId) {
    const query = `
        CREATE TABLE IF NOT EXISTS \`config_${tenantId}\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`config_key\` VARCHAR(50) NOT NULL,
            \`value\` VARCHAR(250) NOT NULL
        );
    `;
    try {
        await pool.query(query);
        console.log(`Config table created for tenant ${tenantId}`);
    } catch (error) {
        console.error(
            `Error creating config table for tenant ${tenantId}:`,
            error
        );
    }
}

async function createHistoryTable(tenantId) {
    const query = `
        CREATE TABLE IF NOT EXISTS \`history_${tenantId}\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`asset_id\` INT NOT NULL,
            \`employee_id\` INT NOT NULL,
            \`assigned_at\` DATETIME DEFAULT NULL,
            \`detagged_at\` DATETIME DEFAULT NULL,
            
            FOREIGN KEY (\`asset_id\`) REFERENCES \`assets_${tenantId}\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (\`employee_id\`) REFERENCES \`employees_${tenantId}\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        );
    `;
    try {
        await pool.query(query);
        console.log(`History table created for tenant ${tenantId}`);
    } catch (error) {
        console.error(
            `Error creating history table for tenant ${tenantId}:`,
            error
        );
    }
}

async function createTaggingTable(tenantId) {
    const query = `
        CREATE TABLE IF NOT EXISTS \`taggings_${tenantId}\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`asset_id\` INT NOT NULL UNIQUE,
            \`employee_id\` INT NOT NULL UNIQUE,
            \`assigned_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`assigned_submission\` DATETIME DEFAULT NULL,
            
            FOREIGN KEY (\`asset_id\`) REFERENCES \`assets_${tenantId}\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (\`employee_id\`) REFERENCES \`employees_${tenantId}\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        );
    `;
    try {
        await pool.query(query);
        console.log(`Taggings table created for tenant ${tenantId}`);
    } catch (error) {
        console.error(
            `Error creating taggings table for tenant ${tenantId}:`,
            error
        );
    }
}

async function createTenant() {
    const query = `
        CREATE TABLE IF NOT EXISTS \`tenants\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`name\` VARCHAR(64) NOT NULL,
            \`tenant_id\` VARCHAR(64) NOT NULL UNIQUE
        );
    `;
    try {
        await pool.query(query);
        console.log(`Tenant table created`);
    } catch (error) {
        console.error(`Error creating tenant table:`, error);
    }
}

async function createUsersTable(tenantId) {
    const query = `
        CREATE TABLE IF NOT EXISTS \`users_${tenantId}\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`name\` VARCHAR(64) NOT NULL,
            \`display_username\` VARCHAR(64) NOT NULL UNIQUE,
            \`username\` VARCHAR(64) NOT NULL UNIQUE,
            \`password\` VARCHAR(128) NOT NULL,
            \`email\` VARCHAR(64) DEFAULT NULL,
            \`contact\` VARCHAR(15) DEFAULT NULL,
            \`role\` VARCHAR(15) DEFAULT NULL,
            \`session_id\` VARCHAR(255) DEFAULT NULL,
            \`token\` VARCHAR(32) DEFAULT NULL,
            \`token_exp\` DATETIME DEFAULT NULL
        );
    `;
    try {
        await pool.query(query);
        console.log(`Users table created for tenant ${tenantId}`);
    } catch (error) {
        console.error(
            `Error creating users table for tenant ${tenantId}:`,
            error
        );
    }
}

async function createBackupLogTable(tenantId) {
    const query = `
        CREATE TABLE IF NOT EXISTS \`backup_log_${tenantId}\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`file_name\` VARCHAR(255) NOT NULL,
            \`file_size\` BIGINT NOT NULL,
            \`location\` ENUM('db', 'server', 'local') NOT NULL,
            \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(query);
        console.log(`Backup log table created for tenant ${tenantId}`);
    } catch (error) {
        console.error(
            `Error creating backup log table for tenant ${tenantId}:`,
            error
        );
    }
}

async function createTenantTables(tenantId) {
    await createAssetTable(tenantId);
    await createChildAssetTable(tenantId);
    await createEmployeesTable(tenantId);
    await createConfigTable(tenantId);
    await createHistoryTable(tenantId);
    await createTaggingTable(tenantId);
    await createUsersTable(tenantId);
    await createBackupLogTable(tenantId);
}

module.exports = {
    createTenant,
    createTenantTables,
    createBackupLogTable,
};
