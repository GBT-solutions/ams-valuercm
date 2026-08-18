import { useContext, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
    CalendarIcon,
    Monitor,
    User,
    Link2,
    Search,
    Check,
    X,
} from "lucide-react";

import apiService from "../utils/apiService";
import toaster from "../utils/toaster";
import Combobox from "../components/Combobox";
import SpinnerButton from "../components/ui/spinner-button";
import { formatDate, getSqlDate } from "../utils/helperFunctions";
import { Context } from "../utils/Context";

const getInitials = (name) => {
    if (!name) return "";
    return name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
};

const AddAllocation = () => {
    const { employees } = useContext(Context);
    const [inputValue, setInputValue] = useState({
        assetId: "",
        employeeCode: "",
        calenderSelectedDate: "",
    });
    const [fetchedDetails, setFetchedDetails] = useState({
        asset: null,
        employee: null,
    });
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState({
        editCalendar: false,
    });

    const handleFindDetails = async () => {
        setLoading(true);

        if (!inputValue.assetId || !inputValue.employeeCode) {
            toaster("error", "Asset ID and Employee Code is required");
            setLoading(false);
            return;
        }
        try {
            const response = await apiService.post("/taggings/details", {
                assetId: inputValue.assetId,
                employeeCode: inputValue.employeeCode,
            });
            setFetchedDetails(response.data);
        } catch (error) {
            if (error.response) {
                toaster("error", error.response.data.message);
            } else {
                toaster("error", "An unexpected error occurred");
            }
        } finally {
            setLoading(false);
        }
    };
    const handleTagging = async () => {
        setLoading(true);
        if (!fetchedDetails.asset || !fetchedDetails.employee) {
            toaster("error", "Please fetch details before tagging");
            setLoading(false);
            return;
        }
        try {
            await apiService.post("/taggings/add", {
                assetId: fetchedDetails.asset.id,
                employeeId: fetchedDetails.employee.id,
                assignedAt: getSqlDate(new Date()),
                assignedSubmission: getSqlDate(inputValue.calenderSelectedDate),
                remarks: fetchedDetails.asset.remarks || "",
            });
            toaster("success", "Asset tagged successfully");
            setFetchedDetails({ asset: null, employee: null });
            setInputValue({
                assetId: "",
                employeeCode: "",
                calenderSelectedDate: "",
            });
        } catch (error) {
            console.log(error);

            if (error.response) {
                toaster("error", error.response.data.message);
            } else {
                toaster("error", "An unexpected error occurred while tagging");
            }
        } finally {
            setLoading(false);
        }
    };
    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2">
                        <Link2 className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                        New Allocation
                    </h2>
                </div>
            </div>

            <div className="bg-card p-5 sm:p-6 rounded-xl border border-border shadow-sm">
            {!fetchedDetails.asset && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className=" mx-auto my-2 rounded-xl bg-card p-6"
                >
                    <div className="flex items-center gap-2.5 border-b border-border pb-3 mb-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Link2 size={18} />
                        </div>
                        <h3 className="font-semibold text-base text-foreground">
                            Asset & Employee Association
                        </h3>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        <div className="w-full sm:w-1/2 space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Asset ID <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="Enter asset id"
                                value={inputValue.assetId}
                                onChange={(e) =>
                                    setInputValue((prev) => ({
                                        ...prev,
                                        assetId: e.target?.value,
                                    }))
                                }
                                className="w-full border-border bg-white dark:bg-input"
                            />
                        </div>
                        <div className="w-full sm:w-1/2 space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Employee Code{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <Combobox
                                value={inputValue.employeeCode}
                                className="w-full border-border bg-white dark:bg-input"
                                items={employees}
                                hint="Select Employee"
                                onChange={(val) => {
                                    setInputValue({
                                        ...inputValue,
                                        employeeCode: val,
                                    });
                                }}
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-center mt-6">
                        <SpinnerButton
                            className="cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-48"
                            loading={loading}
                            disabled={loading}
                            loadingText="Finding Details..."
                            onClick={handleFindDetails}
                        >
                            <Search className="mr-2 h-4 w-4" /> Find Details
                        </SpinnerButton>
                    </div>
                </motion.div>
            )}
            {fetchedDetails.asset && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col gap-6"
                >
                    <div className="flex flex-col lg:flex-row w-full gap-5">
                        {/* Left Column: Asset Details */}
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05, duration: 0.25 }}
                            className="w-full lg:w-1/2 relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow duration-300"
                        >
                            <div className="flex items-center gap-2.5 border-b border-border pb-3 mb-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Monitor size={18} />
                                </div>
                                <h4 className="font-semibold text-base text-foreground">
                                    Asset Information
                                </h4>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                                <div>
                                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Asset ID
                                    </span>
                                    <span className="text-sm font-semibold text-foreground">
                                        {fetchedDetails.asset?.asset_id ||
                                            "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Serial
                                    </span>
                                    <span className="text-sm font-semibold text-foreground">
                                        {fetchedDetails.asset?.serial || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Type
                                    </span>
                                    <span className="text-sm font-medium text-foreground">
                                        {fetchedDetails.asset?.type || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Model No
                                    </span>
                                    <span className="text-sm font-medium text-foreground">
                                        {fetchedDetails.asset?.model_no ||
                                            "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Status
                                    </span>
                                    <div className="mt-1">
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider border ${
                                                fetchedDetails.asset?.status?.toLowerCase() ===
                                                    "active" ||
                                                fetchedDetails.asset?.status?.toLowerCase() ===
                                                    "allocated" ||
                                                fetchedDetails.asset?.status?.toLowerCase() ===
                                                    "tagged"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                                    : fetchedDetails.asset?.status?.toLowerCase() ===
                                                        "maintenance"
                                                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                                                      : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20"
                                            }`}
                                        >
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${
                                                    fetchedDetails.asset?.status?.toLowerCase() ===
                                                        "active" ||
                                                    fetchedDetails.asset?.status?.toLowerCase() ===
                                                        "allocated" ||
                                                    fetchedDetails.asset?.status?.toLowerCase() ===
                                                        "tagged"
                                                        ? "bg-emerald-500"
                                                        : fetchedDetails.asset?.status?.toLowerCase() ===
                                                            "maintenance"
                                                          ? "bg-amber-500"
                                                          : "bg-slate-500"
                                                }`}
                                            />
                                            {fetchedDetails.asset?.status ||
                                                "N/A"}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Location
                                    </span>
                                    <span className="text-sm font-medium text-foreground">
                                        {fetchedDetails.asset?.location ||
                                            "N/A"}
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Expiry Date
                                    </span>
                                    <span className="text-sm font-medium text-foreground">
                                        {fetchedDetails.asset?.exp_date
                                            ? formatDate(
                                                  new Date(
                                                      fetchedDetails.asset
                                                          ?.exp_date
                                                  )
                                              )
                                            : "N/A"}
                                    </span>
                                </div>

                                <div className="col-span-2 mt-2">
                                    <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                        Remarks / Comments
                                    </label>
                                    <Textarea
                                        className="resize-none focus-visible:ring-1 border-border min-h-[80px]"
                                        value={
                                            fetchedDetails.asset?.remarks || ""
                                        }
                                        onChange={(e) =>
                                            setFetchedDetails((prev) => ({
                                                ...prev,
                                                asset: {
                                                    ...prev.asset,
                                                    remarks: e.target.value,
                                                },
                                            }))
                                        }
                                        placeholder="Enter remarks or comments for this allocation..."
                                    />
                                </div>
                            </div>
                        </motion.div>

                        {/* Right Column: Employee and Allocation details */}
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1, duration: 0.25 }}
                            className="w-full lg:w-1/2 flex flex-col gap-4"
                        >
                            {/* Employee Details Card */}
                            <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                                <div className="flex items-center gap-2.5 border-b border-border pb-3 mb-4">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <User size={18} />
                                    </div>
                                    <h4 className="font-semibold text-base text-foreground">
                                        Employee Details
                                    </h4>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary/60 text-primary-foreground font-bold shadow-md shadow-primary/20 text-base">
                                        {getInitials(
                                            fetchedDetails.employee?.name
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Employee Name
                                        </span>
                                        <div className="text-sm font-semibold text-foreground">
                                            {fetchedDetails.employee?.name ||
                                                "N/A"}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded border border-border text-[11px]">
                                                ID:{" "}
                                                {fetchedDetails.employee
                                                    ?.emp_code || "N/A"}
                                            </span>
                                            {fetchedDetails.employee
                                                ?.status && (
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
                                                        fetchedDetails.employee?.status?.toLowerCase() ===
                                                            "active" ||
                                                        fetchedDetails.employee?.status?.toLowerCase() ===
                                                            "allocated" ||
                                                        fetchedDetails.employee?.status?.toLowerCase() ===
                                                            "tagged"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                                            : "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20"
                                                    }`}
                                                >
                                                    {
                                                        fetchedDetails.employee
                                                            ?.status
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tagging Options Card */}
                            <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                                <div className="flex items-center gap-2.5 border-b border-border pb-3 mb-4">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <CalendarIcon size={18} />
                                    </div>
                                    <h4 className="font-semibold text-base text-foreground">
                                        Allocation Options
                                    </h4>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Asset Submission Date{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <Button
                                        variant="outline"
                                        className="justify-start text-left font-normal w-full border-border bg-white dark:bg-input hover:bg-muted/50 cursor-pointer h-10 transition-colors"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setIsOpen((prev) => ({
                                                ...prev,
                                                editCalendar: true,
                                            }));
                                        }}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                        {inputValue.calenderSelectedDate ? (
                                            formatDate(
                                                new Date(
                                                    inputValue.calenderSelectedDate
                                                )
                                            )
                                        ) : (
                                            <span className="text-muted-foreground">
                                                Select expected return date
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mt-4 pt-4 border-t border-border">
                        <Button
                            variant="outline"
                            className="cursor-pointer w-full sm:w-36 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={() => {
                                setFetchedDetails({
                                    asset: null,
                                    employee: null,
                                });
                                setInputValue({
                                    assetId: "",
                                    employeeCode: "",
                                    calenderSelectedDate: "",
                                });
                            }}
                            disabled={loading}
                        >
                            <X className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                        <SpinnerButton
                            loading={loading}
                            disabled={loading}
                            loadingText="Tagging..."
                            onClick={handleTagging}
                            variant="outline"
                            className="cursor-pointer w-full sm:w-36 border-primary text-primary hover:bg-primary/10 hover:text-primary transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Check className="mr-2 h-4 w-4" /> Tag Asset
                        </SpinnerButton>
                    </div>
                </motion.div>
            )}
            <Dialog
                open={isOpen.editCalendar}
                onOpenChange={(set) =>
                    setIsOpen((prev) => ({ ...prev, editCalendar: set }))
                }
            >
                <DialogContent
                    className="[&>button.absolute]:hidden w-[300px]"
                    onPointerDownOutside={() =>
                        setIsOpen((prev) => ({ ...prev, editCalendar: false }))
                    }
                >
                    <DialogTitle className="hidden" />
                    <DialogDescription className="hidden" />
                    <Calendar
                        mode="single"
                        selected={inputValue.calenderSelectedDate}
                        onSelect={(e) => {
                            setInputValue((prev) => ({
                                ...prev,
                                calenderSelectedDate: e,
                            }));
                            setIsOpen((prev) => ({
                                ...prev,
                                editCalendar: false,
                            }));
                        }}
                        startMonth={new Date()}
                        toYear={2100}
                        captionLayout="dropdown"
                    />
                </DialogContent>
            </Dialog>
        </div>
        </div>
    );
};

export default AddAllocation;
