import ResourcePage from "../components/ResourcePage";
import api from "../services/api";
import { formatPeso, getErrorMessage } from "../utils/format";

// Same format the old PHP system used: CUS-YYYYMMDD-XXXXX
function generateCustomerCode() {
    const d = new Date();
    const ymd =
        d.getFullYear() +
        String(d.getMonth() + 1).padStart(2, "0") +
        String(d.getDate()).padStart(2, "0");
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, "0");
    return `CUS-${ymd}-${rand}`;
}

const columns = [
    { key: "customer_code", label: "Code" },
    { key: "name", label: "Customer", render: (c) => <strong>{c.name}</strong> },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "credit_limit", label: "Credit limit", render: (c) => formatPeso(c.credit_limit) },
    {
        key: "status",
        label: "Status",
        render: (c) => (
            <span
                className={
                    c.status === "active" ? "status active-status" : "status inactive-status"
                }
            >
                {c.status}
            </span>
        ),
    },
];

const fields = [
    { name: "customer_code", label: "Customer code", required: true, readOnlyOnEdit: true },
    { name: "name", label: "Full name", required: true },
    { name: "phone", label: "Phone" },
    {
        name: "credit_limit",
        label: "Credit limit (₱)",
        type: "number",
        min: "0",
        step: "0.01",
        hint: "Most utang this customer can owe. 0 means no credit allowed.",
    },
    { name: "address", label: "Address", type: "textarea", full: true },
    {
        name: "status",
        label: "Status",
        type: "select",
        options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
        ],
    },
];

// Deactivate / reactivate instead of deleting: deleting a customer also
// erases their credit (utang) history in the database.
const extraActions = [
    {
        label: (c) => (c.status === "active" ? "Deactivate" : "Activate"),
        className: "warn-button",
        onClick: async (c, { reload, setNotice, setError }) => {
            try {
                setError("");
                const next = c.status === "active" ? "inactive" : "active";

                await api.put(`/customers/${c.id}`, {
                    customer_code: c.customer_code,
                    name: c.name,
                    phone: c.phone,
                    address: c.address,
                    credit_limit: c.credit_limit,
                    status: next,
                });

                setNotice(`${c.name} is now ${next}.`);
                reload();
            } catch (err) {
                setNotice("");
                setError(getErrorMessage(err, "Failed to update customer status."));
            }
        },
    },
];

function Customers() {
    return (
        <ResourcePage
            title="Customers"
            subtitle="Regular customers and their credit limits"
            singular="Customer"
            endpoint="/customers"
            columns={columns}
            fields={fields}
            fetchDetail
            canDelete={false}
            extraActions={extraActions}
            searchKeys={["customer_code", "name", "phone"]}
            searchPlaceholder="Search by name, code or phone..."
            getEmptyForm={() => ({
                customer_code: generateCustomerCode(),
                name: "",
                phone: "",
                address: "",
                credit_limit: "0",
                status: "active",
            })}
            validate={(f) => {
                if (!f.customer_code.trim()) return "Customer code is required.";
                if (!f.name.trim()) return "Customer name is required.";
                if (f.credit_limit !== "" && Number(f.credit_limit) < 0)
                    return "Credit limit cannot be negative.";
                return "";
            }}
            toPayload={(f) => ({
                customer_code: f.customer_code.trim(),
                name: f.name.trim(),
                phone: f.phone.trim() || null,
                address: f.address.trim() || null,
                credit_limit: Number(f.credit_limit || 0),
                status: f.status,
            })}
        />
    );
}

export default Customers;
