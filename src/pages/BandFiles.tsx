import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useBand, useUserBandRole } from '@/hooks/useBands'
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

// Placeholder interfaces - these would be replaced with real hooks
interface BandFile {
  id: string
  band_id: string
  uploaded_by: string
  uploader: {
    display_name: string
    avatar_url?: string
  }
  name: string
  size: number
  type: string
  folder_path: string
  url: string
  created_at: string
}

interface BandFolder {
  id: string
  name: string
  path: string
  created_at: string
  file_count: number
}

export function BandFiles() {
  const { bandId } = useParams<{ bandId: string }>()
  const { data: band } = useBand(bandId!)
  const { data: userRole } = useUserBandRole(bandId!)

  const [currentPath, setCurrentPath] = useState('/')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Mock data - replace with real hooks
  const folders: BandFolder[] = [
    {
      id: '1',
      name: 'Sheet Music',
      path: '/sheet-music',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      file_count: 12
    },
    {
      id: '2',
      name: 'Recordings',
      path: '/recordings',
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      file_count: 8
    },
    {
      id: '3',
      name: 'Setlists',
      path: '/setlists',
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      file_count: 5
    }
  ]

  const files: BandFile[] = [
    {
      id: '1',
      band_id: bandId!,
      uploaded_by: 'user1',
      uploader: {
        display_name: 'John Doe',
        avatar_url: undefined
      },
      name: 'Sweet Child O Mine - Tabs.pdf',
      size: 2456789,
      type: 'application/pdf',
      folder_path: '/sheet-music',
      url: '/files/sweet-child-tabs.pdf',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      band_id: bandId!,
      uploaded_by: 'user2',
      uploader: {
        display_name: 'Jane Smith',
        avatar_url: undefined
      },
      name: 'Band Logo.png',
      size: 156789,
      type: 'image/png',
      folder_path: '/',
      url: '/files/band-logo.png',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      band_id: bandId!,
      uploaded_by: 'user3',
      uploader: {
        display_name: 'Mike Johnson',
        avatar_url: undefined
      },
      name: 'Practice Recording - Dec 15.mp3',
      size: 8456789,
      type: 'audio/mpeg',
      folder_path: '/recordings',
      url: '/files/practice-dec-15.mp3',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage className="h-5 w-5 text-green-600" />
    if (type.startsWith('audio/')) return <FileAudio className="h-5 w-5 text-purple-600" />
    if (type.startsWith('video/')) return <FileVideo className="h-5 w-5 text-red-600" />
    if (type === 'application/pdf') return <FileText className="h-5 w-5 text-red-600" />
    return <File className="h-5 w-5 text-gray-600" />
  }

  const filteredFiles = files.filter(file =>
    file.folder_path === currentPath &&
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredFolders = folders.filter(folder =>
    folder.path.startsWith(currentPath) &&
    folder.path !== currentPath &&
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFiles) return

    // TODO: Implement file upload to Supabase Storage
    console.log('Uploading files:', Array.from(selectedFiles).map(f => f.name))
    setSelectedFiles(null)
    setShowUploadForm(false)
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return

    // TODO: Implement folder creation
    console.log('Creating folder:', newFolderName)
    setNewFolderName('')
    setShowCreateFolder(false)
  }

  const handleDownload = (file: BandFile) => {
    // TODO: Implement file download from Supabase Storage
    console.log('Downloading file:', file.name)
  }

  const handleDelete = (fileId: string) => {
    // TODO: Implement file deletion
    console.log('Deleting file:', fileId)
  }

  if (!band) {
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
                      disabled={!selectedFiles}
                      className="btn-primary"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
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
                      className="btn-primary"
                    >
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Create
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Files and Folders List */}
            <div className="card">
              <div className="space-y-4">
                {/* Folders */}
                {filteredFolders.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Folders</h3>
                    <div className="space-y-2">
                      {filteredFolders.map((folder) => (
                        <div
                          key={folder.id}
                          onClick={() => setCurrentPath(folder.path)}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="flex items-center space-x-3">
                            <Folder className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium text-gray-900">{folder.name}</p>
                              <p className="text-sm text-gray-500">
                                {folder.file_count} files • {formatDistanceToNow(new Date(folder.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {filteredFiles.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Files</h3>
                    <div className="space-y-2">
                      {filteredFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            {getFileIcon(file.type)}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-sm text-gray-500">
                                {formatFileSize(file.size)} • Uploaded by {file.uploader.display_name} • {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDownload(file)}
                              className="p-2 text-gray-400 hover:text-blue-600"
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
                                onClick={() => handleDelete(file.id)}
                                className="p-2 text-gray-400 hover:text-red-600"
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
                {filteredFiles.length === 0 && filteredFolders.length === 0 && (
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