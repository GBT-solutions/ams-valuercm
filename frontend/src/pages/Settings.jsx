import { useState, useEffect } from "react";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import SpinnerButton from "../components/ui/spinner-button";
import { Timepicker } from "timepicker-ui-react";
import "timepicker-ui/index.css";
import {
    Save,
    CalendarClock,
    FileText,
    Database,
    Mail,
    Settings as SettingsIcon,
    Activity,
    X,
} from "lucide-react";
import { validateEmail } from "../utils/helperFunctions";
import toaster from "../utils/toaster";
import apiService from "../utils/apiService";

const cronToTime = (cronStr) => {
    if (!cronStr) return "12:00";
    const parts = cronStr.trim().split(/\s+/);
    if (parts.length !== 5) {
        if (/^(\d{1,2}:\d{2})(,\d{1,2}:\d{2})*$/.test(cronStr)) {
            return cronStr;
        }
        return "12:00";
    }
    const minute = parts[0].padStart(2, "0");
    const hourPart = parts[1];
    const hours = hourPart.split(",");
    return hours.map((h) => `${h.padStart(2, "0")}:${minute}`).join(",");
};

const format24hTo12h = (time24) => {
    if (!time24) return "12:00 PM";
    const match = time24.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return time24;
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${String(hour).padStart(2, "0")}:${minute} ${ampm}`;
};

const format12hTo24h = (data) => {
    if (!data || data.hour === undefined || data.minutes === undefined)
        return "";
    let hour = parseInt(data.hour, 10);
    const minute = String(data.minutes).padStart(2, "0");
    const ampm = (data.type || "AM").toUpperCase();

    if (ampm === "PM" && hour < 12) {
        hour += 12;
    } else if (ampm === "AM" && hour === 12) {
        hour = 0;
    }
    return `${String(hour).padStart(2, "0")}:${minute}`;
};

const Settings = () => {
    const [inputs, setInputs] = useState({
        exp_days: "",
        exp_emails: "",
        submission_days: "",
        submission_emails: "",
        backup_fail_email: "",
        exp_text: "",
        submission_text: "",
        backup_fail_text: "",
        running_emails: "",
        user: "",
        password: "",
        shared_folder: "",
        backup_ip: "",
        backup_schedule: "",
        status_report_schedule: "",
        backup_retry_count: "10",
        backup_retry_interval: "2",
    });

    const handleRemoveBackupTime = (timeToRemove) => {
        const currentList = inputs.backup_schedule
            ? inputs.backup_schedule
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
            : [];
        const newList = currentList.filter((t) => t !== timeToRemove);
        setInputs({ ...inputs, backup_schedule: newList.join(",") });
    };

    const handleAddBackupTime = (data) => {
        if (!data || data.hour === undefined || data.minutes === undefined)
            return;
        const time24 = format12hTo24h(data);
        if (!time24) return;
        const currentList = inputs.backup_schedule
            ? inputs.backup_schedule
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
            : [];
        if (!currentList.includes(time24)) {
            const newList = [...currentList, time24];
            setInputs({ ...inputs, backup_schedule: newList.join(",") });
        }
    };

    const handleRemoveStatusTime = (timeToRemove) => {
        const currentList = inputs.status_report_schedule
            ? inputs.status_report_schedule
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
            : [];
        const newList = currentList.filter((t) => t !== timeToRemove);
        setInputs({ ...inputs, status_report_schedule: newList.join(",") });
    };

    const handleAddStatusTime = (data) => {
        if (!data || data.hour === undefined || data.minutes === undefined)
            return;
        const time24 = format12hTo24h(data);
        if (!time24) return;
        const currentList = inputs.status_report_schedule
            ? inputs.status_report_schedule
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
            : [];
        if (!currentList.includes(time24)) {
            const newList = [...currentList, time24];
            setInputs({ ...inputs, status_report_schedule: newList.join(",") });
        }
    };

    const [isDark, setIsDark] = useState(() =>
        document.documentElement.classList.contains("dark")
    );

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains("dark"));
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, []);

    const [loading, setIsLoading] = useState({
        loading: false,
        disabled: false,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Stringify thresholds to safely call trim()
        const expDaysStr = String(inputs.exp_days ?? "");
        const subDaysStr = String(inputs.submission_days ?? "");

        if (
            !expDaysStr.trim() ||
            !inputs.exp_emails?.trim() ||
            !subDaysStr.trim() ||
            !inputs.submission_emails?.trim() ||
            !inputs.backup_fail_email?.trim() ||
            !inputs.backup_fail_text?.trim() ||
            !inputs.exp_text?.trim() ||
            !inputs.submission_text?.trim() ||
            !inputs.running_emails?.trim() ||
            !inputs.backup_schedule?.trim() ||
            !inputs.status_report_schedule?.trim()
        ) {
            toaster("error", "Please fill all required fields");
            return;
        }

        let emails = inputs.exp_emails.split(",");
        for (let i = emails.length - 1; i >= 0; i--) {
            if (!emails[i].trim()) {
                emails.splice(i, 1);
                continue;
            }
            emails[i] = emails[i].trim();
            if (!validateEmail(emails[i])) {
                toaster(
                    "error",
                    "Invalid email format in Expiry Notifications"
                );
                return;
            }
        }
        const exp_emails = emails.join(",");

        emails = inputs.submission_emails.split(",");
        for (let i = emails.length - 1; i >= 0; i--) {
            if (!emails[i].trim()) {
                emails.splice(i, 1);
                continue;
            }
            emails[i] = emails[i].trim();
            if (!validateEmail(emails[i])) {
                toaster(
                    "error",
                    "Invalid email format in Submission Notifications"
                );
                return;
            }
        }
        const submission_emails = emails.join(",");

        emails = inputs.backup_fail_email.split(",");
        for (let i = emails.length - 1; i >= 0; i--) {
            if (!emails[i].trim()) {
                emails.splice(i, 1);
                continue;
            }
            emails[i] = emails[i].trim();
            if (!validateEmail(emails[i])) {
                toaster(
                    "error",
                    "Invalid email format in Backup Failure Notifications"
                );
                return;
            }
        }
        const backup_fail_email = emails.join(",");

        emails = inputs.running_emails.split(",");
        for (let i = emails.length - 1; i >= 0; i--) {
            if (!emails[i].trim()) {
                emails.splice(i, 1);
                continue;
            }
            emails[i] = emails[i].trim();
            if (!validateEmail(emails[i])) {
                toaster(
                    "error",
                    "Invalid email format in Service Status Reports"
                );
                return;
            }
        }
        const running_emails = emails.join(",");

        if (
            parseInt(inputs.exp_days) < 0 ||
            parseInt(inputs.submission_days) < 0
        ) {
            toaster("error", "Please enter valid positive days");
            return;
        }

        const data = {
            exp_days: parseInt(inputs.exp_days),
            exp_emails: exp_emails,
            submission_days: parseInt(inputs.submission_days),
            submission_emails: submission_emails,
            backup_fail_email: backup_fail_email,
            backup_fail_text: inputs.backup_fail_text,
            submission_text: inputs.submission_text,
            exp_text: inputs.exp_text,
            running_emails: running_emails,
            user: inputs.user,
            password: inputs.password,
            shared_folder: inputs.shared_folder,
            backup_ip: inputs.backup_ip,
            backup_schedule: inputs.backup_schedule,
            status_report_schedule: inputs.status_report_schedule,
            backup_retry_count: inputs.backup_retry_count !== undefined && inputs.backup_retry_count !== "" ? inputs.backup_retry_count : "10",
            backup_retry_interval: inputs.backup_retry_interval !== undefined && inputs.backup_retry_interval !== "" ? inputs.backup_retry_interval : "2",
        };

        setIsLoading((prev) => ({ ...prev, loading: true }));
        try {
            const response = await apiService.post("/config/update", data);
            if (response.success) {
                toaster("success", "Settings updated successfully");
            } else {
                toaster("error", "Failed to update settings");
            }
        } catch (error) {
            const errMsg = error?.response?.data?.message || error.message;
            toaster("error", errMsg);
        } finally {
            setIsLoading((prev) => ({ ...prev, loading: false }));
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await apiService.get("/config");

            if (response.success) {
                const data = response.data;
                data.backup_schedule = cronToTime(
                    data.backup_schedule || "0 6,18 * * *"
                );
                data.status_report_schedule = cronToTime(
                    data.status_report_schedule || "0 5 * * *"
                );
                if (data.backup_retry_count === undefined || data.backup_retry_count === "") {
                    data.backup_retry_count = "10";
                }
                if (data.backup_retry_interval === undefined || data.backup_retry_interval === "") {
                    data.backup_retry_interval = "2";
                }
                setInputs(data);
            } else {
                toaster("error", "Failed to fetch settings");
                setIsLoading((prev) => ({ ...prev, disabled: true }));
            }
        } catch (error) {
            console.log(error);
            setIsLoading((prev) => ({ ...prev, disabled: true }));
            toaster("error", "Failed to fetch settings");
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2">
                        <SettingsIcon className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                        System Settings
                    </h2>
                </div>
            </div>

            <div className="w-full flex flex-col gap-4 p-4 sm:p-5 bg-white dark:bg-card border border-gray-200/80 dark:border-border rounded-xl shadow-xs">
                {/* Notification alert cards container */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Expiry Alert Settings Card */}
                        <div className="bg-neutral-50/50 dark:bg-neutral-900/30 border border-gray-200/60 dark:border-border/50 rounded-xl p-4 flex flex-col gap-3 shadow-md hover:shadow-lg transition-shadow duration-200">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-200/60 dark:border-gray-800">
                                <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <CalendarClock className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                        Asset Expiry Alerts
                                    </h2>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {/* Days Threshold */}
                                <div className="flex flex-col gap-1">
                                    <Label
                                        htmlFor="exp_days"
                                        className="text-gray-700 dark:text-gray-300 font-medium text-xs"
                                    >
                                        Alert Trigger (Days)
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="exp_days"
                                            type="number"
                                            min="0"
                                            placeholder="e.g. 30"
                                            value={inputs.exp_days}
                                            onChange={(e) =>
                                                setInputs({
                                                    ...inputs,
                                                    exp_days: e.target.value,
                                                })
                                            }
                                            className="pr-12"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                                            days before
                                        </span>
                                    </div>
                                </div>

                                {/* Recipients Emails */}
                                <div className="flex flex-col gap-1">
                                    <Label
                                        htmlFor="exp_emails"
                                        className="text-gray-700 dark:text-gray-300 font-medium text-xs flex items-center justify-between"
                                    >
                                        <span>Recipient Email Addresses</span>
                                        <span className="text-[9px] text-gray-400 font-normal">
                                            Comma-separated
                                        </span>
                                    </Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            <Mail className="w-3.5 h-3.5" />
                                        </div>
                                        <Input
                                            id="exp_emails"
                                            type="text"
                                            placeholder="admin@example.com, user@example.com"
                                            value={inputs.exp_emails}
                                            onChange={(e) =>
                                                setInputs({
                                                    ...inputs,
                                                    exp_emails: e.target.value,
                                                })
                                            }
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                {/* Email template text */}
                                <div className="flex flex-col gap-1">
                                    <Label
                                        htmlFor="exp_text"
                                        className="text-gray-700 dark:text-gray-300 font-medium text-xs"
                                    >
                                        Email Body Message
                                    </Label>
                                    <Textarea
                                        id="exp_text"
                                        placeholder="The following assets are about to expire..."
                                        value={inputs.exp_text}
                                        onChange={(e) =>
                                            setInputs({
                                                ...inputs,
                                                exp_text: e.target.value,
                                            })
                                        }
                                        className="min-h-16 text-xs resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submission Alert Settings Card */}
                        <div className="bg-neutral-50/50 dark:bg-neutral-900/30 border border-gray-200/60 dark:border-border/50 rounded-xl p-4 flex flex-col gap-3 shadow-md hover:shadow-lg transition-shadow duration-200">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-200/60 dark:border-gray-800">
                                <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                        Asset Submission Alerts
                                    </h2>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {/* Days Threshold */}
                                <div className="flex flex-col gap-1">
                                    <Label
                                        htmlFor="submission_days"
                                        className="text-gray-700 dark:text-gray-300 font-medium text-xs"
                                    >
                                        Alert Trigger (Days)
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="submission_days"
                                            type="number"
                                            min="0"
                                            placeholder="e.g. 7"
                                            value={inputs.submission_days}
                                            onChange={(e) =>
                                                setInputs({
                                                    ...inputs,
                                                    submission_days:
                                                        e.target.value,
                                                })
                                            }
                                            className="pr-12"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                                            days before
                                        </span>
                                    </div>
                                </div>

                                {/* Recipients Emails */}
                                <div className="flex flex-col gap-1">
                                    <Label
                                        htmlFor="submission_emails"
                                        className="text-gray-700 dark:text-gray-300 font-medium text-xs flex items-center justify-between"
                                    >
                                        <span>Recipient Email Addresses</span>
                                        <span className="text-[9px] text-gray-400 font-normal">
                                            Comma-separated
                                        </span>
                                    </Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            <Mail className="w-3.5 h-3.5" />
                                        </div>
                                        <Input
                                            id="submission_emails"
                                            type="text"
                                            placeholder="admin@example.com, manager@example.com"
                                            value={inputs.submission_emails}
                                            onChange={(e) =>
                                                setInputs({
                                                    ...inputs,
                                                    submission_emails:
                                                        e.target.value,
                                                })
                                            }
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                {/* Email template text */}
                                <div className="flex flex-col gap-1">
                                    <Label
                                        htmlFor="submission_text"
                                        className="text-gray-700 dark:text-gray-300 font-medium text-xs"
                                    >
                                        Email Body Message
                                    </Label>
                                    <Textarea
                                        id="submission_text"
                                        placeholder="The following allocated assets are due for submission..."
                                        value={inputs.submission_text}
                                        onChange={(e) =>
                                            setInputs({
                                                ...inputs,
                                                submission_text: e.target.value,
                                            })
                                        }
                                        className="min-h-16 text-xs resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Backup Failure Alerts Card */}
                        <div className="bg-neutral-50/50 dark:bg-neutral-900/30 border border-gray-200/60 dark:border-border/50 rounded-xl p-4 flex flex-col gap-3 shadow-md hover:shadow-lg transition-shadow duration-200">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-200/60 dark:border-gray-800">
                                <div className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg">
                                    <Database className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                        Backup Failure Alerts
                                    </h2>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {/* Recipients Emails */}
                                <div className="flex flex-col gap-1">
                                    <Label
                                        htmlFor="backup_fail_email"
                                        className="text-gray-700 dark:text-gray-300 font-medium text-xs flex items-center justify-between"
                                    >
                                        <span>Recipient Email Addresses</span>
                                        <span className="text-[9px] text-gray-400 font-normal">
                                            Comma-separated
                                        </span>
                                    </Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            <Mail className="w-3.5 h-3.5" />
                                        </div>
                                        <Input
                                            id="backup_fail_email"
                                            type="text"
                                            placeholder="admin@example.com"
                                            value={inputs.backup_fail_email}
                                            onChange={(e) =>
                                                setInputs({
                                                    ...inputs,
                                                    backup_fail_email:
                                                        e.target.value,
                                                })
                                            }
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                {/* Email template text */}
                                <div className="flex flex-col gap-1">
                                    <Label
                                        htmlFor="backup_fail_text"
                                        className="text-gray-700 dark:text-gray-300 font-medium text-xs"
                                    >
                                        Email Body Message
                                    </Label>
                                    <Textarea
                                        id="backup_fail_text"
                                        placeholder="Alert: The scheduled system backup has failed..."
                                        value={inputs.backup_fail_text}
                                        onChange={(e) =>
                                            setInputs({
                                                ...inputs,
                                                backup_fail_text:
                                                    e.target.value,
                                            })
                                        }
                                        className="min-h-16 text-xs resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Service Status Reports Card */}
                        <div className="bg-neutral-50/50 dark:bg-neutral-900/30 border border-gray-200/60 dark:border-border/50 rounded-xl p-4 flex flex-col gap-3 shadow-md hover:shadow-lg transition-shadow duration-200">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-200/60 dark:border-gray-800">
                                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                    <Activity className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                        Service Status Reports
                                    </h2>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 h-full justify-between">
                                {/* Recipients Emails */}
                                <div className="flex flex-col gap-1">
                                    <Label
                                        htmlFor="running_emails"
                                        className="text-gray-700 dark:text-gray-300 font-medium text-xs flex items-center justify-between"
                                    >
                                        <span>Recipient Email Addresses</span>
                                        <span className="text-[9px] text-gray-400 font-normal">
                                            Comma-separated
                                        </span>
                                    </Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            <Mail className="w-3.5 h-3.5" />
                                        </div>
                                        <Input
                                            id="running_emails"
                                            type="text"
                                            placeholder="admin@example.com, manager@example.com"
                                            value={inputs.running_emails}
                                            onChange={(e) =>
                                                setInputs({
                                                    ...inputs,
                                                    running_emails:
                                                        e.target.value,
                                                })
                                            }
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Scheduler Settings Card */}
                        <div className="bg-neutral-50/50 dark:bg-neutral-900/30 border border-gray-200/60 dark:border-border/50 rounded-xl p-4 flex flex-col gap-3 shadow-md hover:shadow-lg transition-shadow duration-200 col-span-1 md:col-span-2">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-200/60 dark:border-gray-800">
                                <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <CalendarClock className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                        Task Scheduler Settings
                                    </h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Backup & Alerts Schedule */}
                                <div className="flex flex-col gap-1.5 p-3 bg-white/50 dark:bg-neutral-900/40 rounded-lg border border-gray-200/50 dark:border-border/40 justify-between">
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-gray-700 dark:text-gray-300 font-medium text-xs flex items-center justify-between">
                                            <span>Backup & Alerts Run Times</span>
                                        </Label>

                                        {/* Chips for multiple times */}
                                        <div className="flex flex-wrap gap-1.5 mb-1.5 min-h-8 p-1.5 bg-neutral-100/50 dark:bg-neutral-800/20 rounded-lg border border-dashed border-gray-200 dark:border-border/60">
                                            {(() => {
                                                const list = inputs.backup_schedule
                                                    ? inputs.backup_schedule
                                                          .split(",")
                                                          .map((t) => t.trim())
                                                          .filter(Boolean)
                                                    : [];
                                                if (list.length === 0) {
                                                    return (
                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 self-center px-1">
                                                            No run times selected
                                                        </span>
                                                    );
                                                }
                                                return list.map((time) => (
                                                    <span
                                                        key={time}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-md border border-blue-200/80 dark:border-blue-800/80"
                                                    >
                                                        {format24hTo12h(time)}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRemoveBackupTime(
                                                                    time
                                                                )
                                                            }
                                                            className="hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-sm p-0.5 text-blue-500 dark:text-blue-400 transition-colors cursor-pointer"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ));
                                            })()}
                                        </div>

                                        <Timepicker
                                            className="w-full bg-white dark:bg-neutral-900 border border-gray-200/80 dark:border-border rounded-lg text-sm px-3 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 cursor-pointer"
                                            placeholder="Click to add run time..."
                                            value=""
                                            readOnly={true}
                                            options={{
                                                clockType: "12h",
                                                theme: "basic",
                                            }}
                                            onConfirm={(data) =>
                                                handleAddBackupTime(data)
                                            }
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                        Controls when Expiry/Submission alerts
                                        are checked and Database Backup is run.
                                        Multiple times can be added.
                                    </p>
                                </div>

                                {/* Status Report Schedule */}
                                <div className="flex flex-col gap-1.5 p-3 bg-white/50 dark:bg-neutral-900/40 rounded-lg border border-gray-200/50 dark:border-border/40 justify-between">
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-gray-700 dark:text-gray-300 font-medium text-xs flex items-center justify-between">
                                            <span>Status Report Run Times</span>
                                        </Label>

                                        {/* Chips for multiple times */}
                                        <div className="flex flex-wrap gap-1.5 mb-1.5 min-h-8 p-1.5 bg-neutral-100/50 dark:bg-neutral-800/20 rounded-lg border border-dashed border-gray-200 dark:border-border/60">
                                            {(() => {
                                                const list =
                                                    inputs.status_report_schedule
                                                        ? inputs.status_report_schedule
                                                              .split(",")
                                                              .map((t) => t.trim())
                                                              .filter(Boolean)
                                                        : [];
                                                if (list.length === 0) {
                                                    return (
                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 self-center px-1">
                                                            No report times selected
                                                        </span>
                                                    );
                                                }
                                                return list.map((time) => (
                                                    <span
                                                        key={time}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-md border border-emerald-200/80 dark:border-emerald-800/80"
                                                    >
                                                        {format24hTo12h(time)}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRemoveStatusTime(
                                                                    time
                                                                )
                                                            }
                                                            className="hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-sm p-0.5 text-emerald-500 dark:text-emerald-400 transition-colors cursor-pointer"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ));
                                            })()}
                                        </div>

                                        <Timepicker
                                            className="w-full bg-white dark:bg-neutral-900 border border-gray-200/80 dark:border-border rounded-lg text-sm px-3 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 cursor-pointer"
                                            placeholder="Click to add report time..."
                                            value=""
                                            readOnly={true}
                                            options={{
                                                clockType: "12h",
                                                theme: "basic",
                                            }}
                                            onConfirm={(data) =>
                                                handleAddStatusTime(data)
                                            }
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                        Controls when the system status report
                                        email is sent. Multiple times can be
                                        added.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Network Backup Configuration Card */}
                        <div className="bg-neutral-50/50 dark:bg-neutral-900/30 border border-gray-200/60 dark:border-border/50 rounded-xl p-4 flex flex-col gap-3 shadow-md hover:shadow-lg transition-shadow duration-200 col-span-1 md:col-span-2">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-200/60 dark:border-gray-800">
                                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                    <Database className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                        Network Backup Configuration
                                    </h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Backup User */}
                                <div className="flex flex-col gap-1">
                                    <Label
                                        htmlFor="backup_user"
                                        className="text-gray-700 dark:text-gray-300 font-medium text-xs"
                                    >
                                        Network PC Username
                                    </Label>
                                    <Input
                                        id="backup_user"
                                        type="text"
                                        placeholder="Username"
                                        value={inputs.user || ""}
                                        onChange={(e) =>
                                            setInputs({
                                                ...inputs,
                                                user: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                {/* Backup Password */}
                                <div className="flex flex-col gap-1">
                                    <Label
                                        htmlFor="backup_password"
                                        className="text-gray-700 dark:text-gray-300 font-medium text-xs"
                                    >
                                        Network PC Password
                                    </Label>
                                    <Input
                                        id="backup_password"
                                        type="password"
                                        placeholder="Password"
                                        value={inputs.password || ""}
                                        onChange={(e) =>
                                            setInputs({
                                                ...inputs,
                                                password: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                {/* Backup PC IP */}
                                <div className="flex flex-col gap-1">
                                    <Label
                                        htmlFor="backup_ip"
                                        className="text-gray-700 dark:text-gray-300 font-medium text-xs"
                                    >
                                        Backup PC IP Address
                                    </Label>
                                    <Input
                                        id="backup_ip"
                                        type="text"
                                        placeholder="e.g. 192.168.1.100"
                                        value={inputs.backup_ip || ""}
                                        onChange={(e) =>
                                            setInputs({
                                                ...inputs,
                                                backup_ip: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                {/* Shared Folder */}
                                <div className="flex flex-col gap-1">
                                    <Label
                                        htmlFor="shared_folder"
                                        className="text-gray-700 dark:text-gray-300 font-medium text-xs"
                                    >
                                        Shared Folder Name
                                    </Label>
                                    <Input
                                        id="shared_folder"
                                        type="text"
                                        placeholder="e.g. DbBackups"
                                        value={inputs.shared_folder || ""}
                                        onChange={(e) =>
                                            setInputs({
                                                ...inputs,
                                                shared_folder: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                {/* Backup Retry Count */}
                                <div className="flex flex-col gap-1">
                                    <Label
                                        htmlFor="backup_retry_count"
                                        className="text-gray-700 dark:text-gray-300 font-medium text-xs"
                                    >
                                        Scheduled Backup Retry Count
                                    </Label>
                                    <Input
                                        id="backup_retry_count"
                                        type="number"
                                        min="1"
                                        placeholder="Default: 10"
                                        value={inputs.backup_retry_count ?? "10"}
                                        onChange={(e) =>
                                            setInputs({
                                                ...inputs,
                                                backup_retry_count: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                {/* Backup Retry Interval */}
                                <div className="flex flex-col gap-1">
                                    <Label
                                        htmlFor="backup_retry_interval"
                                        className="text-gray-700 dark:text-gray-300 font-medium text-xs"
                                    >
                                        Backup Retry Delay (Minutes)
                                    </Label>
                                    <Input
                                        id="backup_retry_interval"
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        placeholder="Default: 2"
                                        value={inputs.backup_retry_interval ?? "2"}
                                        onChange={(e) =>
                                            setInputs({
                                                ...inputs,
                                                backup_retry_interval: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Form Save Button */}
                        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
                            <SpinnerButton
                                className="cursor-pointer shadow-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-1.5 rounded-lg flex items-center gap-2 text-sm"
                                loading={loading.loading}
                                onClick={handleSubmit}
                                disabled={loading.loading || loading.disabled}
                                loadingText="Saving..."
                            >
                                <Save className="w-4 h-4" />
                                Save Settings
                            </SpinnerButton>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
