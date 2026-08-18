import { useContext, useState } from "react";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "./ui/table";
import { Button } from "./ui/button";
import { Context } from "../utils/Context";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PaginationTable = ({
    data,
    columns,
    currentPage: controlledPage,
    pageSize: controlledPageSize,
    totalPages: controlledTotalPages,
    onPageChange,
    onClickRow,
    totalItems,
    showPagination = true,
}) => {
    const { user } = useContext(Context);
    const [internalPage, setInternalPage] = useState(1);

    const isControlled =
        typeof controlledPage === "number" &&
        typeof controlledPageSize === "number" &&
        typeof controlledTotalPages === "number" &&
        typeof onPageChange === "function";

    const currentPage = isControlled ? controlledPage : internalPage;
    const pageSize = controlledPageSize || 5;
    const totalPages = isControlled
        ? controlledTotalPages
        : Math.ceil(data.length / pageSize);

    const handlePageChange = (page) => {
        if (page < 1 || page > totalPages) return;
        if (isControlled) {
            onPageChange(page);
        } else {
            setInternalPage(page);
        }
    };

    const currentData = isControlled
        ? data
        : data.slice(
              (currentPage - 1) * pageSize,
              (currentPage - 1) * pageSize + pageSize
          );

    // Filter columns based on user role
    const visibleColumns = columns.filter((col) => {
        return !col.adminOnly || user?.role === "admin";
    });

    // Calculate range information
    const totalEntries =
        typeof totalItems === "number"
            ? totalItems
            : isControlled
              ? totalPages * pageSize
              : data.length;

    const startEntry =
        totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endEntry = isControlled
        ? Math.min(currentPage * pageSize, totalEntries)
        : Math.min(currentPage * pageSize, data.length);

    // Generate page numbers to show (e.g. 1, 2, ..., totalPages)
    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);

            if (currentPage > 3) {
                pages.push("ellipsis-start");
            }

            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            if (currentPage <= 3) {
                end = 4;
            } else if (currentPage >= totalPages - 2) {
                start = totalPages - 3;
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push("ellipsis-end");
            }

            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="bg-white dark:bg-card shadow-sm rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-neutral-50/75 dark:bg-neutral-900/40 border-b border-neutral-200/80 dark:border-neutral-800/80">
                        <TableRow className="hover:bg-transparent border-none">
                            {visibleColumns.map((col, i) => (
                                <TableHead
                                    className={
                                        (i === 0 ? "ps-6" : "") +
                                        " text-neutral-500 dark:text-neutral-400 font-semibold text-xs uppercase tracking-wider py-3.5"
                                    }
                                    key={col.key}
                                >
                                    {col.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentData.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={visibleColumns.length}
                                    className="text-center py-8 text-neutral-500 dark:text-neutral-400"
                                >
                                    No data available
                                </TableCell>
                            </TableRow>
                        ) : (
                            currentData.map((row, idx) => (
                                <TableRow
                                    key={idx}
                                    className={`
                                        hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 
                                        transition-colors duration-150 border-b border-neutral-200/60 dark:border-neutral-800/50 last:border-none
                                        ${typeof onClickRow === "function" ? "cursor-pointer" : ""}
                                    `}
                                    onClick={() =>
                                        typeof onClickRow === "function" &&
                                        onClickRow(row)
                                    }
                                >
                                    {visibleColumns.map((col, i) => (
                                        <TableCell
                                            key={col.key}
                                            className={
                                                (i === 0
                                                    ? "ps-6 font-medium text-neutral-900 dark:text-neutral-100"
                                                    : "text-neutral-600 dark:text-neutral-300") +
                                                " py-2"
                                            }
                                        >
                                            {row[col.key]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {showPagination && totalPages >= 1 && (
                <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-card">
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        Showing{" "}
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                            {startEntry}
                        </span>{" "}
                        to{" "}
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                            {endEntry}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                            {totalEntries}
                        </span>{" "}
                        entries
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-lg border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {getPageNumbers().map((pageNum, idx) => {
                            if (
                                pageNum === "ellipsis-start" ||
                                pageNum === "ellipsis-end"
                            ) {
                                return (
                                    <span
                                        key={`ellipse-${idx}`}
                                        className="px-2 text-neutral-400 dark:text-neutral-600"
                                    >
                                        &bull;&bull;&bull;
                                    </span>
                                );
                            }

                            const isActive = pageNum === currentPage;
                            return (
                                <Button
                                    key={`page-${pageNum}`}
                                    onClick={() => handlePageChange(pageNum)}
                                    variant={isActive ? "default" : "outline"}
                                    className={`
                                        h-9 w-9 p-0 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer
                                        ${
                                            isActive
                                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 dark:bg-blue-500 dark:text-neutral-900 dark:shadow-none dark:hover:bg-blue-400"
                                                : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                        }
                                    `}
                                >
                                    {pageNum}
                                </Button>
                            );
                        })}

                        <Button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-lg border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                            aria-label="Next page"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaginationTable;
