import { useContext, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router";

import { setNavigate, setUserContext } from "./navigate";
import { Context } from "./Context";

import Layout from "../components/Layout";
import Signin from "../pages/Signin";
import Dashboard from "@/pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import HomeLayout from "../components/HomeLayout";
import AssetList from "../pages/AssetList";
import AddAsset from "../pages/AddAsset";
import AddEmployee from "../pages/AddEmployee";
import EmployeeList from "../pages/EmployeeList";
import AllocationList from "../pages/AllocationList";
import AddAllocation from "../pages/AddAllocation";
import QrCode from "../pages/QrCode";
import RoleSettings from "../pages/RoleSettings";
import ForgetPassword from "../pages/ResetPassword";
import Settings from "../pages/Settings";
import DisposedAssets from "../pages/DisposedAssets";
import AllocationHistory from "../pages/AllocationHistory";
import BackupLogs from "../pages/BackupLogs";

const Router = () => {
    const navigate = useNavigate();
    const { setUser } = useContext(Context);

    useEffect(() => {
        setNavigate(navigate);
    }, [navigate]);
    useEffect(() => {
        setUserContext(setUser);
    }, [setUser]);

    return (
        <Routes>
            <Route path="/" element={<Signin />} />
            <Route path="/reset-password/:token" element={<ForgetPassword />} />
            <Route path="/" element={<Layout />}>
                <Route element={<HomeLayout />}>
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/asset-list" element={<AssetList />} />
                    <Route path="/add-asset" element={<AddAsset />} />
                    <Route path="/employee-list" element={<EmployeeList />} />
                    <Route path="/add-employee" element={<AddEmployee />} />
                    <Route path="/allocation-list" element={<AllocationList />} />
                    <Route path="/add-allocation" element={<AddAllocation />} />
                    <Route path="/qr-code" element={<QrCode />} />
                    <Route path="/role-settings" element={<RoleSettings />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/disposed-assets" element={<DisposedAssets />} />
                    <Route path="/allocation-history" element={<AllocationHistory />} />
                    <Route path="/backup-logs" element={<BackupLogs />} />
                </Route>
            </Route>
        </Routes>
    );
};

export default Router;
