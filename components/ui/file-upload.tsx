"use client"

import React, { useState, useRef, ChangeEvent } from 'react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  allowedTypes?: string[]
  maxSizeMB?: number
  buttonText?: string
  loadingText?: string
  className?: string
  isLoading?: boolean
  showPreview?: boolean
  previewUrl?: string
  previewAlt?: string
}

export function FileUpload({
  onFileSelect,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  maxSizeMB = 5,
  buttonText = 'Select File',
  loadingText = 'Uploading...',
  className,
  isLoading = false,
  showPreview = false,
  previewUrl,
  previewAlt = 'Preview'
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setError(null)

    if (!file) return

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      setError(`File type not supported. Please upload: ${allowedTypes.join(', ')}`)
      return
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      setError(`File too large. Maximum size is ${maxSizeMB}MB`)
      return
    }

    onFileSelect(file)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {showPreview && previewUrl && (
        <div className="relative w-24 h-24 mx-auto overflow-hidden rounded-full">
          <Image
            src={previewUrl}
            alt={previewAlt}
            fill
            className="object-cover"
          />
        </div>
      )}
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={allowedTypes.join(',')}
        className="hidden"
      />
      
      <Button
        type="button"
        onClick={triggerFileInput}
        disabled={isLoading}
        variant="outline"
      >
        {isLoading ? loadingText : buttonText}
      </Button>
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
} 