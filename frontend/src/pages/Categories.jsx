import ResourcePage from "../components/ResourcePage";
import { formatDate } from "../utils/format";

const columns = [
    {
        key: "name",
        label: "Category",
        render: (c) => (
            <>
                <span className="color-swatch" style={{ background: c.color || "#4CAF50" }} />
                <strong>{c.name}</strong>
            </>
        ),
    },
    { key: "description", label: "Description" },
    { key: "icon", label: "Icon name" },
    { key: "created_at", label: "Created", render: (c) => formatDate(c.created_at) },
];

const fields = [
    { name: "name", label: "Name", required: true, full: true },
    { name: "description", label: "Description", type: "textarea", full: true },
    {
        name: "icon",
        label: "Icon name",
        hint: "Feather icon name carried over from the old system (e.g. dog, cat, bone).",
    },
    { name: "color", label: "Color", type: "color" },
];

function Categories() {
    return (
        <ResourcePage
            title="Categories"
            subtitle="Organize your products into groups"
            singular="Category"
            endpoint="/categories"
            columns={columns}
            fields={fields}
            searchKeys={["name", "description"]}
            searchPlaceholder="Search categories..."
            getEmptyForm={() => ({ name: "", description: "", icon: "tag", color: "#4CAF50" })}
            validate={(f) => (f.name.trim() ? "" : "Category name is required.")}
            toPayload={(f) => ({
                name: f.name.trim(),
                description: f.description.trim() || null,
                icon: f.icon.trim() || "tag",
                color: f.color || "#4CAF50",
            })}
            deleteMessage={(c) =>
                `Delete "${c.name}"? Categories that still have products can't be deleted.`
            }
        />
    );
}

export default Categories;
