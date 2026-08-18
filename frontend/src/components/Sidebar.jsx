import { useContext, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router";
import { Button } from "./ui/button";
import { ChevronRight, ChevronLeft, X, LogOut, Info, User } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "./ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
    FaTachometerAlt,
    FaCubes,
    FaPlusSquare,
    FaListAlt,
    FaUsers,
    FaUserPlus,
    FaQrcode,
    FaUserShield,
    FaBoxes,
    FaHistory,
    FaDatabase,
} from "react-icons/fa";
import { IoMdSettings } from "react-icons/io";
import { BsTrash3Fill } from "react-icons/bs";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

import { Context } from "../utils/Context";
import apiService from "../utils/apiService";
import { navigateTo } from "../utils/navigate";

const navItems = [
    {
        name: "Dashboard",
        path: "/dashboard",
        icon: <FaTachometerAlt className="w-[18px] h-[18px] flex-shrink-0" />,
    },
    {
        name: "Asset Master",
        icon: <FaCubes className="w-[18px] h-[18px] flex-shrink-0" />,
        children: [
            {
                name: "Assets List",
                path: "/asset-list",
                icon: <FaListAlt className="w-[14px] h-[14px] flex-shrink-0" />,
            },
            {
                name: "Add Assets",
                path: "/add-asset",
                icon: (
                    <FaPlusSquare className="w-[14px] h-[14px] flex-shrink-0" />
                ),
                adminOnly: true,
            },
            {
                name: "Disposed Assets",
                path: "/disposed-assets",
                icon: (
                    <BsTrash3Fill className="w-[14px] h-[14px] flex-shrink-0" />
                ),
                adminOnly: true,
            },
        ],
    },
    {
        name: "Asset Allocation",
        icon: <FaBoxes className="w-[18px] h-[18px] flex-shrink-0" />,
        children: [
            {
                name: "Allocation List",
                path: "/allocation-list",
                icon: <FaListAlt className="w-[14px] h-[14px] flex-shrink-0" />,
            },
            {
                name: "New Allocation",
                path: "/add-allocation",
                icon: (
                    <FaPlusSquare className="w-[14px] h-[14px] flex-shrink-0" />
                ),
            },
            {
                name: "Allocation History",
                path: "/allocation-history",
                icon: <FaHistory className="w-[14px] h-[14px] flex-shrink-0" />,
            },
        ],
    },
    {
        name: "Employee Master",
        icon: <FaUsers className="w-[18px] h-[18px] flex-shrink-0" />,
        children: [
            {
                name: "Employee List",
                path: "/employee-list",
                icon: <FaListAlt className="w-[14px] h-[14px] flex-shrink-0" />,
            },
            {
                name: "Add Employee",
                path: "/add-employee",
                icon: (
                    <FaUserPlus className="w-[14px] h-[14px] flex-shrink-0" />
                ),
                adminOnly: true,
            },
        ],
    },
    {
        name: "QR Code",
        path: "/qr-code",
        icon: <FaQrcode className="w-[18px] h-[18px] flex-shrink-0" />,
    },
    {
        name: "Role Settings",
        path: "/role-settings",
        icon: <FaUserShield className="w-[18px] h-[18px] flex-shrink-0" />,
        adminOnly: true,
    },
    {
        name: "Backups",
        path: "/backup-logs",
        icon: <FaDatabase className="w-[18px] h-[18px] flex-shrink-0" />,
        adminOnly: true,
    },
    {
        name: "Settings",
        path: "/settings",
        icon: <IoMdSettings className="w-[18px] h-[18px] flex-shrink-0" />,
        adminOnly: true,
    },
];

