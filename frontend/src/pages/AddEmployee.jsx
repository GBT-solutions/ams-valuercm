import { useContext, useState } from "react";
import Papa from "papaparse";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, Download, AlertCircle, UserPlus } from "lucide-react";
import { cn } from "../lib/utils";

import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import SpinnerButton from "../components/ui/spinner-button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";

import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "../components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    capitalizeWords,
    validateEmployeeCode,
    validateStatus,
} from "../utils/helperFunctions";
import toaster from "../utils/toaster";
import apiService from "../utils/apiService";
import { Context } from "../utils/Context";

const AddEmployee = () => {
    const navigate = useNavigate();
    const { setEmployees } = useContext(Context);
    const [activeTab, setActiveTab] = useState("Single");
    const [form, setForm] = useState({
        employeeCode: "",
        employeeName: "",
        status: "active",
    });

    const [csvFile, setCsvFile] = useState(null);
    const [csvData, setCsvData] = useState([]);
    const [csvErrors, setCsvErrors] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadResults, setUploadResults] = useState(null);
    const [booleanStates, setBooleanStates] = useState({
        errorDialog: false,
        resultsDialog: false,
        isUploading: false,
        isAdding: false,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = (value) => {
        setForm((prev) => ({ ...prev, status: value }));
    };

    const processCsvFile = (file) => {
        if (!file || file.type !== "text/csv") {
            toaster("error", "Please select a valid CSV file");
            return;
        }

        setCsvFile(file);

        Papa.parse(file, {
            header: true, // Treat first row as headers
            skipEmptyLines: true,
            transformHeader: (header) => header.trim().toLowerCase(),
            complete: (results) => {
                const errors = [];
                const validRows = [];

                // Header normalization map
                const headerMap = {
                    emp_code: "empcode",
                    empcode: "empcode",
                    emp_name: "empname",
                    empname: "empname",
                    name: "empname",
                    status: "status",
                };

                // Normalize headers in results
                const normalizedData = results.data.map((row) => {
                    const normalized = {};
                    for (const key in row) {
                        const mappedKey = headerMap[key] || key;
                        normalized[mappedKey] = row[key]?.trim();
                    }
                    return normalized;
                });

                // Validate required headers
                const requiredHeaders = ["empcode", "empname", "status"];
                const presentHeaders = Object.keys(normalizedData[0] || {});
                const missingHeaders = requiredHeaders.filter(
                    (header) => !presentHeaders.includes(header)
                );

                if (missingHeaders.length > 0) {
                    errors.push({
                        type: "missing required headers",
                        message: `Missing required headers: ${missingHeaders.join(
                            ", "
                        )}. Required headers: ${requiredHeaders.join(", ")}`,
                    });
                    setCsvData([]);
                    setCsvErrors(errors);
                    return;
                }

                // Validate rows
                normalizedData.forEach((row, index) => {
                    const lineNumber = index + 2; // +2 because CSV headers are line 1
                    let hasError = false;

                    if (
                        !row.empcode ||
                        !validateEmployeeCode(row.empcode.toUpperCase())
                    ) {
                        errors.push({
                            type: "invalid employee code",
                            line: lineNumber,
                            empcode: row.empcode,
                            message: `Invalid employee code format: ${row.empcode}. Expected format: XX123456 (2 letters + 6-9 digits)`,
                        });
                        hasError = true;
                    } else {
                        row.empcode = row.empcode.toUpperCase();
                    }

                    row.empname = capitalizeWords(row.empname || "");

                    if (!validateStatus(row.status)) {
                        errors.push({
                            type: "invalid status",
                            line: lineNumber,
                            status: row.status,
                            message: `Invalid status: ${row.status}. Must be either "Active" or "Inactive"`,
                        });
                        hasError = true;
                    }

                    if (!hasError) {
                        validRows.push(row);
                    }
                });

                setCsvData(validRows);
                setCsvErrors(errors);
            },
        });
    };

    const handleCsvFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            processCsvFile(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (csvErrors.length > 0) {
            setBooleanStates((prev) => ({
                ...prev,
                errorDialog: true,
            }));
            return;
        }

        if (csvFile) {
            await uploadFile();
        }
    };

    const sendCsvFile = async () => {
        await uploadFile();
    };

    const uploadFile = async () => {
        setBooleanStates((prev) => ({
            ...prev,
            errorDialog: false,
            isUploading: true,
        }));

        try {
            // Send CSV file to backend
            const response = await apiService.uploadFile(
                "/employees/upload-csv",
                csvFile
            );

            if (response.success) {
                toaster("success", "File uploaded successfully!");

                // Set upload results for dialog
                console.log("Upload Results:", response.data);

                setUploadResults(response.data);
                setBooleanStates((prev) => ({
                    ...prev,
                    resultsDialog: true,
                }));

                // Clear form after successful upload
                setCsvFile(null);
                setCsvData([]);
                setCsvErrors([]);

                // Clear file input
                const fileInput = document.getElementById("csvFile");
                if (fileInput) {
                    fileInput.value = "";
                }
            } else {
                toaster("error", response.message || "Upload failed");
            }
        } catch (error) {
            const errorMessage =
                error.response?.data?.message ||
                "Upload failed. Please try again.";
            toaster("error", errorMessage);
        } finally {
            setBooleanStates((prev) => ({
                ...prev,
                isUploading: false,
            }));
        }
    };

    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        if (!validateEmployeeCode(form.employeeCode)) {
            toaster(
                "error",
                "Invalid employee code format. Expected format: XX123456 (2 letters + 4-7 digits)"
            );
            return;
        }

        try {
            setBooleanStates((prev) => ({ ...prev, isAdding: true }));
            const response = await apiService.post("/employees/add", {
                emp_code: form.employeeCode,
                name: form.employeeName,
                status: form.status,
            });
            setBooleanStates((prev) => ({ ...prev, isAdding: false }));
            if (response.success) {
                toaster("success", "Employee added successfully!");
                setEmployees((prev) => [
                    ...prev,
                    {
                        label: `${form.employeeCode} - ${form.employeeName}`,
                        value: form.employeeCode,
                    },
                ]);
                setForm({
                    employeeCode: "",
                    employeeName: "",
                    status: "active",
                });
                navigate("/employee-list");
            } else {
                toaster("error", response.message || "Failed to add employee");
            }
        } catch (error) {
            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                "Failed to add employee";
            toaster("error", errorMessage);
        } finally {
            setBooleanStates((prev) => ({ ...prev, isAdding: false }));
        }
    };

    const handleSampleCsv = async () => {
        try {
            await apiService.downloadFile(
                "/employees/sample-csv",
                "sample_employees.csv"
            );
        } catch (error) {
            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                "Failed to download sample CSV";
            toaster("error", errorMessage);
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2">
                        <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                        Add Employee
                    </h2>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-start mb-6">
                <TabsList className="flex p-1 bg-neutral-100 dark:bg-neutral-900/60 rounded-xl w-full sm:w-auto">
                    <TabsTrigger
                        className="cursor-pointer flex-1 sm:flex-none sm:w-36 py-2 px-6 rounded-lg text-sm font-medium transition-all duration-150 data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-neutral-900 dark:data-[state=active]:text-neutral-100 data-[state=active]:shadow-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 border-none"
                        value="Single"
                    >
                        Single Entry
                    </TabsTrigger>
                    <TabsTrigger
                        className="cursor-pointer flex-1 sm:flex-none sm:w-36 py-2 px-6 rounded-lg text-sm font-medium transition-all duration-150 data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-neutral-900 dark:data-[state=active]:text-neutral-100 data-[state=active]:shadow-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 border-none"
                        value="Bulk"
                    >
                        Bulk Upload
                    </TabsTrigger>
                </TabsList>
            </div>
            
            <AnimatePresence mode="wait" initial={false}>
                {activeTab === "Single" && (
                    <TabsContent
                        key="Single"
                        value="Single"
                        forceMount
                        className="flex flex-col w-full h-full gap-4"
                        style={{ display: "flex" }}
                    >
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="w-full"
                        >
                            <div className="w-full max-w-xl mt-1 mx-auto p-6 sm:p-8 bg-white dark:bg-card rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-md shadow-slate-100/40 dark:shadow-none space-y-6 mb-6">
                                <form onSubmit={handleSingleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="employeeCode" className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1 flex items-center gap-0.5">
                                            Employee Code <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="employeeCode"
                                            name="employeeCode"
                                            value={form.employeeCode}
                                            onChange={handleChange}
                                            placeholder="Enter employee code (e.g. AB123456)"
                                            required
                                            className="rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="employeeName" className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1 flex items-center gap-0.5">
                                            Employee Name <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="employeeName"
                                            name="employeeName"
                                            value={form.employeeName}
                                            onChange={handleChange}
                                            placeholder="Enter employee name"
                                            required
                                            className="rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="status" className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 ms-1 flex items-center gap-0.5">
                                            Status <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={form.status}
                                            onValueChange={handleStatusChange}
                                        >
                                            <SelectTrigger
                                                id="status"
                                                name="status"
                                                className="w-full rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card h-10 px-3.5 text-sm"
                                            >
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
                                        <SpinnerButton
                                            loading={booleanStates.isAdding}
                                            loadingText="Adding Employee..."
                                            disabled={booleanStates.isAdding}
                                            type="submit"
                                            className="w-full cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:text-neutral-900 dark:hover:bg-blue-400 border-0 shadow-sm transition-all duration-150 py-2.5 h-11 font-medium text-base"
                                        >
                                            Add Employee
                                        </SpinnerButton>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </TabsContent>
                )}
                {activeTab === "Bulk" && (
                    <TabsContent
                        key="Bulk"
                        value="Bulk"
                        forceMount
                        className="flex flex-col w-full h-full gap-4"
                        style={{ display: "flex" }}
                    >
                        <motion.div
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="w-full"
                        >
                            <div className="w-full max-w-4xl mt-1 mx-auto p-6 sm:p-8 bg-white dark:bg-card rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-md shadow-slate-100/40 dark:shadow-none space-y-6 mb-6">
                                <div className="space-y-4">
                                    {/* Drag & Drop Zone */}
                                    <div
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDragging(true);
                                        }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setIsDragging(false);
                                            const file = e.dataTransfer.files[0];
                                            if (file) {
                                                processCsvFile(file);
                                            }
                                        }}
                                        className={cn(
                                            "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[200px]",
                                            isDragging
                                                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                                                : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/30 dark:bg-neutral-900/10"
                                        )}
                                        onClick={() => document.getElementById("csvFile")?.click()}
                                    >
                                        <input
                                            id="csvFile"
                                            type="file"
                                            accept=".csv"
                                            onChange={handleCsvFileChange}
                                            className="hidden"
                                        />
                                        
                                        <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-600 dark:text-neutral-400 mb-4">
                                            <UploadCloud className="h-8 w-8 text-neutral-500 dark:text-neutral-400" />
                                        </div>
                                        
                                        {csvFile ? (
                                            <div className="text-center space-y-1.5">
                                                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-center gap-1.5">
                                                    <FileText className="h-4 w-4 text-blue-500" /> {csvFile.name}
                                                </p>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                    {(csvFile.size / 1024).toFixed(1)} KB • Ready to validate
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-center space-y-1">
                                                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                                                    Click to upload or drag & drop CSV file
                                                </p>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                    Excel/CSV standard format supported
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Requirements & Download Info */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/30 border border-neutral-200/50 dark:border-neutral-800/50 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                                                Requirements
                                            </p>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xl">
                                                CSV must include: <code className="px-1 py-0.5 rounded bg-neutral-250 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-205 font-mono">empcode</code>, <code className="px-1 py-0.5 rounded bg-neutral-250 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-205 font-mono">empname</code>, and <code className="px-1 py-0.5 rounded bg-neutral-250 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-205 font-mono">status</code> columns.
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            type="button"
                                            onClick={handleSampleCsv}
                                            className="cursor-pointer text-xs font-semibold flex items-center gap-1.5 h-9 rounded-lg border-neutral-250 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                                        >
                                            <Download className="h-3.5 w-3.5" /> Download Sample CSV
                                        </Button>
                                    </div>

                                    {csvErrors.length > 0 &&
                                        csvErrors.some(
                                            (error) =>
                                                error.type ===
                                                "missing required headers"
                                        ) && (
                                            <div className="mt-2 p-4 border border-red-200 dark:border-red-900/30 rounded-xl bg-red-50/50 dark:bg-red-950/20 flex gap-3">
                                                <AlertCircle className="h-5 w-5 text-red-650 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                                                        Invalid CSV Format
                                                    </p>
                                                    <p className="text-xs text-red-655 dark:text-red-405 mt-1 leading-relaxed">
                                                        {
                                                            csvErrors.find(
                                                                (error) =>
                                                                    error.type ===
                                                                    "missing required headers"
                                                            )?.message
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                </div>

                                {csvFile && (
                                    <div className="space-y-4 pt-2">
                                        {csvData.length > 0 && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                                                        Data Preview (First 3 rows)
                                                    </h3>
                                                    <span className="text-xs bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 px-2.5 py-0.5 rounded-full font-medium">
                                                        {csvData.length} records ready
                                                    </span>
                                                </div>
                                                <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card">
                                                    <Table className="w-full text-xs sm:text-sm">
                                                        <TableHeader className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800">
                                                            <TableRow>
                                                                {Object.keys(csvData[0] || {}).map((header) => (
                                                                    <TableHead
                                                                        key={header}
                                                                        className="h-10 px-4 font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[10px]"
                                                                    >
                                                                        {header === "empcode" ? "Employee Code" : header === "empname" ? "Employee Name" : header}
                                                                    </TableHead>
                                                                ))}
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {csvData.slice(0, 3).map((row, index) => (
                                                                <TableRow
                                                                    key={index}
                                                                    className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors"
                                                                >
                                                                    {Object.values(row).map((value, cellIndex) => (
                                                                        <TableCell
                                                                            key={cellIndex}
                                                                            className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100"
                                                                        >
                                                                            {cellIndex === 2 ? (
                                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-805 dark:bg-neutral-800 dark:text-neutral-205 uppercase tracking-wider">
                                                                                    {String(value)}
                                                                                </span>
                                                                            ) : (
                                                                                String(value)
                                                                            )}
                                                                        </TableCell>
                                                                    ))}
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                    {csvData.length > 3 && (
                                                        <div className="p-3 bg-neutral-50/50 dark:bg-neutral-900/30 text-center border-t border-neutral-100 dark:border-neutral-800">
                                                            <p className="text-xs text-neutral-500 dark:text-neutral-450">
                                                                Showing first 3 rows of {csvData.length} total entries.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <Dialog
                                            open={booleanStates.errorDialog}
                                            onOpenChange={(open) => {
                                                setBooleanStates((prev) => ({
                                                    ...prev,
                                                    errorDialog: open,
                                                }));
                                            }}
                                        >
                                            <DialogTrigger asChild>
                                                <div className="w-full flex justify-center pt-4">
                                                    <SpinnerButton
                                                        onClick={handleSubmit}
                                                        className="w-full max-w-md cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:text-neutral-900 dark:hover:bg-blue-400 border-0 shadow-sm transition-all duration-150 py-2.5 h-11 font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                                        loading={booleanStates.isUploading}
                                                        loadingText="Uploading..."
                                                        disabled={booleanStates.isUploading || !csvFile}
                                                    >
                                                        Upload {csvData.length} Employees
                                                    </SpinnerButton>
                                                </div>
                                            </DialogTrigger>
                                            <DialogContent
                                                className="max-w-2xl max-h-[85vh]"
                                                onPointerDownOutside={(e) => e.preventDefault()}
                                            >
                                                <DialogHeader>
                                                    <DialogTitle className="text-red-650 font-bold">
                                                        Validation Errors ({csvErrors.length})
                                                    </DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-3 max-h-[65vh] overflow-y-auto">
                                                    {csvErrors.map((error, index) => (
                                                        <div
                                                            key={index}
                                                            className="p-4 border rounded-xl bg-red-50/50 dark:bg-red-950/20"
                                                        >
                                                            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                                                                {error.line ? `Line ${error.line}: ` : ""}
                                                                {error.type}
                                                            </p>
                                                            {error.message && (
                                                                <p className="text-xs text-red-650 dark:text-red-405 mt-2">
                                                                    {error.message}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-end gap-3 pt-4">
                                                    <Button
                                                        variant="ghost"
                                                        className="cursor-pointer rounded-lg px-5"
                                                        onClick={() =>
                                                            setBooleanStates((prev) => ({
                                                                ...prev,
                                                                errorDialog: false,
                                                            }))
                                                        }
                                                        disabled={booleanStates.isUploading}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <SpinnerButton
                                                        variant="ghost"
                                                        className="cursor-pointer rounded-lg px-5"
                                                        onClick={sendCsvFile}
                                                        loading={booleanStates.isUploading}
                                                        loadingText="Uploading..."
                                                        disabled={booleanStates.isUploading}
                                                    >
                                                        OK
                                                    </SpinnerButton>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </TabsContent>
                )}
            </AnimatePresence>
            
            <Dialog
                open={booleanStates.resultsDialog}
                onOpenChange={(open) =>
                    setBooleanStates((prev) => ({
                        ...prev,
                        resultsDialog: open,
                    }))
                }
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-green-600 font-bold">
                            Upload Results
                        </DialogTitle>
                    </DialogHeader>
                    {uploadResults && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-500/30">
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">
                                        Total Rows
                                    </p>
                                    <p className="text-2xl font-bold text-blue-800 dark:text-blue-355 mt-1">
                                        {uploadResults.totalRows}
                                    </p>
                                </div>
                                <div className="p-3 bg-green-50/50 dark:bg-green-950/20 rounded-xl border border-green-500/30">
                                    <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase tracking-wider">
                                        Uploaded
                                    </p>
                                    <p className="text-2xl font-bold text-green-800 dark:text-green-355 mt-1">
                                        {uploadResults.uploadedCount}
                                    </p>
                                </div>
                                <div className="p-3 bg-yellow-50/50 dark:bg-yellow-950/20 rounded-xl border border-yellow-500/30">
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold uppercase tracking-wider">
                                        Duplicates
                                    </p>
                                    <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-355 mt-1">
                                        {uploadResults.duplicateCount}
                                    </p>
                                </div>
                                <div className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-500/30">
                                    <p className="text-xs text-red-600 dark:text-red-400 font-semibold uppercase tracking-wider">
                                        Failed
                                    </p>
                                    <p className="text-2xl font-bold text-red-800 dark:text-red-355 mt-1">
                                        {uploadResults.validationFailureCount}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 flex justify-around border-t border-b border-neutral-100 dark:border-neutral-800 py-3">
                                <div className="flex flex-col items-center text-xs w-1/3">
                                    <span className="text-neutral-400">Success Rate</span>
                                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                                        {uploadResults.totalRows > 0
                                            ? Math.round(
                                                  (uploadResults.uploadedCount /
                                                      uploadResults.totalRows) *
                                                      100
                                              )
                                            : 0}
                                        %
                                    </span>
                                </div>
                                <div className="flex flex-col items-center text-xs w-1/3 border-l border-r border-neutral-100 dark:border-neutral-800">
                                    <span className="text-neutral-400">Duplicate Rate</span>
                                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                                        {uploadResults.totalRows > 0
                                            ? Math.round(
                                                  (uploadResults.duplicateCount /
                                                      uploadResults.totalRows) *
                                                      100
                                              )
                                            : 0}
                                        %
                                    </span>
                                </div>
                                <div className="flex flex-col items-center text-xs w-1/3">
                                    <span className="text-neutral-400">Failure Rate</span>
                                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                                        {uploadResults.totalRows > 0
                                            ? Math.round(
                                                  (uploadResults.validationFailureCount /
                                                      uploadResults.totalRows) *
                                                      100
                                              )
                                            : 0}
                                        %
                                    </span>
                                </div>
                            </div>
                            
                            <div className="h-48 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 overflow-y-auto font-sans">
                                {uploadResults.duplicates &&
                                    uploadResults.duplicates.length > 0 && (
                                        <>
                                            <p className="text-xs text-neutral-550 dark:text-neutral-400">
                                                Duplicate record found on following row{uploadResults.duplicates.length > 1 ? "s" : ""}:
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {uploadResults.duplicates.map((dup, index) => (
                                                    <span
                                                        key={index}
                                                        className="text-xs bg-yellow-50 dark:bg-yellow-950/20 text-yellow-805 dark:text-yellow-405 px-2 py-0.5 rounded font-mono"
                                                    >
                                                        {dup}
                                                    </span>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                {uploadResults.failed &&
                                    uploadResults.failed.length > 0 && (
                                        <Table className="mt-2 w-full text-xs">
                                            <TableHeader className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                                <TableRow className="w-full">
                                                    <TableHead className="w-16">Row</TableHead>
                                                    <TableHead>Error</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {uploadResults.failed.map((fail, index) => (
                                                    <TableRow
                                                        key={index}
                                                        className="w-full"
                                                    >
                                                        <TableCell className="px-3 py-2 font-mono">
                                                            {fail.row || "N/A"}
                                                        </TableCell>
                                                        <TableCell className="px-3 py-2 text-red-650">
                                                            {fail.error || "Unknown error"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end pt-4">
                        <Button
                            variant="ghost"
                            onClick={() =>
                                setBooleanStates((prev) => ({
                                    ...prev,
                                    resultsDialog: false,
                                }))
                            }
                            className="px-6 cursor-pointer rounded-lg"
                        >
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Tabs>
        </div>
    );
};

export default AddEmployee;
