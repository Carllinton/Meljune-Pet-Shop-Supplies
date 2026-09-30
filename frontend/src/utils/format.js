// Format a number as Philippine peso, e.g. 1234.5 -> "₱1,234.50"
export function formatPeso(value) {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

// Pull the backend's { message } out of an axios error, with a fallback
export function getErrorMessage(error, fallback = "Something went wrong.") {
    return error?.response?.data?.message || fallback;
}

// MySQL dates arrive as ISO strings; <input type="date"> needs YYYY-MM-DD
export function toDateInput(value) {
    return value ? String(value).slice(0, 10) : "";
}

// "2026-09-30T10:15:00.000Z" -> "Sep 30, 2026"
export function formatDate(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}
