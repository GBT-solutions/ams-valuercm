const os = require("os");
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

function validateContact(contact) {
    const re = /^\d{10}$/;
    return re.test(String(contact));
}

function validateUsername(username) {
    const re = /^[a-z0-9_]{3,30}$/;
    return re.test(String(username));
}

function validateEmployeeCode(employeeCode) {
    const re = /^[A-Za-z]{2}[0-9]{4,7}$/;
    return re.test(String(employeeCode));
}

function validateSerialNumber(serialNumber) {
    const re = /^[a-zA-Z0-9]{2,}$/;
    return re.test(String(serialNumber));
}

function validateStatus(status) {
    const validStatuses = ["active", "inactive"];
    return validStatuses.includes(String(status).toLowerCase());
}

function validateAssetId(str) {
    const regex = /^VRCM\/[a-zA-Z]{2}\/[a-zA-Z]{2,4}-\d{3,}$/;
    return regex.test(str.toUpperCase());
}

function capitalizeWords(sentence) {
    if (!sentence || typeof sentence !== "string") {
        return "";
    }

    return sentence
        .split(" ")
        .map((word) => {
            if (word.length === 0) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");
}

function formatDate(date) {
    const options = {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    };
    const parts = new Intl.DateTimeFormat("en-GB", options)
        .formatToParts(date)
        .reduce((acc, part) => {
            if (part.type !== "literal") acc[part.type] = part.value;
            return acc;
        }, {});

    return `${parts.day}-${parts.month}-${parts.year}`;
}

function getISTString(systemDate = new Date()) {
    const options = {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    };

    const parts = new Intl.DateTimeFormat("en-GB", options)
        .formatToParts(systemDate)
        .reduce((acc, part) => {
            if (part.type !== "literal") acc[part.type] = part.value;
            return acc;
        }, {});

    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function getSqlDate(date = new Date()) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function getLocalIPv4() {
    const interfaces = os.networkInterfaces();
    for (const interfaceName in interfaces) {
        const networkInterface = interfaces[interfaceName];
        for (const net of networkInterface) {
            if (net.family === "IPv4" && !net.internal) {
                return net.address;
            }
        }
    }
    return "No local IPv4 address found";
}

module.exports = {
    validateEmail,
    validateContact,
    validateUsername,
    validateEmployeeCode,
    validateSerialNumber,
    validateStatus,
    validateAssetId,
    capitalizeWords,
    formatDate,
    getISTString,
    getSqlDate,
    getLocalIPv4,
};
