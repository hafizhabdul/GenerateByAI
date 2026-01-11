"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import {
    PROMPT_TEMPLATES,
    CATEGORY_LABELS,
    CATEGORY_ICONS,
    getPopularTemplates,
    getTemplatesByCategory,
    searchTemplates,
    type PromptTemplate,
    type PromptCategory,
} from "@/lib/prompt-templates";

interface PromptPickerProps {
    onSelect: (prompt: string) => void;
    className?: string;
}

/**
 * Prompt Picker Component
 * Displays curated prompt templates for quick selection
 * Can be embedded in the image generator form
 */
export function PromptPicker({ onSelect, className }: PromptPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<PromptCategory | "popular" | "all">("popular");
    const [searchQuery, setSearchQuery] = useState("");

    // Get templates based on selection
    const getDisplayedTemplates = (): PromptTemplate[] => {
        if (searchQuery) {
            return searchTemplates(searchQuery);
        }
        if (selectedCategory === "popular") {
            return getPopularTemplates();
        }
        if (selectedCategory === "all") {
            return PROMPT_TEMPLATES;
        }
        return getTemplatesByCategory(selectedCategory);
    };

    const displayedTemplates = getDisplayedTemplates();

    const handleSelect = (template: PromptTemplate) => {
        onSelect(template.prompt);
        setIsOpen(false);
        setSearchQuery("");
    };

    const categories: (PromptCategory | "popular" | "all")[] = [
        "popular",
        "nusantara",
        "portrait",
        "product",
        "landscape",
        "abstract",
        "anime",
        "fantasy",
    ];

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium",
                    "bg-primary/10 text-primary rounded-lg",
                    "hover:bg-primary/20 transition-colors",
                    className
                )}
            >
                <Icon icon="mingcute:magic-1-fill" className="w-3.5 h-3.5" />
                Template Prompt
            </button>
        );
    }

    return (
        <div className={cn("bg-surface-1 border border-border rounded-xl overflow-hidden", className)}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-surface-2/50">
                <div className="flex items-center gap-2">
                    <Icon icon="mingcute:magic-1-fill" className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Pilih Template</span>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setIsOpen(false);
                        setSearchQuery("");
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Icon icon="mingcute:close-line" className="w-4 h-4" />
                </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-border">
                <div className="relative">
                    <Icon
                        icon="mingcute:search-line"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari template..."
                        className="w-full h-9 pl-9 pr-4 bg-surface-2 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/60"
                    />
                </div>
            </div>

            {/* Categories */}
            {!searchQuery && (
                <div className="flex gap-1 p-2 overflow-x-auto hide-scrollbar border-b border-border">
                    {categories.map((cat) => {
                        const isActive = selectedCategory === cat;
                        const icon = cat === "popular" ? "mingcute:fire-fill" : cat === "all" ? "mingcute:grid-fill" : CATEGORY_ICONS[cat];
                        const label = cat === "popular" ? "Populer" : cat === "all" ? "Semua" : CATEGORY_LABELS[cat];

                        return (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-surface-2 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Icon icon={icon} className="w-3.5 h-3.5" />
                                {label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Templates Grid */}
            <div className="max-h-64 overflow-y-auto p-2">
                {displayedTemplates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        <Icon icon="mingcute:search-line" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Tidak ada template ditemukan</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {displayedTemplates.map((template) => (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => handleSelect(template)}
                                className="group text-left p-3 rounded-lg bg-surface-2/50 hover:bg-surface-2 border border-transparent hover:border-primary/30 transition-all"
                            >
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                        {template.title}
                                    </span>
                                    {template.popular && (
                                        <span className="shrink-0 px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">
                                            Populer
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {template.prompt}
                                </p>
                                <div className="flex gap-1 mt-2">
                                    {template.tags.slice(0, 3).map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-1.5 py-0.5 bg-surface-3 text-muted-foreground text-[10px] rounded"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Compact prompt suggestions shown below input
 */
export function PromptSuggestions({
    onSelect,
    className,
}: {
    onSelect: (prompt: string) => void;
    className?: string;
}) {
    const popularTemplates = getPopularTemplates().slice(0, 4);

    return (
        <div className={cn("flex flex-wrap gap-1.5", className)}>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide mr-1">
                Coba:
            </span>
            {popularTemplates.map((template) => (
                <button
                    key={template.id}
                    type="button"
                    onClick={() => onSelect(template.prompt)}
                    className="px-2 py-0.5 bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground text-[11px] rounded-md transition-colors"
                >
                    {template.title}
                </button>
            ))}
        </div>
    );
}
