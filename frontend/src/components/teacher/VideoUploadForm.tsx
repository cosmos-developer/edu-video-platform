import React, { useState, useRef, useCallback } from 'react'
import { videoService } from '../../services/video'
import type { Video } from '../../services/video'

interface VideoUploadFormProps {
  groupId: string
  onVideoUploaded: (video: Video) => void
  onClose: () => void
}

interface UploadState {
  file: File | null
  title: string
  description: string
  uploading: boolean
  progress: number
  error: string | null
  processing: boolean
}

export function VideoUploadForm({ groupId, onVideoUploaded, onClose }: VideoUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    title: '',
    description: '',
    uploading: false,
    progress: 0,
    error: null,
    processing: false
  })

  const handleFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('video/')) {
      setUploadState(prev => ({ ...prev, error: 'Please select a valid video file' }))
      return
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      setUploadState(prev => ({ ...prev, error: 'File size must be less than 100MB' }))
      return
    }

    setUploadState(prev => ({
      ...prev,
      file,
      title: prev.title || file.name.replace(/\.[^/.]+$/, ''), // Use filename as default title
      error: null
    }))
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!uploadState.file || !uploadState.title.trim()) {
      setUploadState(prev => ({ ...prev, error: 'Please select a file and enter a title' }))
      return
    }

    setUploadState(prev => ({ ...prev, uploading: true, progress: 0, error: null }))

    try {
      const video = await videoService.uploadVideoFile(
        groupId,
        uploadState.file,
        {
          title: uploadState.title.trim(),
          description: uploadState.description.trim() || undefined
        },
        (progress) => {
          setUploadState(prev => ({ ...prev, progress }))
        }
      )

      setUploadState(prev => ({ ...prev, processing: true, progress: 100 }))
      onVideoUploaded(video)
    } catch (error: any) {
      console.error('Upload failed:', error)
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        processing: false,
        progress: 0,
        error: error.message || 'Failed to upload video'
      }))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // const formatDuration = (seconds: number) => {
  //   const mins = Math.floor(seconds / 60)
  //   const secs = Math.floor(seconds % 60)
  //   return `${mins}:${secs.toString().padStart(2, '0')}`
  // }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !uploadState.uploading) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Upload Video</h2>
            {!uploadState.uploading && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {uploadState.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700">{uploadState.error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload Area */}
            {!uploadState.file ? (
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4a2 2 0 012-2h6a2 2 0 012 2v16l-5-5-5 5V4z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Drop your video file here
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      or click to browse files
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>Supported formats: MP4, WebM, MOV, AVI</p>
                    <p>Maximum file size: 100MB</p>
                  </div>
                </div>
              </div>
            ) : (
              /* File Preview */
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{uploadState.file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(uploadState.file.size)}</p>
                    </div>
                  </div>
                  {!uploadState.uploading && (
                    <button
                      type="button"
                      onClick={() => setUploadState(prev => ({ ...prev, file: null }))}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploadState.uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {uploadState.processing ? 'Processing video...' : `Uploading... ${uploadState.progress}%`}
                  </span>
                  <span className="text-gray-500">
                    {uploadState.processing ? 'Please wait' : `${uploadState.progress}%`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      uploadState.processing ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Video Metadata */}
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Video Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={uploadState.title}
                  onChange={(e) => setUploadState(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter video title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={uploadState.uploading}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={uploadState.description}
                  onChange={(e) => setUploadState(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this video covers"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploadState.uploading}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={uploadState.uploading}
                className={`btn-secondary ${uploadState.uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploadState.uploading ? 'Uploading...' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={!uploadState.file || !uploadState.title.trim() || uploadState.uploading}
                className={`btn-primary ${
                  (!uploadState.file || !uploadState.title.trim() || uploadState.uploading)
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                {uploadState.uploading 
                  ? (uploadState.processing ? 'Processing...' : `Uploading ${uploadState.progress}%`)
                  : 'Upload Video'
                }
              </button>
            </div>
          </form>

          {/* Upload Tips */}
          {!uploadState.uploading && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Upload Tips</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Use MP4 format for best compatibility</li>
                <li>• Keep file size under 100MB for faster uploads</li>
                <li>• Choose descriptive titles for easy organization</li>
                <li>• After upload, you can add interactive milestones</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}