"use client";

import * as React from "react";
import { Check, Plus, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CustomComboBoxProps {
    options: string[];
    onSelect?: (value: string) => void;
    className?: string;
    placeholder?: string;
}

export function CustomComboBox({ options = [], onSelect, className, placeholder }: CustomComboBoxProps) {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState("");
    const [inputValue, setInputValue] = React.useState("");

    const exists = options.some((opt) => opt.toLowerCase() === inputValue.toLowerCase());

    const handleSelect = (currentValue: string) => {
        setValue(currentValue);
        setOpen(false);
        onSelect?.(currentValue);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-64 justify-between", className)}
                >
                    {value || placeholder || "Select option..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0">
                <Command>
                    <CommandInput
                        placeholder="Type to search..."
                        value={inputValue}
                        onValueChange={setInputValue}
                    />
                    <CommandEmpty>
                        {!exists && inputValue.trim() !== "" ? (
                            <div
                                className="flex cursor-pointer items-center gap-2 px-2 py-1 hover:bg-accent"
                                onClick={() => handleSelect(inputValue)}
                            >
                                <Plus size={16} /> Add "{inputValue}"
                            </div>
                        ) : (
                            "No results found."
                        )}
                    </CommandEmpty>

                    {/* ✅ Scrollable wrapper */}
                    <div className="max-h-60 overflow-auto">
                        <CommandGroup>
                            {options
                                .filter((opt) =>
                                    opt.toLowerCase().includes(inputValue.toLowerCase())
                                )
                                .map((opt) => (
                                    <CommandItem
                                        key={opt}
                                        value={opt}
                                        onSelect={() => handleSelect(opt)}
                                    >
                                        {opt}
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                value === opt ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}

                            {!exists && inputValue.trim() !== "" && (
                                <CommandItem
                                    value={inputValue}
                                    onSelect={() => handleSelect(inputValue)}
                                >
                                    <Plus size={16} className="mr-2" /> Add "{inputValue}"
                                </CommandItem>
                            )}
                        </CommandGroup>
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
