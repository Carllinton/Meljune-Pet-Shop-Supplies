import { Navigate, Outlet } from "react-router-dom";
import { getUser } from "../services/auth";

function RoleRoute({ allowedRoles }) {
    const user = getUser();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}

export default RoleRoute;