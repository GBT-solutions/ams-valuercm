import * as React from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function Combobox({
    items = [],
    value,
    onChange = () => {},
    hint = "Select an item",
    placeholder = "Search...",
    notFoundMessage = "No item found",
    disabled = false,
}) {
    const [open, setOpen] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState("");

    const filteredItems = React.useMemo(() => {
        return items.filter((item) => item.label.toLowerCase().includes(searchValue.toLowerCase()));
    }, [items, searchValue]);

    const handleSelect = (val) => {
        onChange(val === value ? "" : val);
        setOpen(false);
        setSearchValue("");
    };

    const selectedLabel = items.find((item) => item.value === value)?.label;

    return (
        <Popover open={!disabled && open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={
                        "w-full justify-between" +
                        (disabled ? " cursor-not-allowed opacity-50" : "")
                    }
                >
                    {selectedLabel || hint}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent forceMount className="p-2 z-[9999] space-y-2">
                <Input
                    id="combobox-search"
                    autoComplete="off"
                    autoFocus
                    name="combobox-search"
                    className="focus-visible:ring-0"
                    placeholder={placeholder}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                />
                <ScrollArea className="pointer-events-auto max-h-60 overflow-auto rounded-md">
                    <div className="space-y-1">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item) => (
                                <div
                                    key={item.value}
                                    onClick={() => handleSelect(item.value)}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-muted",
                                        value === item.value && "bg-muted"
                                    )}
                                >
                                    <span>{item.label}</span>
                                    {value === item.value && (
                                        <Check className="h-4 w-4 text-primary" />
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-muted-foreground text-sm">
                                {notFoundMessage}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
