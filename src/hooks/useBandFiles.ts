import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

export interface BandFile {
  id: string
  band_id: string
  folder_id: string | null
  uploaded_by: string
  file_name: string
  file_size: number
  mime_type: string
  storage_path: string
  folder_path: string
  description: string | null
  is_public: boolean
  download_count: number
  created_at: string
  updated_at: string
  uploader?: {
    display_name: string
    avatar_url?: string
  }
}

export interface BandFolder {
  id: string
  band_id: string
  created_by: string
  name: string
  parent_folder_id: string | null
  folder_path: string
  description: string | null
  created_at: string
  updated_at: string
  file_count?: number
  creator?: {
    display_name: string
    avatar_url?: string
  }
}

export interface FolderContent {
  type: 'file' | 'folder'
  id: string
  name: string
  size: number
  mime_type: string
  created_at: string
  updated_at: string
  uploaded_by: string
  uploader_name: string
  download_count: number
  file_count: number
}

// Hook to get folder contents (files and subfolders)
export function useFolderContents(bandId: string, folderPath: string = '/') {
  return useQuery({
    queryKey: ['folder-contents', bandId, folderPath],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_folder_contents', {
          band_id_param: bandId,
          folder_path_param: folderPath
        })

      if (error) throw error
      return data as FolderContent[]
    },
    enabled: !!bandId,
  })
}

// Hook to get all files in a band
export function useBandFiles(bandId: string) {
  return useQuery({
    queryKey: ['band-files', bandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('band_files')
        .select(`
          *,
          uploader:uploaded_by (
            display_name,
            avatar_url
          )
        `)
        .eq('band_id', bandId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as BandFile[]
    },
    enabled: !!bandId,
  })
}

// Hook to get all folders in a band
export function useBandFolders(bandId: string) {
  return useQuery({
    queryKey: ['band-folders', bandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('band_folders')
        .select(`
          *,
          creator:created_by (
            display_name,
            avatar_url
          )
        `)
        .eq('band_id', bandId)
        .order('folder_path', { ascending: true })

      if (error) throw error
      return data as BandFolder[]
    },
    enabled: !!bandId,
  })
}

// Hook to upload files
export function useUploadFiles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bandId,
      folderPath = '/',
      files
    }: {
      bandId: string
      folderPath?: string
      files: FileList
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const uploadedFiles: BandFile[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Generate unique storage path
        const { data: storagePath, error: pathError } = await supabase
          .rpc('generate_storage_path', {
            band_id_param: bandId,
            folder_path_param: folderPath === '/' ? '' : folderPath.replace('/', ''),
            file_name_param: file.name
          })

        if (pathError) throw pathError

        // Upload file to storage
        const { data: storageData, error: storageError } = await supabase.storage
          .from('band-files')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (storageError) throw storageError

        // Create file record in database
        const { data: fileRecord, error: dbError } = await supabase
          .from('band_files')
          .insert({
            band_id: bandId,
            uploaded_by: session.user.id,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            storage_path: storageData.path,
            folder_path: folderPath
          })
          .select(`
            *,
            uploader:uploaded_by (
              display_name,
              avatar_url
            )
          `)
          .single()

        if (dbError) {
          // Clean up storage if database insert fails
          await supabase.storage.from('band-files').remove([storageData.path])
          throw dbError
        }

        uploadedFiles.push(fileRecord as BandFile)
      }

      return uploadedFiles
    },
    onSuccess: (uploadedFiles) => {
      const bandId = uploadedFiles[0]?.band_id
      queryClient.invalidateQueries({ queryKey: ['band-files', bandId] })
      queryClient.invalidateQueries({ queryKey: ['folder-contents', bandId] })
      toast.success(`${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} uploaded successfully!`)
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to upload files')
    },
  })
}

