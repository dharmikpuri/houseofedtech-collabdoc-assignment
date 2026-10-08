"use client";

import type { Editor } from "@tiptap/react";
import { Download, FileCode2, FileText, FileType2, Printer } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import {
  exportHtml,
  exportMarkdown,
  exportText,
  printDocument,
} from "@/lib/export/document-export";

/** Export the current document. Runs locally, so it also works offline. */
export function ExportMenu({ editor, title }: { editor: Editor | null; title: string }) {
  return (
    <DropdownMenu>
      <Tooltip content="Export">
        <DropdownMenuTrigger
          disabled={!editor}
          aria-label="Export document"
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-8 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40 [&_svg]:size-4"
        >
          <Download />
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export as</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => editor && exportMarkdown(editor, title)}>
          <FileType2 />
          Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => editor && exportHtml(editor, title)}>
          <FileCode2 />
          Web page (.html)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => editor && exportText(editor, title)}>
          <FileText />
          Plain text (.txt)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => printDocument()}>
          <Printer />
          Print or save as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
