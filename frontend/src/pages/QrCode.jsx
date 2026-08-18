import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "../components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import apiService from "../utils/apiService";
import SpinnerButton from "../components/ui/spinner-button";
import toaster from "../utils/toaster";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Plus,
    Trash2,
    QrCode as QrIcon,
    AlertCircle,
    ShoppingCart,
    X,
    Layers,
    Tag,
} from "lucide-react";

const QrCode = () => {
    const [assets, setAssets] = useState([]);
    const [fetchedAssets, setFetchedAssets] = useState([]);
    const [printAssets, setPrintAssets] = useState([]);
    const [isLoading, setIsLoading] = useState({ print: false, asset: false });
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");

    // Fetch assets on mount
    useEffect(() => {
        const fetchAssets = async () => {
            setIsLoading((prev) => ({ ...prev, asset: true }));
            try {
                const response = await apiService.get("/assets/all");
                setAssets(response.data);
                setFetchedAssets(response.data);
            } catch (error) {
                console.error("Failed to fetch assets:", error);
                toaster("error", "Failed to fetch assets catalog");
            } finally {
                setIsLoading((prev) => ({ ...prev, asset: false }));
            }
        };
        fetchAssets();
    }, []);

    // Filter assets on search query
    useEffect(() => {
        let filtered = fetchedAssets;

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (asset) =>
                    (asset.asset_id &&
                        asset.asset_id.toLowerCase().includes(query)) ||
                    (asset.type && asset.type.toLowerCase().includes(query)) ||
                    (asset.model_no &&
                        asset.model_no.toLowerCase().includes(query)) ||
                    (asset.serial && asset.serial.toLowerCase().includes(query))
            );
        }

        setAssets(filtered);
    }, [searchQuery, fetchedAssets]);

    const handleAddAsset = (asset) => {
        // Create unique ID for item in queue so identical items can be added multiple times if needed
        setPrintAssets((prev) => [
            ...prev,
            { ...asset, uid: Date.now() + Math.random() },
        ]);
        toaster("success", `Added ${asset.asset_id} to print queue`);
    };

    const handlePrint = async () => {
        setIsLoading((prev) => ({ ...prev, print: true }));
        try {
            await apiService.openPdfForPrint("/assets/generate-qr", {
                assets: printAssets,
            });
        } catch (error) {
            toaster("error", "Failed to print QR codes");
        } finally {
            setIsLoading((prev) => ({ ...prev, print: false }));
        }
    };

    return (
        <div className="qr-table-height w-full rounded-md flex flex-col relative px-2 sm:px-4">
            {/* Top Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2">
                        <QrIcon className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                        QR Code Generator
                    </h2>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs font-semibold shadow-sm">
                        <span className="text-slate-400">Total Catalog:</span>
                        <span className="text-slate-800 dark:text-white font-bold">
                            {fetchedAssets.length}
                        </span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-105/20 dark:border-blue-900/30 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs font-semibold shadow-sm">
                        <span className="text-blue-600 dark:text-blue-400">
                            Queue Count:
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                            {printAssets.length}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex justify-between gap-5 min-h-0">
                {/* Available Assets Catalog (Left Pane) */}
                <div className="w-full lg:w-[55%] h-full bg-white dark:bg-card rounded-xl border border-slate-200/60 dark:border-slate-800/60 p-3 flex flex-col shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-md sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Tag className="h-4 w-4 text-blue-600 dark:text-blue-455" />
                            Asset Catalog
                        </h2>
                        <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-550 dark:text-slate-400 rounded-full">
                            {assets.length} items shown
                        </span>
                    </div>

                    {/* Search and Filters */}
                    <div className="flex flex-col gap-2.5 mb-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by ID, Model, or Type..."
                                className="pl-9 pr-8 bg-slate-50/50 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800/80 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-lg text-xs py-4.5"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="flex-1 min-h-0">
                        <ScrollArea className="h-full border border-slate-100 dark:border-slate-800/40 rounded-lg bg-slate-50/20 dark:bg-slate-950/5 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/75 dark:bg-slate-900/60 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                                    <TableRow className="hover:bg-slate-50/75 border-none">
                                        <TableHead className="text-xs font-bold text-slate-500 py-2">
                                            Asset ID
                                        </TableHead>
                                        <TableHead className="text-xs font-bold text-slate-500 py-2">
                                            Details
                                        </TableHead>
                                        <TableHead className="text-xs font-bold text-slate-505 py-2 text-right">
                                            Add
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assets.map((asset, i) => (
                                        <TableRow
                                            key={asset.asset_id || i}
                                            className="hover:bg-blue-50/30 dark:hover:bg-blue-950/5 transition-colors border-b border-slate-100 dark:border-slate-850"
                                        >
                                            <TableCell className="py-2.5 align-middle">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 tracking-tight select-all">
                                                        {asset.asset_id}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                                                        {asset.asset_code ||
                                                            "AMS-CODE"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5 align-middle">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold capitalize bg-blue-105/10 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/40 dark:border-blue-900/40">
                                                            {asset.type}
                                                        </span>
                                                        {asset.status && (
                                                            <span
                                                                className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold capitalize border ${
                                                                    asset.status.toLowerCase() ===
                                                                    "tagged"
                                                                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 border-emerald-100/40 dark:border-emerald-900/30"
                                                                        : asset.status.toLowerCase() ===
                                                                            "detagged"
                                                                          ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-450 border-amber-100/40 dark:border-amber-900/30"
                                                                          : "bg-slate-100 dark:bg-slate-900 text-slate-500 border-slate-200/40 dark:border-slate-800/40"
                                                                }`}
                                                            >
                                                                {asset.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-slate-600 dark:text-slate-350 font-medium">
                                                        {asset.model_no}{" "}
                                                        {asset.serial
                                                            ? `• SN: ${asset.serial}`
                                                            : ""}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5 text-right align-middle">
                                                <motion.button
                                                    whileHover={{ scale: 1.08 }}
                                                    whileTap={{ scale: 0.92 }}
                                                    className="inline-flex items-center justify-center cursor-pointer h-7 w-7 rounded-md border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                                                    onClick={() =>
                                                        handleAddAsset(asset)
                                                    }
                                                    title="Add to print queue"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </motion.button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {assets.length === 0 &&
                                        !isLoading.asset && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={3}
                                                    className="text-center py-16"
                                                >
                                                    <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
                                                        <AlertCircle className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                                                        <p className="text-xs font-bold">
                                                            No assets match your
                                                            search
                                                        </p>
                                                        <p className="text-[10px] text-slate-400">
                                                            Try adjusting your
                                                            filters or query.
                                                        </p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </div>

                {/* Selected Assets Queue (Right Pane - Desktop) */}
                <div className="hidden lg:flex w-[42%] h-full bg-white dark:bg-card rounded-xl border border-slate-200/60 dark:border-slate-800/60 p-3 flex-col shadow-sm">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <h2 className="font-bold text-slate-800 dark:text-white text-md sm:text-lg">
                                Print Queue
                            </h2>
                        </div>
                        {printAssets.length > 0 && (
                            <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                {printAssets.length} Selected
                            </span>
                        )}
                    </div>

                    {printAssets.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-slate-250 dark:border-slate-800/80 rounded-xl my-3 bg-slate-50/40 dark:bg-slate-950/10">
                            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-full mb-2.5 text-blue-600 dark:text-blue-400 border border-blue-100/40 dark:border-blue-900/40">
                                <QrIcon className="h-6 w-6 animate-pulse" />
                            </div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-xs mb-1">
                                Queue is Empty
                            </h3>
                            <p className="text-[10px] text-slate-400 text-center max-w-[200px] leading-relaxed">
                                Queue assets by clicking the "+" button in the
                                catalog on the left to prepare them for label
                                print.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 my-3">
                            <ScrollArea className="h-full border border-slate-100 dark:border-slate-800/40 rounded-lg bg-slate-50/20 dark:bg-slate-950/5">
                                <Table>
                                    <TableHeader className="bg-slate-50/75 dark:bg-slate-900/60 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                                        <TableRow className="hover:bg-slate-50 border-none">
                                            <TableHead className="text-xs font-bold text-slate-550 py-2">
                                                Asset Details
                                            </TableHead>
                                            <TableHead className="text-xs font-bold text-slate-555 py-2 text-right">
                                                Remove
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <AnimatePresence>
                                            {printAssets.map((asset, i) => (
                                                <motion.tr
                                                    key={asset.uid || i}
                                                    initial={{
                                                        opacity: 0,
                                                        x: 10,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        x: 0,
                                                    }}
                                                    exit={{
                                                        opacity: 0,
                                                        x: -10,
                                                    }}
                                                    className="hover:bg-red-50/10 dark:hover:bg-red-950/5 border-b border-slate-100 dark:border-slate-850"
                                                >
                                                    <TableCell className="py-2 align-middle">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 select-all">
                                                                {asset.asset_id}
                                                            </span>
                                                            <span className="text-[10px] text-slate-500 font-medium">
                                                                {asset.type} •{" "}
                                                                {asset.model_no}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2 text-right align-middle">
                                                        <motion.button
                                                            whileHover={{
                                                                scale: 1.08,
                                                            }}
                                                            whileTap={{
                                                                scale: 0.92,
                                                            }}
                                                            className="inline-flex items-center justify-center cursor-pointer h-6 w-6 rounded-md border border-red-200 dark:border-red-900/50 text-red-550 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                                            onClick={() =>
                                                                setPrintAssets(
                                                                    (prev) =>
                                                                        prev.filter(
                                                                            (
                                                                                a
                                                                            ) =>
                                                                                a.uid !==
                                                                                asset.uid
                                                                        )
                                                                )
                                                            }
                                                            title="Remove asset"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </motion.button>
                                                    </TableCell>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    )}

                    {/* Actions Sticky Card Footer */}
                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex flex-col gap-2">
                        <div className="flex justify-between items-center px-0.5 text-xs">
                            <span className="text-slate-400 font-medium">
                                Ready for print:
                            </span>
                            <span className="font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-900 px-2.5 py-0.5 rounded-md border border-slate-200/30 dark:border-slate-800/30">
                                {printAssets.length}{" "}
                                {printAssets.length === 1 ? "asset" : "assets"}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <SpinnerButton
                                loading={isLoading.print}
                                disabled={
                                    isLoading.print || printAssets.length === 0
                                }
                                loadingText="Generating..."
                                className="cursor-pointer flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold rounded-lg shadow-sm transition-all duration-200"
                                onClick={handlePrint}
                            >
                                <QrIcon className="h-4 w-4 mr-1.5" />
                                Generate QR Codes
                            </SpinnerButton>
                            <Button
                                variant="outline"
                                disabled={printAssets.length === 0}
                                size="icon"
                                className="cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/10 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900/30 rounded-lg px-3 h-auto"
                                onClick={() => {
                                    setPrintAssets([]);
                                    toaster("info", "Cleared print queue");
                                }}
                                title="Clear print queue"
                            >
                                <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating cart Trigger - Visible on Mobile/Tablet */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsDrawerOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-full p-4.5 shadow-xl hover:shadow-2xl transition-all z-50 flex items-center justify-center cursor-pointer"
            >
                <ShoppingCart className="w-5 h-5" />
                {printAssets.length > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-extrabold rounded-full h-5.5 w-5.5 flex items-center justify-center border-2 border-white dark:border-card shadow-sm animate-pulse"
                    >
                        {printAssets.length}
                    </motion.span>
                )}
            </motion.button>

            {/* Mobile Bottom/Side Sheet for print queue */}
            <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <SheetContent
                    side="right"
                    className="w-full sm:w-[400px] p-0 flex flex-col bg-white dark:bg-card border-l border-slate-200/50 dark:border-slate-800/50"
                >
                    <SheetHeader className="p-4 border-b border-slate-100 dark:border-slate-800/60">
                        <SheetTitle className="text-lg font-bold text-slate-850 dark:text-white flex items-center gap-2">
                            <Layers className="h-4 w-4 text-blue-600" />
                            Print Queue ({printAssets.length})
                        </SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 min-h-0 p-3">
                        {printAssets.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-6 border border-dashed border-slate-250 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-950/10">
                                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-full mb-2.5 text-blue-600 border border-blue-100/40">
                                    <QrIcon className="h-6 w-6" />
                                </div>
                                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-xs mb-1">
                                    Queue is Empty
                                </h3>
                                <p className="text-[10px] text-slate-400 text-center max-w-[180px] leading-relaxed">
                                    No assets selected. Add assets from the
                                    catalog list to print QR labels.
                                </p>
                            </div>
                        ) : (
                            <ScrollArea className="h-full border border-slate-105 dark:border-slate-800/40 rounded-lg bg-slate-50/20 dark:bg-slate-950/5">
                                <Table>
                                    <TableHeader className="bg-slate-50/75 dark:bg-slate-900/60 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                                        <TableRow className="hover:bg-slate-50 border-none">
                                            <TableHead className="text-xs font-bold text-slate-550 py-2">
                                                Asset Details
                                            </TableHead>
                                            <TableHead className="text-xs font-bold text-slate-555 py-2 text-right">
                                                Remove
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {printAssets.map((asset, i) => (
                                            <TableRow
                                                key={asset.uid || i}
                                                className="border-b border-slate-100 dark:border-slate-850"
                                            >
                                                <TableCell className="py-2.5 align-middle text-xs">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-850 dark:text-slate-200">
                                                            {asset.asset_id}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                            {asset.type} •{" "}
                                                            {asset.model_no}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2.5 text-right align-middle">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="cursor-pointer border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 h-7 w-7"
                                                        onClick={() =>
                                                            setPrintAssets(
                                                                (prev) =>
                                                                    prev.filter(
                                                                        (a) =>
                                                                            a.uid !==
                                                                            asset.uid
                                                                    )
                                                            )
                                                        }
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        )}
                    </div>
                    <div className="p-3 border-t border-slate-100 dark:border-slate-850/60 flex flex-col gap-2 bg-slate-50/30 dark:bg-[#16171a]/30">
                        <SpinnerButton
                            loading={isLoading.print}
                            disabled={
                                isLoading.print || printAssets.length === 0
                            }
                            loadingText="Generating..."
                            className="cursor-pointer w-full py-4.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold rounded-lg shadow-sm"
                            onClick={handlePrint}
                        >
                            <QrIcon className="h-4 w-4 mr-1.5" />
                            Generate QR Codes
                        </SpinnerButton>
                        <Button
                            variant="outline"
                            disabled={printAssets.length === 0}
                            className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/10 hover:text-red-600 hover:border-red-200 w-full rounded-lg"
                            onClick={() => {
                                setPrintAssets([]);
                                setIsDrawerOpen(false);
                                toaster("info", "Cleared print queue");
                            }}
                        >
                            Clear Queue
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default QrCode;
