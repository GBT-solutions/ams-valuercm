export function capitalizeWords(sentence) {
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

export function validateEmployeeCode(employeeCode) {
    const re = /^[A-Za-z]{2}[0-9]{4,7}$/;
    return re.test(String(employeeCode));
}

export function validateSerialNumber(serialNumber) {
    const re = /^[a-zA-Z0-9]{2,}$/;
    return re.test(String(serialNumber));
}

export function validateAssetId(str) {
    const regex = /^VRCM\/[a-zA-Z]{2}\/[a-zA-Z]{2,4}-?\d{3,}$/;
    return regex.test(str);
}

export function validateUsername(str) {
    const regex = /^(?=[a-z])[a-z0-9_]+$/;
    return regex.test(str);
}

export function validateStatus(status) {
    const validStatuses = ["active", "inactive"];
    return validStatuses.includes(String(status).toLowerCase());
}

export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

export function validateContact(contact) {
    const re = /^\d{10}$/;
    return re.test(String(contact));
}

export function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date)) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

export function formatDateTime(date) {
    if (!(date instanceof Date) || isNaN(date)) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    let hours = date.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const formattedHours = String(hours).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
}

export function getSqlDate(date) {
    if (!(date instanceof Date) || isNaN(date)) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function makeAvatarName(name) {
    if (!name) return "";
    const initials = name
        ?.split(" ")
        ?.map((word) => word.charAt(0).toUpperCase())
        ?.join("");
    return initials;
}

export function truncateString(str, length = 12) {
    if (!str || typeof str !== "string") {
        return "";
    }
    if (str.length > length) {
        return str.slice(0, length - 3) + "...";
    }
    return str;
}

export function isStrongPassword(password) {
  // At least 8 chars, one uppercase, one lowercase, one number, one special char
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongRegex.test(password);
}


