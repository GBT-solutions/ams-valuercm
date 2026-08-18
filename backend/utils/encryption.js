const crypto = require("crypto");
const fs = require("fs");
require("dotenv").config();

const ALGORITHM = "aes-256-gcm";
const ALGORITHM_CBC = "aes-256-cbc";
const KEY_HEX = process.env.ENCRYPTION_KEY;

if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error(
        "ENCRYPTION_KEY must be a 64-character hex string (256-bit key)."
    );
}

const KEY = Buffer.from(KEY_HEX, "hex");

function encrypt(text) {
    if (typeof text !== "string") {
        text = String(text);
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}$${tag}$${encrypted}`;
}

function decrypt(ciphertext) {
    if (!ciphertext || typeof ciphertext !== "string") {
        throw new Error("Invalid ciphertext input.");
    }
    const parts = ciphertext.split("$");
    if (parts.length !== 3) {
        throw new Error(
            "Invalid ciphertext format. Expected iv$tag$encryptedText"
        );
    }
    const iv = Buffer.from(parts[0], "hex");
    const tag = Buffer.from(parts[1], "hex");
    const encryptedText = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

function encryptFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(ALGORITHM_CBC, KEY, iv);
            const input = fs.createReadStream(inputPath);
            const output = fs.createWriteStream(outputPath);
            output.write(iv);
            input.on("error", reject);
            output.on("error", reject);
            cipher.on("error", reject);
            output.on("finish", resolve);

            input.pipe(cipher).pipe(output);
        } catch (err) {
            reject(err);
        }
    });
}

function decryptFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            // Read first 100 bytes to check if it's the old GCM format (text with colons)
            const fd = fs.openSync(inputPath, "r");
            const buffer = Buffer.alloc(100);
            const bytesRead = fs.readSync(fd, buffer, 0, 100, 0);
            fs.closeSync(fd);

            const headerStr = buffer.toString("utf8", 0, bytesRead);
            if (/^[0-9a-fA-F$:\s]+$/.test(headerStr.slice(0, Math.min(bytesRead, 50)))) {
                // Legacy GCM Format
                const encryptedContent = fs.readFileSync(inputPath, "utf8");
                const decryptedContent = decrypt(encryptedContent);
                fs.writeFileSync(outputPath, decryptedContent, "utf8");
                resolve();
                return;
            }

            // Binary Stream Format
            if (bytesRead < 16) {
                reject(new Error("Invalid backup file: missing IV"));
                return;
            }
            const iv = Buffer.alloc(16);
            buffer.copy(iv, 0, 0, 16);

            const decipher = crypto.createDecipheriv(ALGORITHM_CBC, KEY, iv);
            const input = fs.createReadStream(inputPath, { start: 16 });
            const output = fs.createWriteStream(outputPath);

            input.on("error", reject);
            output.on("error", reject);
            decipher.on("error", reject);
            output.on("finish", resolve);

            input.pipe(decipher).pipe(output);
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    encrypt,
    decrypt,
    encryptFile,
    decryptFile,
};
