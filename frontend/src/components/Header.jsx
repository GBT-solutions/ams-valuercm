import { useContext, useState, useEffect } from "react";
import { Link } from "react-router";
import { Menu, Sun, Moon, User, KeyRound, LogOut } from "lucide-react";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogFooter,
    DialogHeader,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import SpinnerButton from "./ui/spinner-button";

import { Context } from "../utils/Context";
import apiService from "../utils/apiService";
import { navigateTo } from "../utils/navigate";
import { isStrongPassword } from "../utils/helperFunctions";
import toaster from "../utils/toaster";

const Header = () => {
    const { user, setUser, isSidebarOpen, setIsSidebarOpen } =
        useContext(Context);

    const [isOpen, setIsOpen] = useState(false);
    const [isBackUpLoading, setIsBackUpLoading] = useState(false);

    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("theme") || "light";
    });

    // Change Password States
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleLogout = async () => {
        try {
            await apiService.post("/users/signout");
            setUser(null);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            navigateTo("/");
            setIsOpen(false);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const handleOpenChange = (open) => {
        setIsChangePasswordOpen(open);
        if (!open) {
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (!oldPassword || !newPassword || !confirmPassword) {
            toaster("error", "Please fill in all fields");
            return;
        }

        if (newPassword !== confirmPassword) {
            toaster(
                "error",
                "New password and confirmation password do not match"
            );
            return;
        }

        if (!isStrongPassword(newPassword)) {
            toaster(
                "error",
                "Password must be at least 8 characters, include uppercase, lowercase, number, and special character."
            );
            return;
        }

        setIsSubmitting(true);
        try {
            await apiService.post("/users/change-password", {
                oldPassword,
                newPassword,
                confirmPassword,
            });
            toaster("success", "Password changed successfully");
            handleOpenChange(false);
        } catch (error) {
            const errorMsg =
                error.response?.data?.message || "Failed to change password";
            toaster("error", errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <header className="w-full px-4 py-3 border-b border-gray-200/80 dark:border-border shadow-xs flex items-center justify-between bg-white dark:bg-card">
            <div className="flex items-center gap-3">
                {/* Hamburger Menu - Only visible on mobile/tablet */}
                {user && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        aria-label="Toggle sidebar"
                    >
                        <Menu className="h-6 w-6" />
                    </Button>
                )}
                <Link
                    to={user ? "/dashboard" : "/"}
                    className="flex items-center gap-3"
                >
                    <div className="p-1 rounded-full">
                        <img src="/icon.png" alt="Logo" className="h-9 w-9" />
                    </div>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 hidden sm:block">
                        Asset Monitoring System
                    </h1>
                </Link>
            </div>

            <div className="flex items-center gap-3">
                {/* Theme Toggle Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="cursor-pointer text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    title={
                        theme === "light"
                            ? "Switch to Dark Mode"
                            : "Switch to Light Mode"
                    }
                >
                    {theme === "light" ? (
                        <Moon className="h-5 w-5 text-blue-900" />
                    ) : (
                        <Sun className="h-5 w-5 text-yellow-600" />
                    )}
                </Button>

                {user && (
                    <Popover open={isOpen} onOpenChange={setIsOpen}>
                        <PopoverTrigger className="cursor-pointer focus:outline-none">
                            <div className="flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full h-9 w-9 pointer-events-none shadow-xs">
                                <User className="h-4.5 w-4.5 text-white" />
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg overflow-hidden">
                            {/* User Info Header */}
                            <div className="p-4 bg-gray-50/50 dark:bg-neutral-900/30 border-b border-gray-200/80 dark:border-neutral-800">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full h-10 w-10 shadow-xs">
                                        <User className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex flex-col min-w-0 items-start">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                            {user.name}
                                        </span>
                                        <span className="px-2.5 pt-0.5 text-[10px] mt-1 font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-1 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/60 rounded-full">
                                            {user.role}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions List */}
                            <div className="p-1.5 space-y-0.5">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setIsChangePasswordOpen(true);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all duration-200 cursor-pointer text-left focus:outline-none"
                                >
                                    <KeyRound className="h-4 w-4" />
                                    <span>Change Password</span>
                                </button>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all duration-200 cursor-pointer text-left focus:outline-none"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}
            </div>

            <Dialog open={isChangePasswordOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-[90vw] w-[450px]">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                            Change Password
                        </DialogTitle>
                        <DialogDescription className="text-sm text-neutral-500 dark:text-neutral-400">
                            Please enter your old password and choose a new
                            strong password.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={handleChangePassword}
                        className="space-y-4 text-left mt-2"
                    >
                        <div>
                            <label className="block mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Old Password{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <Input
                                className="w-full bg-white dark:bg-card border border-neutral-200 dark:border-neutral-800 rounded-lg focus:border-blue-500 h-10 transition-colors"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                type="password"
                                autocomplete="off"
                                placeholder="Enter current password"
                                required
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                New Password{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <Input
                                className="w-full bg-white dark:bg-card border border-neutral-200 dark:border-neutral-800 rounded-lg focus:border-blue-500 h-10 transition-colors"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                type="password"
                                autocomplete="off"
                                placeholder="Enter new strong password"
                                required
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Confirm Password{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <Input
                                className="w-full bg-white dark:bg-card border border-neutral-200 dark:border-neutral-800 rounded-lg focus:border-blue-500 h-10 transition-colors"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                type="password"
                                autocomplete="off"
                                placeholder="Confirm your new password"
                                required
                            />
                        </div>

                        <DialogFooter className="mt-6 gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                className="cursor-pointer rounded-lg border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 px-5 h-10"
                                onClick={() => handleOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <SpinnerButton
                                type="submit"
                                loading={isSubmitting}
                                disabled={isSubmitting}
                                loadingText="Changing..."
                                variant="default"
                                className="ms-4 cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:text-neutral-900 dark:hover:bg-blue-400 px-5 h-10 font-medium border-none"
                            >
                                Change Password
                            </SpinnerButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </header>
    );
};

export default Header;
