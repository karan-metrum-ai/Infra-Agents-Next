"use client";

import type { ChangeEvent, DragEvent } from "react";
import {
  Archive,
  AlertCircle,
  CheckCircle,
  Clock,
  File,
  FileText,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./AgentInspectorPanel.module.css";
import type {
  AgentInspectorKnowledgeFile,
  KnowledgeFileUploadStatus,
} from "./AgentInspectorPanel.types";

const ALLOWED_EXTENSIONS = new Set([
  "txt",
  "md",
  "pdf",
  "doc",
  "docx",
  "csv",
  "json",
  "yaml",
  "yml",
  "xml",
  "html",
  "log",
  "conf",
  "cfg",
  "ini",
  "toml",
  "sh",
  "py",
  "js",
  "ts",
]);
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ACCEPT_ATTR = Array.from(ALLOWED_EXTENSIONS)
  .map((ext) => `.${ext}`)
  .join(",");

function validateFiles(files: File[]): File[] {
  return files.filter((file) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) return false;
    if (file.size > MAX_FILE_SIZE) return false;
    return true;
  });
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function fileIconFor(extension: string): LucideIcon {
  const ext = extension.toLowerCase().replace(".", "");
  switch (ext) {
    case "pdf":
    case "doc":
    case "docx":
    case "txt":
    case "md":
      return FileText;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return ImageIcon;
    case "zip":
    case "rar":
    case "7z":
      return Archive;
    default:
      return File;
  }
}

function statusIconFor(status: KnowledgeFileUploadStatus | undefined): LucideIcon {
  switch (status) {
    case "uploading":
    case "ingesting":
      return Loader2;
    case "completed":
      return CheckCircle;
    case "error":
      return AlertCircle;
    default:
      return Clock;
  }
}

function statusColorVar(status: KnowledgeFileUploadStatus | undefined): string {
  switch (status) {
    case "uploading":
      return "var(--primary)";
    case "ingesting":
      return "var(--warning)";
    case "completed":
      return "var(--success)";
    case "error":
      return "var(--destructive)";
    default:
      return "var(--muted)";
  }
}

function statusLabel(file: AgentInspectorKnowledgeFile): string | null {
  switch (file.uploadStatus) {
    case "pending":
      return "Queued";
    case "uploading":
      return `Uploading... ${file.uploadProgress ?? 0}%`;
    case "ingesting":
      return `Processing... ${file.uploadProgress ?? 50}%`;
    case "completed":
      return "Uploaded";
    case "error":
      return file.errorMessage || "Error";
    default:
      return null;
  }
}

function handleDragOver(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

interface AgentInspectorKnowledgeSectionProps {
  files: AgentInspectorKnowledgeFile[];
  onFileUpload?: (files: File[]) => void;
  onFileDelete?: (fileId: string) => void;
}

/** "Add Knowledge" section: drag/drop + click-to-browse upload area and the uploaded-file list. */
export function AgentInspectorKnowledgeSection({
  files,
  onFileUpload,
  onFileDelete,
}: AgentInspectorKnowledgeSectionProps) {
  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const valid = validateFiles(Array.from(event.target.files ?? []));
    if (valid.length > 0) onFileUpload?.(valid);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const valid = validateFiles(Array.from(event.dataTransfer.files));
    if (valid.length > 0) onFileUpload?.(valid);
  };

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Add Knowledge</h3>
        <div className={styles.sectionHint}>{files.length} files uploaded</div>
      </header>

      <div className={styles.uploadContainer}>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- this <label> is the standard accessible HTML5 drop-zone pattern: it wraps a real file input, which already provides a keyboard-operable equivalent (Tab + Enter/Space opens the file picker) independent of the drag handlers below. */}
        <label
          className={styles.uploadArea}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            onChange={handleFileInputChange}
            className={styles.uploadInput}
            accept={ACCEPT_ATTR}
            aria-label="Upload knowledge bank files"
          />
          <Upload className={styles.uploadIcon} aria-hidden="true" />
          <div className={styles.uploadText}>
            <div className={styles.uploadTitle}>Drop files here or click to browse</div>
            <div className={styles.uploadSubtitle}>
              Text, PDF, CSV, JSON, YAML, config files (max 25 MB)
            </div>
          </div>
        </label>
      </div>

      {files.length > 0 && (
        <div className={styles.filesList}>
          {files.map((file) => {
            const FileIcon = fileIconFor(file.name.split(".").pop() ?? "");
            const StatusIcon = statusIconFor(file.uploadStatus);
            const statusColor = statusColorVar(file.uploadStatus);
            const label = statusLabel(file);
            const isBusy = file.uploadStatus === "uploading" || file.uploadStatus === "ingesting";

            return (
              <div key={file.id} className={styles.fileItem}>
                <div className={styles.fileIconWrap}>
                  <FileIcon className={styles.fileIcon} aria-hidden="true" />
                </div>
                <div className={styles.fileMeta}>
                  <div className={styles.fileName} title={file.name}>
                    {file.name}
                  </div>
                  <div className={styles.fileSize}>
                    {formatFileSize(file.size)} &bull; {file.extension.toUpperCase()}
                    {label && (
                      <>
                        {" "}
                        &bull; <span style={{ color: statusColor }}>{label}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className={styles.fileActions}>
                  {file.uploadStatus && (
                    <output
                      className={styles.statusIcon}
                      style={{ color: statusColor }}
                      aria-label={
                        file.uploadStatus === "ingesting"
                          ? "Processing document"
                          : file.uploadStatus
                      }
                    >
                      <StatusIcon
                        className={cn(styles.statusIconSvg, isBusy && styles.spinning)}
                        aria-hidden="true"
                      />
                    </output>
                  )}
                  <button
                    type="button"
                    className={styles.fileDeleteBtn}
                    onClick={() => onFileDelete?.(file.id)}
                    aria-label={`Delete ${file.name}`}
                    disabled={isBusy}
                  >
                    <X className={styles.fileDeleteIcon} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default AgentInspectorKnowledgeSection;
