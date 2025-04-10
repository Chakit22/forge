import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// File type utility functions
export function isImageFile(type: string): boolean {
  return type.startsWith('image/')
}

export function isPdfFile(type: string): boolean {
  return type === 'application/pdf'
}

export function isDocumentFile(type: string): boolean {
  return (
    type.includes('word') || 
    type.includes('doc') || 
    type === 'application/rtf' ||
    type === 'text/plain'
  )
}

export function isSpreadsheetFile(type: string): boolean {
  return (
    type.includes('excel') || 
    type.includes('spreadsheet') || 
    type.includes('csv') ||
    type === 'application/vnd.ms-excel' ||
    type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
}

export function getFileIcon(type: string): string {
  if (isImageFile(type)) return '🖼️'
  if (isPdfFile(type)) return '📄'
  if (isDocumentFile(type)) return '📝'
  if (isSpreadsheetFile(type)) return '📊'
  return '📁'
}

export function getReadableFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 Byte'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`
}
