import { useEffect, useContext, useRef } from "react";
import Sidebar from "./Sidebar";
import { useLocation, useOutlet } from "react-router";
import { Context } from "../utils/Context";
import apiService from "../utils/apiService";
import { motion, AnimatePresence } from "framer-motion";

const FrozenRoute = ({ children }) => {
    const frozen = useRef(children);
    return frozen.current;
};

const HomeLayout = () => {
    const { user, setEmployees, setProducts, setLastBackup } =
        useContext(Context);
    const location = useLocation();
    const outlet = useOutlet();
    const fetchEmployees = async () => {
        try {
            let response = await apiService.get("/employees/all-untagged");
            let employee = response.data.map((emp) => {
                return {
                    label: `${emp.emp_code} - ${emp.name}`,
                    value: emp.emp_code,
                };
            });
            setEmployees(employee);
            if (user.role === "admin") {
                response = await apiService.get("/assets/types");
                setProducts(response.data);
            } else {
                setProducts([]);
            }

            response = await apiService.get("/config/last-backup");
            setLastBackup(response.data?.lastBackup);
        } catch (error) {
            console.log(error);
        }
    };
    useEffect(() => {
        if (user) {
            fetchEmployees();
        }
    }, [user]);
    return (
        <div className="h-full">
            <div className="flex flex-1 bottom-container">
                <Sidebar />
                <div className="flex-1 h-full bg-gray-100 p-4 overflow-y-scroll hide-scrollbar relative">
                    {/* <img
                        src="/icon.png"
                        className="absolute opacity-25 w-[500px] watermark"
                    /> */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.15, ease: "easeInOut" }}
                            className="w-full h-full flex flex-col"
                        >
                            <FrozenRoute>{outlet}</FrozenRoute>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default HomeLayout;
