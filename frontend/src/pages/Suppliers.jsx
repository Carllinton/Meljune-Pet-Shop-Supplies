import ResourcePage from "../components/ResourcePage";

const columns = [
    { key: "name", label: "Supplier", render: (s) => <strong>{s.name}</strong> },
    { key: "contact_person", label: "Contact person" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address" },
];

const fields = [
    { name: "name", label: "Supplier name", required: true, full: true },
    { name: "contact_person", label: "Contact person" },
    { name: "phone", label: "Phone" },
    { name: "email", label: "Email", type: "email", full: true },
    { name: "address", label: "Address", type: "textarea", full: true },
];

function Suppliers() {
    return (
        <ResourcePage
            title="Suppliers"
            subtitle="Who you buy your stock from"
            singular="Supplier"
            endpoint="/suppliers"
            columns={columns}
            fields={fields}
            searchKeys={["name", "contact_person", "phone", "email"]}
            searchPlaceholder="Search suppliers..."
            getEmptyForm={() => ({
                name: "",
                contact_person: "",
                phone: "",
                email: "",
                address: "",
            })}
            validate={(f) => {
                if (!f.name.trim()) return "Supplier name is required.";
                if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim()))
                    return "Enter a valid email address.";
                return "";
            }}
            toPayload={(f) => ({
                name: f.name.trim(),
                contact_person: f.contact_person.trim() || null,
                phone: f.phone.trim() || null,
                email: f.email.trim() || null,
                address: f.address.trim() || null,
            })}
            deleteMessage={(s) =>
                `Delete "${s.name}"? Their products will be kept, but will no longer have a supplier.`
            }
        />
    );
}

export default Suppliers;
