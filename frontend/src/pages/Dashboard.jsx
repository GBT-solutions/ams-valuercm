import { useEffect, useState } from "react";
import { GoDownload } from "react-icons/go";

import {
    Table,
    TableBody,
    TableHeader,
    TableHead,
    TableRow,
    TableCell,
} from "../components/ui/table";
import { Calendar } from "../components/ui/calendar";
import {
    Bar,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Cell,
    Pie,
    PieChart,
    Tooltip,
} from "recharts";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../components/ui/popover";

import apiService from "../utils/apiService";
import { formatDate, getSqlDate } from "../utils/helperFunctions";
import SpinnerButton from "../components/ui/spinner-button";
import { FaDownload } from "react-icons/fa6";
import toaster from "../utils/toaster";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "../components/ui/button";
import Spinner from "../components/Spinner";
import { motion, AnimatePresence } from "framer-motion";

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 dark:bg-[#1c1e22]/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/80 p-3 rounded-lg shadow-md text-xs font-semibold">
                <p className="text-slate-500 dark:text-slate-400 mb-1">{`Month: ${label}`}</p>
                <p className="text-blue-600 dark:text-blue-450 flex items-center gap-1.5 text-sm font-bold">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                    {`${payload[0].value} Assets`}
                </p>
            </div>
        );
    }
    return null;
};