// Hook to download a file
export function useDownloadFile() {
  return useMutation({
    mutationFn: async (file: BandFile) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      // Get signed URL for download
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from('band-files')
        .createSignedUrl(file.storage_path, 3600) // 1 hour expiry

      if (urlError) throw urlError

      // Increment download count
      await supabase.rpc('increment_download_count', {
        file_id_param: file.id
      })

      // Trigger download
      const link = document.createElement('a')
      link.href = signedUrl.signedUrl
      link.download = file.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      return signedUrl.signedUrl
    },
    onSuccess: () => {
      toast.success('File download started')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to download file')
    },
  })
}

// Hook to delete a file
export function useDeleteFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: BandFile) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      // Delete from database first
      const { error: dbError } = await supabase
        .from('band_files')
        .delete()
        .eq('id', file.id)

      if (dbError) throw dbError

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('band-files')
        .remove([file.storage_path])

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError)
        // Don't throw here as the database record is already deleted
      }

      return file
    },
    onSuccess: (deletedFile) => {
      queryClient.invalidateQueries({ queryKey: ['band-files', deletedFile.band_id] })
      queryClient.invalidateQueries({ queryKey: ['folder-contents', deletedFile.band_id] })
      toast.success('File deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete file')
    },
  })
}

// Hook to create a folder
export function useCreateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bandId,
      name,
      parentPath = '/',
      description
    }: {
      bandId: string
      name: string
      parentPath?: string
      description?: string
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      // Construct full folder path
      const cleanParentPath = parentPath === '/' ? '' : parentPath.replace(/^\/|\/$/g, '')
      const folderPath = cleanParentPath ? `/${cleanParentPath}/${name}` : `/${name}`

      // Find parent folder ID if not root
      let parentFolderId = null
      if (parentPath !== '/') {
        const { data: parentFolder } = await supabase
          .from('band_folders')
          .select('id')
          .eq('band_id', bandId)
          .eq('folder_path', parentPath)
          .single()

        parentFolderId = parentFolder?.id || null
      }

      const { data, error } = await supabase
        .from('band_folders')
        .insert({
          band_id: bandId,
          created_by: session.user.id,
          name,
          parent_folder_id: parentFolderId,
          folder_path: folderPath,
          description
        })
        .select(`
          *,
          creator:created_by (
            display_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error
      return data as BandFolder
    },
    onSuccess: (folder) => {
      queryClient.invalidateQueries({ queryKey: ['band-folders', folder.band_id] })
      queryClient.invalidateQueries({ queryKey: ['folder-contents', folder.band_id] })
      toast.success('Folder created successfully')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create folder')
    },
  })
}

// Hook to delete a folder
export function useDeleteFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (folder: BandFolder) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      // Check if folder has any files or subfolders
      const { data: contents } = await supabase
        .rpc('get_folder_contents', {
          band_id_param: folder.band_id,
          folder_path_param: folder.folder_path
        })

      if (contents && contents.length > 0) {
        throw new Error('Cannot delete folder that contains files or subfolders')
      }

      const { error } = await supabase
        .from('band_folders')
        .delete()
        .eq('id', folder.id)

      if (error) throw error
      return folder
    },
    onSuccess: (folder) => {
      queryClient.invalidateQueries({ queryKey: ['band-folders', folder.band_id] })
      queryClient.invalidateQueries({ queryKey: ['folder-contents', folder.band_id] })
      toast.success('Folder deleted successfully')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete folder')
    },
  })
}

// Hook to get file preview URL
export function useFilePreviewUrl(file: BandFile | null) {
  return useQuery({
    queryKey: ['file-preview', file?.id],
    queryFn: async () => {
      if (!file) return null

      const { data, error } = await supabase.storage
        .from('band-files')
        .createSignedUrl(file.storage_path, 3600) // 1 hour expiry

      if (error) throw error
      return data.signedUrl
    },
    enabled: !!file && (
      file.mime_type.startsWith('image/') ||
      file.mime_type === 'application/pdf' ||
      file.mime_type.startsWith('text/')
    ),
  })
}