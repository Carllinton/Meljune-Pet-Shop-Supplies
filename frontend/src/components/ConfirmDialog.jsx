import Modal from "./Modal";

function ConfirmDialog({
    open,
    title = "Are you sure?",
    message,
    confirmLabel = "Confirm",
    loading = false,
    onConfirm,
    onCancel,
}) {
    return (
        <Modal open={open} title={title} onClose={onCancel} width={420}>
            <p className="confirm-message">{message}</p>

            <div className="modal-actions">
                <button
                    type="button"
                    className="secondary-button"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="danger-button"
                    onClick={onConfirm}
                    disabled={loading}
                >
                    {loading ? "Working..." : confirmLabel}
                </button>
            </div>
        </Modal>
    );
}

export default ConfirmDialog;
