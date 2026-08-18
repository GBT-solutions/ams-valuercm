import React, { useContext } from "react";
import { Navigate } from "react-router";
import { Context } from "./Context";

const ProtectedRoute = ({ children }) => {
    const { user } = useContext(Context);

    if (!user) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
