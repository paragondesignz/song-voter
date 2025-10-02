import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useBand, useUserBandRole } from '@/hooks/useBands'
import {
  useFolderContents,
  useUploadFiles,
  useDownloadFile,
  useDeleteFile,
  useCreateFolder,
  useDeleteFolder,
  BandFile,
  FolderContent
} from '@/hooks/useBandFiles'
import { Header } from '@/components/Header'
import { BandSidebar } from '@/components/BandSidebar'
import {
  Folder,
  Upload,
  File,
  FileText,
  FileImage,
  FileAudio,
  FileVideo,
  Download,
  Trash2,
  Eye,
  Search,
  FolderPlus
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'


export function BandFiles() {
  const { bandId } = useParams<{ bandId: string }>()
  const { data: band } = useBand(bandId!)
  const { data: userRole } = useUserBandRole(bandId!)

  const [currentPath, setCurrentPath] = useState('/')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Real hooks for file operations
  const { data: folderContents, isLoading: isLoadingContents, refetch } = useFolderContents(bandId!, currentPath)
  const uploadFiles = useUploadFiles()
  const downloadFile = useDownloadFile()
  const deleteFile = useDeleteFile()
  const createFolder = useCreateFolder()
  const deleteFolder = useDeleteFolder()

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="h-5 w-5 text-green-600" />
    if (mimeType.startsWith('audio/')) return <FileAudio className="h-5 w-5 text-purple-600" />
    if (mimeType.startsWith('video/')) return <FileVideo className="h-5 w-5 text-red-600" />
    if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-600" />
    if (mimeType === 'folder') return <Folder className="h-5 w-5 text-blue-600" />
    return <File className="h-5 w-5 text-gray-600" />
  }

  // Filter and separate folders and files from folderContents
  const folders = (folderContents || []).filter(item =>
    item.type === 'folder' &&
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const files = (folderContents || []).filter(item =>
    item.type === 'file' &&
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFiles || !bandId) return

    setIsUploading(true)
    try {
      await uploadFiles.mutateAsync({
        bandId,
        folderPath: currentPath,
        files: selectedFiles
      })
      setSelectedFiles(null)
      setShowUploadForm(false)
      refetch()
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim() || !bandId) return

    try {
      await createFolder.mutateAsync({
        bandId,
        name: newFolderName,
        parentPath: currentPath
      })
      setNewFolderName('')
      setShowCreateFolder(false)
      refetch()
    } catch (error) {
      console.error('Create folder error:', error)
    }
  }

  const handleDownload = (item: FolderContent) => {
    if (item.type !== 'file') return

    const file: BandFile = {
      id: item.id,
      band_id: bandId!,
      folder_id: null,
      uploaded_by: item.uploaded_by,
      file_name: item.name,
      file_size: item.size,
      mime_type: item.mime_type,
      storage_path: '', // Will be looked up by the hook
      folder_path: currentPath,
      description: null,
      is_public: false,
      download_count: item.download_count,
      created_at: item.created_at,
      updated_at: item.updated_at
    }

    downloadFile.mutate(file)
  }

  const handleDelete = async (item: FolderContent) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      if (item.type === 'file') {
        const file: BandFile = {
          id: item.id,
          band_id: bandId!,
          folder_id: null,
          uploaded_by: item.uploaded_by,
          file_name: item.name,
          file_size: item.size,
          mime_type: item.mime_type,
          storage_path: '', // Will be looked up by the hook
          folder_path: currentPath,
          description: null,
          is_public: false,
          download_count: item.download_count,
          created_at: item.created_at,
          updated_at: item.updated_at
        }
        await deleteFile.mutateAsync(file)
      } else {
        const folder = {
          id: item.id,
          band_id: bandId!,
          created_by: item.uploaded_by,
          name: item.name,
          parent_folder_id: null,
          folder_path: currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`,
          description: null,
          created_at: item.created_at,
          updated_at: item.updated_at
        }
        await deleteFolder.mutateAsync(folder)
      }
      refetch()
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  if (!band || isLoadingContents) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Folder className="h-8 w-8 mr-3 text-blue-600" />
                Band Files
              </h1>
              {band?.name && <p className="text-lg text-gray-600 mt-2">{band.name}</p>}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateFolder(true)}
                className="btn-secondary"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </button>
              <button
                onClick={() => setShowUploadForm(true)}
                className="btn-primary"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Search and Navigation */}
            <div className="card">
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files and folders..."
                    className="pl-10 input-field"
                  />
                </div>
              </div>

              {/* Breadcrumb */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <button
                  onClick={() => setCurrentPath('/')}
                  className="hover:text-blue-600"
                >
                  Root
                </button>
                {currentPath !== '/' && (
                  <>
                    <span>/</span>
                    <span className="font-medium">{currentPath.replace('/', '').replace('-', ' ')}</span>
                  </>
                )}
              </div>
            </div>

            {/* Upload Form */}
            {showUploadForm && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Upload Files</h2>
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Files
                    </label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setSelectedFiles(e.target.files)}
                      className="input-field"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp3,.mp4,.wav"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF, MP3, MP4, WAV
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowUploadForm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!selectedFiles || isUploading}
                      className="btn-primary"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Create Folder Form */}
            {showCreateFolder && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Create New Folder</h2>
                <form onSubmit={handleCreateFolder} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Folder Name
                    </label>
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="input-field"
                      placeholder="Enter folder name"
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateFolder(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createFolder.isPending}
                      className="btn-primary"
                    >
                      <FolderPlus className="h-4 w-4 mr-2" />
                      {createFolder.isPending ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Files and Folders List */}
            <div className="card">
              <div className="space-y-4">
                {/* Folders */}
                {folders.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Folders</h3>
                    <div className="space-y-2">
                      {folders.map((folder) => (
                        <div
                          key={folder.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                        >
                          <div
                            className="flex items-center space-x-3 flex-1 cursor-pointer"
                            onClick={() => setCurrentPath(currentPath === '/' ? `/${folder.name}` : `${currentPath}/${folder.name}`)}
                          >
                            <Folder className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium text-gray-900">{folder.name}</p>
                              <p className="text-sm text-gray-500">
                                {folder.file_count} files • Created by {folder.uploader_name} • {formatDistanceToNow(new Date(folder.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          {userRole === 'admin' && (
                            <button
                              onClick={() => handleDelete(folder)}
                              className="p-2 text-gray-400 hover:text-red-600"
                              title="Delete folder"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {files.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Files</h3>
                    <div className="space-y-2">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            {getFileIcon(file.mime_type)}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-sm text-gray-500">
                                {formatFileSize(file.size)} • Uploaded by {file.uploader_name} • {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })} • {file.download_count} downloads
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDownload(file)}
                              disabled={downloadFile.isPending}
                              className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              className="p-2 text-gray-400 hover:text-green-600"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {userRole === 'admin' && (
                              <button
                                onClick={() => handleDelete(file)}
                                disabled={deleteFile.isPending}
                                className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {files.length === 0 && folders.length === 0 && (
                  <div className="text-center py-12">
                    <Folder className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                      {searchQuery ? 'No files found' : 'No files yet'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {searchQuery
                        ? 'Try adjusting your search terms'
                        : 'Upload sheet music, recordings, setlists, and other band files'
                      }
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => setShowUploadForm(true)}
                        className="btn-primary"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload First File
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <BandSidebar bandId={bandId!} />
          </div>
        </div>
      </main>
    </div>
  )
}