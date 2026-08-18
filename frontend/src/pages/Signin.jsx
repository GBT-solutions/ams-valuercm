import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";

import apiService from "@/utils/apiService";
import { Context } from "@/utils/Context";
import toaster from "../utils/toaster";
import { User, Lock, Mail, ArrowLeft, Sun, Moon } from "lucide-react";
import { Toaster } from "react-hot-toast";
import SpinnerButton from "../components/ui/spinner-button";
import { navigateTo } from "../utils/navigate";

const Signin = () => {
    const { user, setUser } = useContext(Context);
    const navigate = useNavigate();

    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("theme") || "light";
    });

    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    };

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

    const [isForgotPassword, setIsForgotPassword] = useState(false);

    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fp, setFp] = useState({ loading: false, disabled: false });

    useEffect(() => {
        if (user && !isSuccess) {
            navigate("/dashboard");
        }
    }, [user, navigate, isSuccess]);

    const [inputs, setInputs] = useState({
        username: "",
        password: "",
        tenantId: "a1b2c3d4",
        resetEmail: "",
    });

    const handleChange = (e) => {
        setInputs({ ...inputs, [e.target.id]: e.target.value });
    };

    const handleSignin = async () => {
        const url = "/users/signin";
        setIsLoading(true);
        // if (!isStrongPassword(password)) {
        //     const setError =
        //         "Password must be at least 8 characters, include uppercase, lowercase, number, and special character.";
        //     toaster("error", setError);
        //     return;
        // }
        try {
            const response = await apiService.post(url, inputs);
            if (response.success) {
                localStorage.setItem("token", response.data.user.token);
                localStorage.setItem("tenantId", inputs.tenantId);

                setIsSuccess(true);

                const userData = { ...response.data.user };
                delete userData.token;

                setTimeout(() => {
                    setUser(userData);
                    localStorage.setItem("user", JSON.stringify(userData));
                    navigate("/dashboard");
                }, 600);
            }
        } catch (error) {
            setIsLoading(false);
            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                "An error occurred during sign in.";
            toaster("error", errorMessage);
        }
    };

    const handleSendResetLink = async () => {
        if (!inputs.resetEmail) {
            toaster("error", "Please enter your email address.");
            return;
        }
        setFp({ loading: true, disabled: true });
        try {
            await apiService.post("/users/forgot-password", {
                email: inputs.resetEmail,
            });
            toaster("success", "Reset link sent to your email.");
            setFp({ loading: false, disabled: true });
        } catch (error) {
            const errMsg = error.response?.data?.message || error.message;
            toaster("error", errMsg);
            setFp({ loading: false, disabled: false });
        }
    };

    return (
        <div className="signin-page min-h-screen flex items-center justify-center bg-blue-50/50 dark:bg-background p-6 relative overflow-hidden transition-colors duration-300">
            {/* Theme Toggle Button */}
            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={toggleTheme}
                    className="p-2.5 rounded-full bg-white dark:bg-card border border-gray-200/80 dark:border-border text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center"
                    title={
                        theme === "light"
                            ? "Switch to Dark Mode"
                            : "Switch to Light Mode"
                    }
                >
                    {theme === "light" ? (
                        <Moon className="h-5 w-5 text-blue-900" />
                    ) : (
                        <Sun className="h-5 w-5 text-yellow-500" />
                    )}
                </button>
            </div>

            <img
                src="/login_asset_2.svg"
                className="absolute bottom-0 left-0 w-[300px] pointer-events-none"
                alt=""
            />
            <img
                src="/login_asset_1.svg"
                className="absolute top-0 right-0 w-[300px] pointer-events-none"
                alt=""
            />
            <img
                src="/box.svg"
                className="absolute top-10 left-10 w-[100px] opacity-30 -rotate-45 pointer-events-none"
                alt=""
            />
            <img
                src="/monitor.svg"
                className="absolute bottom-10 right-10 w-[100px] opacity-30 pointer-events-none "
                alt=""
            />

            <AnimatePresence>
                {!isSuccess && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="flex w-[70%] bg-white rounded-2xl shadow-2xl overflow-hidden min-h-[75vh] relative z-10 shadow-blue-300"
                    >
                        <div className="hidden md:flex w-1/2 bg-white relative items-center justify-center p-8">
                            <img
                                src="/login_left.svg"
                                alt="Security Illustration"
                                className="w-full max-w-[90%] object-contain mix-blend-multiply pointer-events-none"
                            />
                        </div>

                        <div className="w-full md:w-1/2 bg-[#005bea] p-8 flex flex-col justify-center text-white relative overflow-hidden">
                            <div className="absolute top-[-10%] right-[-10%] w-48 h-48 bg-blue-400 rounded-full opacity-40 blur-3xl pointer-events-none"></div>
                            <div className="absolute bottom-[-10%] left-[-10%] w-60 h-60 bg-blue-600 rounded-full opacity-40 blur-3xl pointer-events-none"></div>

                            <div className="relative z-10 w-full flex flex-col items-center">
                                <div className="flex flex-col items-center justify-center -mt-[2vh]">
                                    <img
                                        src="/logo_2.png"
                                        width={125}
                                        height={125}
                                        alt="Logo"
                                    />
                                    <p className="mt-4 text-[2vw] font-bold mb-0 tracking-tight">
                                        Asset Monitoring System
                                    </p>
                                </div>

                                <div className="w-full mt-5 relative min-h-[300px] flex items-start justify-center">
                                    <AnimatePresence mode="wait">
                                        {!isForgotPassword ? (
                                            <motion.div
                                                key="signin"
                                                initial={{ x: -50, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                exit={{ x: -50, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="w-full flex flex-col items-center"
                                            >
                                                <h2 className="text-2xl font-bold mb-10 tracking-tight text-center">
                                                    Welcome Back!
                                                </h2>
                                                <div className="space-y-5 flex flex-col items-center w-full">
                                                    <div className="relative group w-full max-w-sm sm:max-w-md flex items-center">
                                                        <div className="absolute left-4 z-10 flex items-center pointer-events-none">
                                                            <User className="h-5 w-5 text-blue-300 group-focus-within:text-blue-500 transition-colors" />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            id="username"
                                                            required
                                                            placeholder="Enter your username"
                                                            className="w-full pl-12 pr-4 py-3 rounded-full bg-white text-gray-800 placeholder-blue-300/70 font-medium focus:outline-none focus:ring-4 focus:ring-blue-400/50 shadow-sm transition-all text-sm sm:text-base"
                                                            value={
                                                                inputs.username
                                                            }
                                                            onChange={
                                                                handleChange
                                                            }
                                                        />
                                                    </div>

                                                    <div className="relative group w-full max-w-sm sm:max-w-md flex items-center">
                                                        <div className="absolute left-4 z-10 flex items-center pointer-events-none">
                                                            <Lock className="h-5 w-5 text-blue-300 group-focus-within:text-blue-500 transition-colors" />
                                                        </div>
                                                        <input
                                                            type="password"
                                                            placeholder="Enter your password"
                                                            id="password"
                                                            required
                                                            className="w-full pl-12 pr-4 py-3 rounded-full bg-white text-gray-800 placeholder-blue-300/70 font-medium focus:outline-none focus:ring-4 focus:ring-blue-400/50 shadow-sm transition-all text-sm sm:text-base"
                                                            value={
                                                                inputs.password
                                                            }
                                                            onChange={
                                                                handleChange
                                                            }
                                                            onKeyDown={(e) =>
                                                                e.key ===
                                                                    "Enter" &&
                                                                handleSignin()
                                                            }
                                                        />
                                                    </div>

                                                    <div className="w-full max-w-sm sm:max-w-md text-right pr-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setIsForgotPassword(
                                                                    true
                                                                )
                                                            }
                                                            className="text-sm text-blue-100 hover:text-white hover:underline transition-colors cursor-pointer"
                                                        >
                                                            Forgot Password?
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center justify-center gap-4 mt-6">
                                                        <SpinnerButton
                                                            type="button"
                                                            onClick={
                                                                handleSignin
                                                            }
                                                            loading={isLoading}
                                                            disabled={isLoading}
                                                            loadingText="Sign In..."
                                                            className="w-32 cursor-pointer bg-gradient-to-r from-[#3FAE2A] to-[#4CAF50] hover:bg-[#2be152] text-black font-bold py-3 px-6 rounded-full transition-all duration-300 shadow-[0_10px_20px_-10px_rgba(255,159,67,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(255,159,67,0.6)] hover:-translate-y-0.5 text-center text-sm md:text-base flex items-center justify-center"
                                                        >
                                                            Sign In
                                                        </SpinnerButton>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="forgot"
                                                initial={{ x: 50, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                exit={{ x: 50, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="w-full flex flex-col items-center my-[6px]"
                                            >
                                                <h2 className="text-2xl font-bold mb-4 tracking-tight text-center">
                                                    Reset Password
                                                </h2>
                                                <p className="text-blue-100 mb-8 text-center max-w-xs text-sm">
                                                    Enter your email address and
                                                    we'll send you a link to
                                                    reset your password.
                                                </p>

                                                <div className="space-y-6 flex flex-col items-center w-full">
                                                    <div className="relative group w-full max-w-sm sm:max-w-md flex items-center">
                                                        <div className="absolute left-4 z-10 flex items-center pointer-events-none">
                                                            <Mail className="h-5 w-5 text-blue-300 group-focus-within:text-blue-500 transition-colors" />
                                                        </div>
                                                        <input
                                                            type="email"
                                                            placeholder="Enter your email"
                                                            className="w-full pl-12 pr-4 py-3 rounded-full bg-white text-gray-800 placeholder-blue-300/70 font-medium focus:outline-none focus:ring-4 focus:ring-blue-400/50 shadow-sm transition-all text-sm sm:text-base"
                                                            value={
                                                                inputs.resetEmail
                                                            }
                                                            onChange={(e) =>
                                                                setInputs({
                                                                    ...inputs,
                                                                    resetEmail:
                                                                        e.target
                                                                            .value,
                                                                })
                                                            }
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-center gap-4 mt-8">
                                                        <SpinnerButton
                                                            type="button"
                                                            onClick={
                                                                handleSendResetLink
                                                            }
                                                            loading={fp.loading}
                                                            disabled={
                                                                fp.disabled ||
                                                                fp.loading
                                                            }
                                                            loadingText="Sending..."
                                                            className="cursor-pointer bg-gradient-to-r from-[#fac401] to-[#ff9504] hover:bg-[#e68a30] text-black font-bold py-3 px-8 rounded-full transition-all duration-300 shadow-[0_10px_20px_-10px_rgba(255,159,67,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(255,159,67,0.6)] hover:-translate-y-0.5 text-center text-sm md:text-base"
                                                        >
                                                            Send Link
                                                        </SpinnerButton>
                                                    </div>

                                                    <button
                                                        onClick={() =>
                                                            setIsForgotPassword(
                                                                false
                                                            )
                                                        }
                                                        className="mt-4 flex items-center gap-2 text-sm text-blue-200 hover:text-white transition-colors cursor-pointer"
                                                    >
                                                        <ArrowLeft size={16} />{" "}
                                                        Back to Sign In
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <Toaster position="top-right" />
        </div>
    );
};

export default Signin;
