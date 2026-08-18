import { useEffect, useContext } from "react";
import { Outlet } from "react-router";
import Header from "./Header";
import { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import { navigateTo } from "../utils/navigate";
import { Context } from "../utils/Context";

const Layout = () => {
    const { setUser } = useContext(Context);
    useEffect(() => {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");
        if (token && user) {
            navigateTo("/dashboard");
            setUser(JSON.parse(user));
        } else {
            navigateTo("/");
            setUser(null);
        }
    }, []);
    return (
        <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-screen flex flex-col w-full"
        >
            <Header />
            <main className="flex-1 min-h-0">
                <Outlet />
            </main>
            <Toaster position="top-right" />
        </motion.div>
    );
};

export default Layout;