const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState({});
    const [isLoading, setIsLoading] = useState({
        upcommingCsv: false,
        expiredCSV: false,
        dashboard: false,
    });
    const [data, setData] = useState(null);
    const [date, setDate] = useState({
        upcommingFrom: undefined,
        upcommingTo: undefined,
        expiredFrom: undefined,
        expiredTo: undefined,
        today: new Date(),
    });

    const COLORS = ["#10b981", "#f59e0b", "#6366f1"];

    const [selected, setSelected] = useState("all");
    const [prevSelected, setPrevSelected] = useState("all");

    const tabs = ["all", "it", "admin"];
    const currentIndex = tabs.indexOf(selected);
    const prevIndex = tabs.indexOf(prevSelected);
    const direction = currentIndex >= prevIndex ? 1 : -1;

    const slideVariants = {
        initial: (dir) => ({
            x: dir * 30,
            opacity: 0,
        }),
        animate: {
            x: 0,
            opacity: 1,
        },
        exit: (dir) => ({
            x: -dir * 30,
            opacity: 0,
        }),
    };

    const handleSelect = (category) => {
        setPrevSelected(selected);
        setSelected(category);
    };

    const handleBackup = async (category) => {
        try {
            await apiService.downloadFile(
                "/users/backup-dashboard",
                { category: category, type: selected },
                "post"
            );
        } catch (error) {
            console.log(error);
            toaster("error", "Failed to download backup file");
        }
    };
    const fetchData = async () => {
        try {
            let expiredFrom, expiredTo, upcommingFrom, upcommingTo;
            if (!date.expiredFrom) {
                const d = new Date();
                d.setHours(0);
                d.setMinutes(0);
                d.setSeconds(0);
                upcommingFrom = new Date(d);
                d.setDate(d.getDate() - 1);
                expiredTo = new Date(d);
                d.setMonth(d.getMonth() - 3);
                expiredFrom = new Date(d);
                upcommingTo = new Date(
                    upcommingFrom.getFullYear(),
                    upcommingFrom.getMonth() + 3,
                    upcommingFrom.getDate(),
                    0,
                    0,
                    0,
                    0
                );

                // d.setDate(d.getDate() + 1);
                // expiredFrom = new Date(d);
                // d.setMonth(d.getMonth() + 3);
                // expiredTo = new Date(d);
                // d.setDate(d.getDate() - 1);
                // upcommingTo = new Date(d);
                setDate((prev) => ({
                    ...prev,
                    expiredFrom,
                    expiredTo,
                    upcommingFrom,
                    upcommingTo,
                }));
            } else {
                upcommingFrom = date.upcommingFrom;
                upcommingTo = date.upcommingTo;
                expiredFrom = date.expiredFrom;
                expiredTo = date.expiredTo;
            }
            setIsLoading((prev) => ({ ...prev, dashboard: true }));
            const response = await apiService.post("/users/dashboard", {
                upcommingFrom: getSqlDate(upcommingFrom),
                upcommingTo: getSqlDate(upcommingTo),
                expiredFrom: getSqlDate(expiredFrom),
                expiredTo: getSqlDate(expiredTo),
                selected,
            });
            setDashboardData(response.data);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setIsLoading((prev) => ({ ...prev, dashboard: false }));
        }
    };
    const downloadUpcommingCSV = async () => {
        try {
            setIsLoading((prev) => ({ ...prev, upcommingCsv: true }));
            await apiService.downloadFile(
                "/users/backup-upcoming-csv",
                {
                    upcommingFrom: getSqlDate(date.upcommingFrom),
                    upcommingTo: getSqlDate(date.upcommingTo),
                    type: selected,
                },
                "post"
            );
        } catch (error) {
            console.log(error);
            toaster("error", "Failed to download upcoming CSV");
        } finally {
            setIsLoading((prev) => ({ ...prev, upcommingCsv: false }));
        }
    };
    const downloadExpiredCSV = async () => {
        try {
            setIsLoading((prev) => ({ ...prev, expiredCsv: true }));
            await apiService.downloadFile(
                "/users/backup-expiring-csv",
                {
                    expiredFrom: getSqlDate(date.expiredFrom),
                    expiredTo: getSqlDate(date.expiredTo),
                    type: selected,
                },
                "post"
            );
        } catch (error) {
            console.log(error);
            toaster("error", "Failed to download expired CSV");
        } finally {
            setIsLoading((prev) => ({ ...prev, expiredCsv: false }));
        }
    };

    useEffect(() => {
        fetchData();
    }, [selected]);
    useEffect(() => {
        const rawData = [
            { name: "Tagged", value: Number(dashboardData.total_tagged) || 0 },
            {
                name: "Detagged",
                value: Number(dashboardData.total_detagged) || 0,
            },
            {
                name: "Not Assigned",
                value: Number(dashboardData.not_assigned) || 0,
            },
        ];

        const total = rawData.reduce((sum, entry) => sum + entry.value, 0);

        if (total > 0) {
            // Calculate percentages with 1 decimal place precision (base 1000)
            const dataWithDecimals = rawData.map((entry) => {
                const percent = (entry.value / total) * 100;
                // Work with tenths (e.g. 33.333% -> 333.33)
                const tenths = percent * 10;
                return {
                    ...entry,
                    floor: Math.floor(tenths),
                    decimal: tenths - Math.floor(tenths),
                };
            });

            const sumFloor = dataWithDecimals.reduce(
                (acc, curr) => acc + curr.floor,
                0
            );
            let diff = 1000 - sumFloor; // Target 100.0% * 10 = 1000

            // Sort by decimal part descending
            const candidates = dataWithDecimals
                .map((d, i) => ({ ...d, originalIndex: i }))
                .sort((a, b) => b.decimal - a.decimal);

            const increments = new Array(rawData.length).fill(0);

            // Distribute the remainder (tenths)
            for (let i = 0; i < diff; i++) {
                increments[candidates[i % candidates.length].originalIndex]++;
            }

            const finalData = dataWithDecimals.map((entry, i) => ({
                name: entry.name,
                value: entry.value,
                displayPercent: (entry.floor + increments[i]) / 10,
            }));
            setData(finalData);
        } else {
            setData(rawData.map((entry) => ({ ...entry, displayPercent: 0 })));
        }
    }, [dashboardData]);

    return (
        <div className="flex flex-col qr-table-height rounded-md">
            <div className="relative flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl gap-1 mb-4 w-full max-w-md self-start border border-slate-200/50 dark:border-slate-800/40 shadow-sm">
                {tabs.map((tab) => {
                    const isActive = selected === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => handleSelect(tab)}
                            className={`relative flex-1 py-1.5 text-xs sm:text-sm font-semibold rounded-lg capitalize transition-colors duration-200 focus:outline-none cursor-pointer ${
                                isActive
                                    ? "text-blue-600 dark:text-blue-400 font-bold"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabPill"
                                    className="absolute inset-0 bg-white dark:bg-[#1a1b1e] rounded-lg shadow-sm border border-slate-200/40 dark:border-slate-700/30"
                                    transition={{
                                        type: "spring",
                                        stiffness: 380,
                                        damping: 30,
                                    }}
                                />
                            )}
                            <span className="relative z-10">
                                {tab === "all"
                                    ? "All Categories"
                                    : tab.toUpperCase()}
                            </span>
                        </button>
                    );
                })}
            </div>
            <AnimatePresence mode="wait" initial={false}>
                {isLoading.dashboard ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex items-center justify-center min-h-[300px] w-full"
                    >
                        <Spinner size={50} thickness={6} />
                    </motion.div>
                ) : (
                    <motion.div
                        key={selected}
                        custom={direction}
                        variants={slideVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="flex-1 min-h-0 flex flex-col w-full"
                    >
                        {/* Stats Cards - Responsive Grid */}
                        <div className="w-full gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                            {/* Card 1: Total Assets */}
                            <motion.div
                                whileHover={{ y: -4, scale: 1.01 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 20,
                                }}
                                className="flex justify-between items-center min-h-[120px] border border-slate-200/50 dark:border-slate-800/40 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                            >
                                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 to-indigo-600" />
                                <div className="flex flex-col h-full justify-between flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            Total Assets
                                        </p>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await apiService.downloadFile(
                                                        "/assets/backup?type=" +
                                                            selected
                                                    );
                                                } catch (error) {
                                                    toaster(
                                                        "error",
                                                        "Failed to download"
                                                    );
                                                }
                                            }}
                                            className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-200 absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Download Backup"
                                        >
                                            <GoDownload className="size-4" />
                                        </button>
                                    </div>
                                    <div className="mt-2 flex items-baseline">
                                        <p className="text-3xl font-extrabold text-slate-850 dark:text-white tracking-tight">
                                            {dashboardData.total_asset ?? 0}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-3 bg-blue-50/80 dark:bg-blue-950/20 rounded-xl ml-4 transition-transform duration-300 group-hover:scale-110">
                                    <img
                                        src="/asset.svg"
                                        className="size-8 sm:size-10"
                                    />
                                </div>
                            </motion.div>

                            {/* Card 2: Tagged Assets */}
                            <motion.div
                                whileHover={{ y: -4, scale: 1.01 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 20,
                                }}
                                className="flex justify-between items-center min-h-[120px] border border-slate-200/50 dark:border-slate-800/40 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                            >
                                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 to-teal-600" />
                                <div className="flex flex-col h-full justify-between flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            Tagged Assets
                                        </p>
                                        <button
                                            onClick={() =>
                                                handleBackup("tagged")
                                            }
                                            className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-200 absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Download Backup"
                                        >
                                            <GoDownload className="size-4" />
                                        </button>
                                    </div>
                                    <div className="mt-2 flex items-baseline">
                                        <p className="text-3xl font-extrabold text-slate-850 dark:text-white tracking-tight">
                                            {dashboardData.total_tagged ?? 0}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/20 rounded-xl ml-4 transition-transform duration-300 group-hover:scale-110">
                                    <img
                                        src="/tagAsset.svg"
                                        className="size-8 sm:size-10"
                                    />
                                </div>
                            </motion.div>

                            {/* Card 3: Detagged Assets */}
                            <motion.div
                                whileHover={{ y: -4, scale: 1.01 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 20,
                                }}
                                className="flex justify-between items-center min-h-[120px] border border-slate-200/50 dark:border-slate-800/40 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                            >
                                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-500 to-orange-600" />
                                <div className="flex flex-col h-full justify-between flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            Detagged Assets
                                        </p>
                                        <button
                                            onClick={() =>
                                                handleBackup("detagged")
                                            }
                                            className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-200 absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Download Backup"
                                        >
                                            <GoDownload className="size-4" />
                                        </button>
                                    </div>
                                    <div className="mt-2 flex items-baseline">
                                        <p className="text-3xl font-extrabold text-slate-850 dark:text-white tracking-tight">
                                            {dashboardData.total_detagged ?? 0}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/20 rounded-xl ml-4 transition-transform duration-300 group-hover:scale-110">
                                    <img
                                        src="/detagAsset.svg"
                                        className="size-8 sm:size-10"
                                    />
                                </div>
                            </motion.div>

                            {/* Card 4: Not Assigned */}
                            <motion.div
                                whileHover={{ y: -4, scale: 1.01 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 20,
                                }}
                                className="flex justify-between items-center min-h-[120px] border border-slate-200/50 dark:border-slate-800/40 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                            >
                                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 to-indigo-600" />
                                <div className="flex flex-col h-full justify-between flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            Not Assigned
                                        </p>
                                        <button
                                            onClick={() =>
                                                handleBackup("not_assigned")
                                            }
                                            className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-200 absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Download Backup"
                                        >
                                            <GoDownload className="size-4" />
                                        </button>
                                    </div>
                                    <div className="mt-2 flex items-baseline">
                                        <p className="text-3xl font-extrabold text-slate-850 dark:text-white tracking-tight">
                                            {dashboardData.not_assigned ?? 0}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-3 bg-purple-50/80 dark:bg-purple-950/20 rounded-xl ml-4 transition-transform duration-300 group-hover:scale-110">
                                    <img
                                        src="/nontag.svg"
                                        className="size-8 sm:size-10"
                                    />
                                </div>
                            </motion.div>
                        </div>
                        {/* Middle Section - Tables - Responsive */}
                        <div className="w-full flex flex-col lg:flex-row gap-4 mb-4 lg:h-[37.5%]">
                            {/* Upcoming Expiry Assets */}
                            <div className="w-full lg:w-1/2 min-h-[300px] lg:min-h-0 lg:h-full border border-slate-200/50 dark:border-slate-800/40 rounded-xl bg-white shadow-sm p-2 flex flex-col">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex flex-col">
                                        <p className="font-bold text-slate-850 dark:text-white text-base sm:text-lg">
                                            Upcoming Expiry Assets
                                        </p>
                                    </div>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className="flex items-center justify-center px-2 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors duration-150 cursor-pointer">
                                                <span className="text-xs font-semibold mr-1 hidden sm:inline">
                                                    Range
                                                </span>
                                                <ChevronDownIcon className="size-3.5" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 p-4 rounded-xl shadow-lg border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-[#1a1b1e] z-50">
                                            <div className="w-full flex flex-col gap-4">
                                                <div className="space-y-1">
                                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                                                        Expiry Filters
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        Select date limits for
                                                        expiring assets
                                                    </p>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                            From:
                                                        </span>
                                                        <Popover>
                                                            <PopoverTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="outline"
                                                                    data-empty={
                                                                        !date.upcommingFrom
                                                                    }
                                                                    className="data-[empty=true]:text-muted-foreground w-44 justify-between text-left font-normal text-xs h-8"
                                                                >
                                                                    {date.upcommingFrom ? (
                                                                        formatDate(
                                                                            date.upcommingFrom
                                                                        )
                                                                    ) : (
                                                                        <span>
                                                                            Pick
                                                                            date
                                                                        </span>
                                                                    )}
                                                                    <ChevronDownIcon className="size-3" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent
                                                                className="w-auto p-0"
                                                                align="start"
                                                            >
                                                                <Calendar
                                                                    mode="single"
                                                                    disabled={{
                                                                        before: new Date(
                                                                            date.today.getFullYear(),
                                                                            date.today.getMonth(),
                                                                            date.today.getDate()
                                                                        ),
                                                                    }}
                                                                    selected={
                                                                        date.upcommingFrom
                                                                    }
                                                                    onSelect={(
                                                                        value
                                                                    ) =>
                                                                        setDate(
                                                                            (
                                                                                prev
                                                                            ) => ({
                                                                                ...prev,
                                                                                upcommingFrom:
                                                                                    value,
                                                                            })
                                                                        )
                                                                    }
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                            To:
                                                        </span>
                                                        <Popover>
                                                            <PopoverTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="outline"
                                                                    data-empty={
                                                                        !date.upcommingTo
                                                                    }
                                                                    className="data-[empty=true]:text-muted-foreground w-44 justify-between text-left font-normal text-xs h-8"
                                                                >
                                                                    {date.upcommingTo ? (
                                                                        formatDate(
                                                                            date.upcommingTo
                                                                        )
                                                                    ) : (
                                                                        <span>
                                                                            Pick
                                                                            date
                                                                        </span>
                                                                    )}
                                                                    <ChevronDownIcon className="size-3" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent
                                                                className="w-auto p-0"
                                                                align="start"
                                                            >
                                                                <Calendar
                                                                    mode="single"
                                                                    disabled={{
                                                                        before: new Date(
                                                                            date.upcommingFrom
                                                                        ),
                                                                        after: new Date(
                                                                            date.upcommingFrom?.getFullYear(),
                                                                            date.upcommingFrom?.getMonth() +
                                                                                3,
                                                                            date.upcommingFrom?.getDate()
                                                                        ),
                                                                    }}
                                                                    selected={
                                                                        date.upcommingTo
                                                                    }
                                                                    onSelect={(
                                                                        value
                                                                    ) =>
                                                                        setDate(
                                                                            (
                                                                                prev
                                                                            ) => ({
                                                                                ...prev,
                                                                                upcommingTo:
                                                                                    value,
                                                                            })
                                                                        )
                                                                    }
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                    <Button
                                                        className="cursor-pointer flex-1 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                                                        onClick={() =>
                                                            fetchData()
                                                        }
                                                    >
                                                        Apply
                                                    </Button>
                                                    <SpinnerButton
                                                        loading={
                                                            isLoading.upcommingCsv
                                                        }
                                                        disabled={
                                                            isLoading.upcommingCsv
                                                        }
                                                        loadingText="Wait..."
                                                        className="cursor-pointer flex-1 text-xs h-8 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-none font-medium"
                                                        onClick={
                                                            downloadUpcommingCSV
                                                        }
                                                    >
                                                        <FaDownload className="size-3 mr-1" />
                                                        CSV
                                                    </SpinnerButton>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="flex-1 overflow-x-auto overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800/40">
                                    <Table className="w-full border-collapse">
                                        <TableHeader className="bg-slate-50/75 dark:bg-slate-900/40 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800/40">
                                            <TableHead className="text-center text-xs font-semibold text-slate-500 py-2.5">
                                                Asset ID
                                            </TableHead>
                                            <TableHead className="text-center text-xs font-semibold text-slate-500 py-2.5">
                                                Serial No
                                            </TableHead>
                                            <TableHead className="text-center text-xs font-semibold text-slate-500 py-2.5">
                                                Model No
                                            </TableHead>
                                            <TableHead className="text-center text-xs font-semibold text-slate-500 py-2.5">
                                                Unique Code
                                            </TableHead>
                                            <TableHead className="text-center text-xs font-semibold text-slate-500 py-2.5">
                                                Exp Date
                                            </TableHead>
                                        </TableHeader>
                                        <TableBody>
                                            {!dashboardData?.upcommingExp ||
                                            dashboardData.upcommingExp
                                                .length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={5}
                                                        className="h-44 text-center"
                                                    >
                                                        <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-1.5">
                                                            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-full">
                                                                <svg
                                                                    className="size-5 text-slate-400"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth="2"
                                                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                                                                    ></path>
                                                                </svg>
                                                            </div>
                                                            <p className="text-xs font-semibold">
                                                                No Expiring
                                                                Assets
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">
                                                                Try adjusting
                                                                the range
                                                                filters
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                dashboardData.upcommingExp.map(
                                                    (asset, i) => (
                                                        <TableRow
                                                            key={i}
                                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/40"
                                                        >
                                                            <TableCell className="text-center text-xs font-medium text-slate-700 dark:text-slate-300 py-2">
                                                                {asset.asset_id}
                                                            </TableCell>
                                                            <TableCell className="text-center text-xs text-slate-600 dark:text-slate-450 py-2">
                                                                {asset.serial}
                                                            </TableCell>
                                                            <TableCell className="text-center text-xs text-slate-600 dark:text-slate-450 py-2">
                                                                {asset.model_no}
                                                            </TableCell>
                                                            <TableCell className="text-center text-xs py-2">
                                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[9px] text-slate-600 dark:text-slate-300">
                                                                    {asset.asset_code ||
                                                                        "--"}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-center text-xs py-2">
                                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/20">
                                                                    {formatDate(
                                                                        new Date(
                                                                            asset.exp_date
                                                                        )
                                                                    )}
                                                                </span>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                )
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Expired Asset Details */}
                            <div className="w-full lg:w-1/2 min-h-[300px] lg:min-h-0 lg:h-full border border-slate-200/50 dark:border-slate-800/40 rounded-xl bg-white shadow-sm p-2 flex flex-col">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex flex-col">
                                        <p className="font-bold text-slate-850 dark:text-white text-base sm:text-lg">
                                            Expired Asset Details
                                        </p>
                                    </div>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className="flex items-center justify-center px-2 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors duration-150 cursor-pointer">
                                                <span className="text-xs font-semibold mr-1 hidden sm:inline">
                                                    Range
                                                </span>
                                                <ChevronDownIcon className="size-3.5" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 p-4 rounded-xl shadow-lg border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-[#1a1b1e] z-50">
                                            <div className="w-full flex flex-col gap-4">
                                                <div className="space-y-1">
                                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                                                        Expired Filters
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        Select date limits for
                                                        expired assets
                                                    </p>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                            To Date:
                                                        </span>
                                                        <Popover>
                                                            <PopoverTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="outline"
                                                                    data-empty={
                                                                        !date.expiredTo
                                                                    }
                                                                    className="data-[empty=true]:text-muted-foreground w-44 justify-between text-left font-normal text-xs h-8"
                                                                >
                                                                    {date.expiredTo ? (
                                                                        formatDate(
                                                                            date.expiredTo
                                                                        )
                                                                    ) : (
                                                                        <span>
                                                                            Pick
                                                                            date
                                                                        </span>
                                                                    )}
                                                                    <ChevronDownIcon className="size-3" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent
                                                                className="w-auto p-0"
                                                                align="start"
                                                            >
                                                                <Calendar
                                                                    mode="single"
                                                                    disabled={{
                                                                        before: new Date(
                                                                            date.expiredFrom
                                                                        ),
                                                                        after: new Date(
                                                                            date.expiredFrom?.getFullYear(),
                                                                            date.expiredFrom?.getMonth() +
                                                                                3,
                                                                            date.expiredFrom?.getDate() +
                                                                                1
                                                                        ),
                                                                    }}
                                                                    selected={
                                                                        date.expiredTo
                                                                    }
                                                                    onSelect={(
                                                                        value
                                                                    ) =>
                                                                        setDate(
                                                                            (
                                                                                prev
                                                                            ) => ({
                                                                                ...prev,
                                                                                expiredTo:
                                                                                    value,
                                                                            })
                                                                        )
                                                                    }
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                            From Date:
                                                        </span>
                                                        <Popover>
                                                            <PopoverTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="outline"
                                                                    data-empty={
                                                                        !date.expiredFrom
                                                                    }
                                                                    className="data-[empty=true]:text-muted-foreground w-44 justify-between text-left font-normal text-xs h-8"
                                                                >
                                                                    {date.expiredFrom ? (
                                                                        formatDate(
                                                                            date.expiredFrom
                                                                        )
                                                                    ) : (
                                                                        <span>
                                                                            Pick
                                                                            date
                                                                        </span>
                                                                    )}
                                                                    <ChevronDownIcon className="size-3" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent
                                                                className="w-auto p-0"
                                                                align="start"
                                                            >
                                                                <Calendar
                                                                    mode="single"
                                                                    disabled={{
                                                                        after: date.expiredTo,
                                                                        before: new Date(
                                                                            date.expiredTo?.getFullYear(),
                                                                            date.expiredTo?.getMonth() -
                                                                                3,
                                                                            date.expiredTo?.getDate()
                                                                        ),
                                                                    }}
                                                                    selected={
                                                                        date.expiredFrom
                                                                    }
                                                                    onSelect={(
                                                                        value
                                                                    ) =>
                                                                        setDate(
                                                                            (
                                                                                prev
                                                                            ) => ({
                                                                                ...prev,
                                                                                expiredFrom:
                                                                                    value,
                                                                            })
                                                                        )
                                                                    }
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                    <Button
                                                        className="cursor-pointer flex-1 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                                                        onClick={() =>
                                                            fetchData()
                                                        }
                                                    >
                                                        Apply
                                                    </Button>
                                                    <SpinnerButton
                                                        loading={
                                                            isLoading.expiredCSV
                                                        }
                                                        disabled={
                                                            isLoading.expiredCSV
                                                        }
                                                        loadingText="Wait..."
                                                        className="cursor-pointer flex-1 text-xs h-8 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-none font-medium"
                                                        onClick={
                                                            downloadExpiredCSV
                                                        }
                                                    >
                                                        <FaDownload className="size-3 mr-1" />
                                                        CSV
                                                    </SpinnerButton>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="flex-1 overflow-x-auto overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800/40">
                                    <Table className="w-full border-collapse">
                                        <TableHeader className="bg-slate-50/75 dark:bg-slate-900/40 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800/40">
                                            <TableHead className="text-center text-xs font-semibold text-slate-500 py-2.5">
                                                Asset ID
                                            </TableHead>
                                            <TableHead className="text-center text-xs font-semibold text-slate-500 py-2.5">
                                                Serial No
                                            </TableHead>
                                            <TableHead className="text-center text-xs font-semibold text-slate-500 py-2.5">
                                                Model No
                                            </TableHead>
                                            <TableHead className="text-center text-xs font-semibold text-slate-500 py-2.5">
                                                Unique Code
                                            </TableHead>
                                            <TableHead className="text-center text-xs font-semibold text-slate-500 py-2.5">
                                                Expiry Date
                                            </TableHead>
                                        </TableHeader>
                                        <TableBody>
                                            {!dashboardData?.upcommingSubmission ||
                                            dashboardData.upcommingSubmission
                                                .length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={5}
                                                        className="h-44 text-center"
                                                    >
                                                        <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-1.5">
                                                            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-full">
                                                                <svg
                                                                    className="size-5 text-slate-400"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth="2"
                                                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                                    ></path>
                                                                </svg>
                                                            </div>
                                                            <p className="text-xs font-semibold">
                                                                No Expired
                                                                Assets
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">
                                                                Within the
                                                                chosen time
                                                                period
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                dashboardData.upcommingSubmission.map(
                                                    (asset, idx) => (
                                                        <TableRow
                                                            key={
                                                                idx +
                                                                "" +
                                                                Math.random()
                                                            }
                                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/40"
                                                        >
                                                            <TableCell className="text-center text-xs font-medium text-slate-700 dark:text-slate-350 py-2">
                                                                {asset.asset_id}
                                                            </TableCell>
                                                            <TableCell className="text-center text-xs text-slate-600 dark:text-slate-450 py-2">
                                                                {asset.serial}
                                                            </TableCell>
                                                            <TableCell className="text-center text-xs text-slate-600 dark:text-slate-450 py-2">
                                                                {asset.model_no}
                                                            </TableCell>
                                                            <TableCell className="text-center text-xs py-2">
                                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[9px] text-slate-600 dark:text-slate-300">
                                                                    {asset.asset_code ||
                                                                        "--"}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-center text-xs py-2">
                                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/20">
                                                                    {formatDate(
                                                                        new Date(
                                                                            asset.exp_date
                                                                        )
                                                                    )}
                                                                </span>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                )
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                        {/* Bottom Section - Charts - Responsive */}
                        <div className="w-full flex flex-col lg:flex-row gap-4 lg:h-[37.5%]">
                            {/* Bar Chart */}
                            <div className="w-full lg:w-[65%] min-h-[300px] lg:min-h-0 lg:h-full border border-slate-200/50 dark:border-slate-800/40 rounded-xl bg-white shadow-sm p-4 flex flex-col">
                                <div className="flex flex-col mb-3">
                                    <p className="font-bold text-slate-850 dark:text-white text-sm sm:text-base">
                                        Annual Expiry Overview
                                    </p>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer
                                        className="-ms-2 sm:-ms-6"
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            accessibilityLayer
                                            data={dashboardData.monthData}
                                            barSize={24}
                                        >
                                            <defs>
                                                <linearGradient
                                                    id="barGradient"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="0%"
                                                        stopColor="#3b82f6"
                                                        stopOpacity={0.9}
                                                    />
                                                    <stop
                                                        offset="100%"
                                                        stopColor="#6366f1"
                                                        stopOpacity={0.65}
                                                    />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid
                                                vertical={false}
                                                stroke="rgba(156, 163, 175, 0.12)"
                                                strokeDasharray="3 3"
                                            />
                                            <XAxis
                                                dataKey="month_name"
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{
                                                    fontSize: 10,
                                                    fill: "rgb(156, 163, 175)",
                                                }}
                                            />
                                            <YAxis
                                                allowDecimals={false}
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{
                                                    fontSize: 10,
                                                    fill: "rgb(156, 163, 175)",
                                                }}
                                            />
                                            <Tooltip
                                                content={<CustomTooltip />}
                                                cursor={{
                                                    fill: "rgba(156, 163, 175, 0.05)",
                                                }}
                                            />
                                            <Bar
                                                dataKey="total"
                                                fill="url(#barGradient)"
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Pie Chart */}
                            <div className="w-full lg:w-[35%] min-h-[300px] lg:min-h-0 lg:h-full border border-slate-200/50 dark:border-slate-800/40 rounded-xl bg-white shadow-sm p-4 flex flex-col justify-between items-center relative">
                                <div className="w-full flex flex-col text-center mb-1">
                                    <p className="font-bold text-slate-850 dark:text-white text-sm sm:text-base">
                                        Asset Distribution (%)
                                    </p>
                                </div>
                                <div className="flex-1 w-full min-h-0 p-1">
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <PieChart
                                            margin={{
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                            }}
                                        >
                                            <Pie
                                                data={data}
                                                label={false}
                                                fill="#8884d8"
                                                dataKey="value"
                                                isAnimationActive={"auto"}
                                                outerRadius={"100%"}
                                                innerRadius={0}
                                            >
                                                {data?.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${entry.name}`}
                                                        fill={
                                                            COLORS[
                                                                index %
                                                                    COLORS.length
                                                            ]
                                                        }
                                                        cursor="pointer"
                                                        stroke="none"
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="flex flex-nowrap gap-2 w-full px-2 justify-center items-center pb-2">
                                    {data?.map((entry, index) => (
                                        <div
                                            key={entry.name}
                                            className="border rounded-md px-2 py-1 text-[10px] sm:text-xs text-center cursor-pointer hover:bg-gray-100 flex items-center gap-2"
                                        >
                                            <div
                                                className="inline-block w-2 h-2 rounded flex-shrink-0"
                                                style={{
                                                    backgroundColor:
                                                        COLORS[
                                                            index %
                                                                COLORS.length
                                                        ],
                                                }}
                                            />
                                            <div className="flex flex-col text-[10px]">
                                                <p className="font-medium whitespace-nowrap text-slate-700 dark:text-slate-300">
                                                    {entry.name}
                                                </p>
                                                <p className="text-gray-650 dark:text-gray-400">
                                                    ({entry.displayPercent}%)
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