const Sidebar = () => {
    const { user, setUser, isSidebarOpen, setIsSidebarOpen } =
        useContext(Context);
    const location = useLocation();
    const [openMenu, setOpenMenu] = useState(() => {
        // Automatically open the menu that has the active page on load
        const activeItem = navItems.find(
            (item) =>
                item.children &&
                item.children.some((sub) => sub.path === location.pathname)
        );
        return activeItem ? activeItem.name : null;
    });
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activePopover, setActivePopover] = useState(null);
    const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const shouldCollapse = isCollapsed && isDesktop;

    const toggleMenu = (name) => {
        setOpenMenu((prev) => (prev === name ? null : name));
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    const handleLogout = async () => {
        try {
            await apiService.post("/users/signout");
            setUser(null);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            navigateTo("/");
            closeSidebar();
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <>
            {/* Backdrop for mobile - only shows when sidebar is open */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-all duration-300"
                    onClick={closeSidebar}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    bg-white dark:bg-card border-r border-gray-200/80 dark:border-border flex flex-col pt-2 pb-4 px-3 transition-all duration-300 overflow-hidden shadow-xs
                    ${shouldCollapse ? "w-16" : "w-64"}
                    fixed top-0 left-0 bottom-0 h-screen
                    lg:relative lg:top-auto lg:bottom-auto lg:h-full lg:max-h-full
                    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                    z-50 lg:z-auto
                `}
            >
                {/* Header with collapse/close buttons */}
                <div
                    className={`flex items-center mb-1 pl-1.5 ${
                        isCollapsed ? "justify-center" : "justify-between"
                    }`}
                >
                    {/* Close button for mobile */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={closeSidebar}
                        className="lg:hidden text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label="Close sidebar"
                    >
                        <X className="h-5 w-5" />
                    </Button>

                    {/* Collapse/Expand button for desktop */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`hidden lg:flex text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 ${isCollapsed ? "" : "ml-auto"}`}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                        ) : (
                            <ChevronLeft className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                {/* Nav Items List */}
                <div className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-1 hide-scrollbar">
                    <nav className="flex flex-col gap-1">
                        {navItems.map((item) => {
                            const isAdminOnly = item.adminOnly;
                            const isVisibleToUser =
                                !isAdminOnly || user?.role === "admin";

                            if (!isVisibleToUser) return null;

                            if (shouldCollapse) {
                                if (item.children) {
                                    const isActiveParent = item.children.some(
                                        (sub) => sub.path === location.pathname
                                    );

                                    return (
                                        <Popover
                                            key={item.name}
                                            open={activePopover === item.name}
                                            onOpenChange={(open) =>
                                                setActivePopover(
                                                    open ? item.name : null
                                                )
                                            }
                                        >
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className={`w-full flex justify-center cursor-pointer py-2 h-10 rounded-lg relative ${
                                                        isActiveParent
                                                            ? "bg-blue-50/80 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                                    }`}
                                                    title={item.name}
                                                >
                                                    {item.icon}
                                                    {isActiveParent && (
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 dark:bg-blue-500 rounded-r-full" />
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                side="right"
                                                className="w-56 p-1.5 ml-3 bg-white dark:bg-card border border-gray-200/80 dark:border-border shadow-md rounded-xl"
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="px-2.5 py-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider select-none border-b border-gray-100 dark:border-gray-800 mb-1">
                                                        {item.name}
                                                    </div>
                                                    {item.children.map(
                                                        (sub) => {
                                                            const isSubAdminOnly =
                                                                sub.adminOnly;
                                                            const showSub =
                                                                !isSubAdminOnly ||
                                                                user?.role ===
                                                                    "admin";

                                                            if (!showSub)
                                                                return null;

                                                            return (
                                                                <NavLink
                                                                    key={
                                                                        sub.path
                                                                    }
                                                                    to={
                                                                        sub.path
                                                                    }
                                                                    onClick={() => {
                                                                        setActivePopover(
                                                                            null
                                                                        );
                                                                        closeSidebar();
                                                                    }}
                                                                    className={({
                                                                        isActive,
                                                                    }) =>
                                                                        `flex items-center rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 gap-2.5 ${
                                                                            isActive
                                                                                ? "bg-blue-50/80 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                                                                                : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/40"
                                                                        }`
                                                                    }
                                                                >
                                                                    {sub.icon}
                                                                    <span>
                                                                        {
                                                                            sub.name
                                                                        }
                                                                    </span>
                                                                </NavLink>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    );
                                }

                                const isActive =
                                    location.pathname === item.path;

                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={closeSidebar}
                                        className="relative block"
                                    >
                                        <Button
                                            variant="ghost"
                                            className={`w-full justify-center py-2 h-10 rounded-lg relative ${
                                                isActive
                                                    ? "bg-blue-50/80 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                            }`}
                                            title={item.name}
                                        >
                                            {item.icon}
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 dark:bg-blue-500 rounded-r-full" />
                                            )}
                                        </Button>
                                    </NavLink>
                                );
                            }

                            if (item.children) {
                                const isActiveParent = item.children.some(
                                    (sub) => sub.path === location.pathname
                                );

                                return (
                                    <div
                                        key={item.name}
                                        className="flex flex-col"
                                    >
                                        <Button
                                            variant="ghost"
                                            className={`w-full justify-between text-sm font-semibold cursor-pointer px-3 py-2 h-10 rounded-lg flex items-center gap-3 transition-all duration-200 relative ${
                                                isActiveParent
                                                    ? "text-blue-600 dark:text-blue-400"
                                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                            }`}
                                            onClick={() =>
                                                toggleMenu(item.name)
                                            }
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span
                                                    className={
                                                        isActiveParent
                                                            ? "text-blue-600 dark:text-blue-400"
                                                            : "text-gray-400 dark:text-gray-500"
                                                    }
                                                >
                                                    {item.icon}
                                                </span>
                                                <span>{item.name}</span>
                                            </div>
                                            <motion.div
                                                animate={{
                                                    rotate:
                                                        openMenu === item.name
                                                            ? 90
                                                            : 0,
                                                }}
                                                transition={{ duration: 0.2 }}
                                                className="flex items-center justify-center"
                                            >
                                                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                            </motion.div>
                                        </Button>

                                        <AnimatePresence initial={false}>
                                            {openMenu === item.name && (
                                                <motion.div
                                                    initial="collapsed"
                                                    animate="open"
                                                    exit="collapsed"
                                                    variants={{
                                                        open: {
                                                            opacity: 1,
                                                            height: "auto",
                                                        },
                                                        collapsed: {
                                                            opacity: 0,
                                                            height: 0,
                                                        },
                                                    }}
                                                    transition={{
                                                        duration: 0.2,
                                                        ease: "easeInOut",
                                                    }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="ml-3 pl-3.5 border-l border-gray-100 dark:border-gray-800 flex flex-col gap-0.5 py-1">
                                                        {item.children.map(
                                                            (sub) => {
                                                                const isSubAdminOnly =
                                                                    sub.adminOnly;
                                                                const showSub =
                                                                    !isSubAdminOnly ||
                                                                    user?.role ===
                                                                        "admin";

                                                                return showSub ? (
                                                                    <NavLink
                                                                        key={
                                                                            sub.path
                                                                        }
                                                                        to={
                                                                            sub.path
                                                                        }
                                                                        onClick={
                                                                            closeSidebar
                                                                        }
                                                                        className={({
                                                                            isActive,
                                                                        }) =>
                                                                            `flex items-center rounded-lg px-3 py-2 text-sm font-medium gap-2.5 transition-all duration-200 ${
                                                                                isActive
                                                                                    ? "bg-blue-50/80 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 font-semibold"
                                                                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                                                            }`
                                                                        }
                                                                    >
                                                                        <span className="opacity-80">
                                                                            {
                                                                                sub.icon
                                                                            }
                                                                        </span>
                                                                        <span>
                                                                            {
                                                                                sub.name
                                                                            }
                                                                        </span>
                                                                    </NavLink>
                                                                ) : null;
                                                            }
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            }

                            const isActive = location.pathname === item.path;

                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={closeSidebar}
                                    className={({ isActive }) =>
                                        `flex items-center rounded-lg px-3 py-2 text-sm font-semibold gap-2.5 transition-all duration-200 relative ${
                                            isActive
                                                ? "bg-blue-50/80 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                        }`
                                    }
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 dark:bg-blue-500 rounded-r-full" />
                                    )}
                                    <span
                                        className={
                                            isActive
                                                ? "text-blue-600 dark:text-blue-400"
                                                : "text-gray-400 dark:text-gray-500"
                                        }
                                    >
                                        {item.icon}
                                    </span>
                                    <span>{item.name}</span>
                                </NavLink>
                            );
                        })}
                    </nav>
                </div>

                {/* Bottom Section - fixed, doesn't scroll */}
                <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-1 flex-shrink-0">
                    {/* About System Button */}
                    <Button
                        variant="ghost"
                        onClick={() => setAboutDialogOpen(true)}
                        className={`w-full flex items-center text-sm font-semibold cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all duration-200 rounded-lg ${
                            shouldCollapse
                                ? "justify-center h-10 px-0"
                                : "justify-start px-3 py-2 gap-2.5"
                        }`}
                        title="About System"
                    >
                        <Info className="h-4.5 w-4.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        {!shouldCollapse && <span>About System</span>}
                    </Button>

                    {/* User Profile Footer - Only visible on mobile/tablet */}
                    <div className="lg:hidden">
                        <div className="flex items-center gap-3 px-2 py-3 border-t border-gray-100 dark:border-gray-800/50 mt-1">
                            {/* Avatar */}
                            <div className="flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full h-10 w-10 flex-shrink-0 shadow-xs">
                                <User className="h-5 w-5 text-white" />
                            </div>

                            {/* User Info and Logout */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                    {user?.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {user?.role}
                                </p>
                            </div>

                            {/* Logout Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleLogout}
                                className="flex-shrink-0 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400"
                                aria-label="Logout"
                            >
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* About System Dialog */}
            <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
                <DialogContent
                    showCloseButton={true}
                    className="sm:max-w-md rounded-2xl"
                >
                    <div className="flex flex-col items-center text-center space-y-4 pt-2">
                        {/* Beautiful Icon Wrapper */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/40 shadow-xs">
                            <img
                                src="/icon.png"
                                alt="App Logo"
                                className="h-12 w-12"
                            />
                        </div>

                        <div>
                            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                Asset Monitoring System
                            </DialogTitle>
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full inline-block uppercase tracking-wider">
                                Version 2.3
                            </p>
                        </div>

                        <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                            A professional and premium asset monitoring and
                            management system designed to track, allocate, and
                            audit company assets with efficiency and accuracy.
                        </DialogDescription>
                    </div>

                    <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            Developer & Support Details
                        </h4>

                        <div className="bg-gray-50 dark:bg-neutral-900/40 rounded-xl p-3.5 text-xs space-y-3 border border-gray-100 dark:border-gray-800">
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">
                                    Developed By
                                </span>
                                <a
                                    href="http://gbtsolutions.in/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                                >
                                    GBT Tech Solutions Private Limited
                                </a>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">
                                    Support Email
                                </span>
                                <a
                                    href="mailto:software.support@gbtsolutions.in"
                                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                                >
                                    software.support@gbtsolutions.in
                                </a>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-4">
                        <Button
                            className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-xl h-10 font-medium transition-all"
                            onClick={() => setAboutDialogOpen(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default Sidebar;
