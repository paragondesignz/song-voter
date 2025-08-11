import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBand, useBandMembers, useUserBandRole } from '@/hooks/useBands'
import { Header } from '@/components/Header'
import { 
  Download, 
  FileText, 
  FileSpreadsheet,
  Copy,
  Check,
  ArrowLeft,
  AlertCircle,
  Users,
  Calendar,
  Shield
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

type ExportFormat = 'csv' | 'json' | 'text'

export function ExportMembers() {
  const { bandId } = useParams<{ bandId: string }>()
  const navigate = useNavigate()
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [includeEmail, setIncludeEmail] = useState(true)
  const [includeRole, setIncludeRole] = useState(true)
  const [includeJoinDate, setIncludeJoinDate] = useState(true)
  const [copied, setCopied] = useState(false)
  const [exportData, setExportData] = useState<string>('')
  
  const { data: band } = useBand(bandId!)
  const { data: members } = useBandMembers(bandId!)
  const { data: userRole } = useUserBandRole(bandId!)

  const isAdmin = userRole === 'admin'

  const generateCSV = () => {
    if (!members || members.length === 0) return ''
    
    const headers = ['Name']
    if (includeEmail) headers.push('Email')
    if (includeRole) headers.push('Role')
    if (includeJoinDate) headers.push('Joined Date')
    
    const rows = [headers.join(',')]
    
    members.forEach(member => {
      const row = [member.user?.display_name || 'Unknown']
      if (includeEmail) row.push(member.user?.email || '')
      if (includeRole) row.push(member.role)
      if (includeJoinDate) row.push(format(new Date(member.joined_at), 'yyyy-MM-dd'))
      rows.push(row.map(cell => `"${cell}"`).join(','))
    })
    
    return rows.join('\n')
  }

  const generateJSON = () => {
    if (!members || members.length === 0) return '[]'
    
    const data = members.map(member => {
      const obj: any = {
        name: member.user?.display_name || 'Unknown'
      }
      if (includeEmail) obj.email = member.user?.email || ''
      if (includeRole) obj.role = member.role
      if (includeJoinDate) obj.joinedDate = member.joined_at
      return obj
    })
    
    return JSON.stringify(data, null, 2)
  }

  const generateText = () => {
    if (!members || members.length === 0) return ''
    
    const lines = [`${band?.name} - Member List\n${'='.repeat(40)}\n`]
    
    members.forEach((member, index) => {
      lines.push(`${index + 1}. ${member.user?.display_name || 'Unknown'}`)
      if (includeEmail) lines.push(`   Email: ${member.user?.email || 'N/A'}`)
      if (includeRole) lines.push(`   Role: ${member.role}`)
      if (includeJoinDate) lines.push(`   Joined: ${format(new Date(member.joined_at), 'MMMM d, yyyy')}`)
      lines.push('')
    })
    
    lines.push(`\nTotal Members: ${members.length}`)
    lines.push(`Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`)
    
    return lines.join('\n')
  }

  const handleExport = () => {
    let data = ''
    
    switch (exportFormat) {
      case 'csv':
        data = generateCSV()
        break
      case 'json':
        data = generateJSON()
        break
      case 'text':
        data = generateText()
        break
    }
    
    setExportData(data)
    
    // Download file
    const blob = new Blob([data], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${band?.name?.replace(/\s+/g, '_')}_members.${exportFormat === 'json' ? 'json' : exportFormat === 'csv' ? 'csv' : 'txt'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast.success(`Members exported as ${exportFormat.toUpperCase()}`)
  }

  const handleCopy = async () => {
    if (!exportData) {
      let data = ''
      switch (exportFormat) {
        case 'csv':
          data = generateCSV()
          break
        case 'json':
          data = generateJSON()
          break
        case 'text':
          data = generateText()
          break
      }
      setExportData(data)
      await navigator.clipboard.writeText(data)
    } else {
      await navigator.clipboard.writeText(exportData)
    }
    
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="card text-center py-12">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Admin Access Required</h2>
            <p className="text-gray-600 mb-6">
              Only band admins can export member data.
            </p>
            <button
              onClick={() => navigate(`/band/${bandId}/members`)}
              className="btn-primary"
            >
              Back to Members
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(`/band/${bandId}/members`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Members
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Export Members</h1>
          <p className="text-lg text-gray-600 mt-2">
            {band?.name} • {members?.length || 0} members
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Export Format */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Export Format</h2>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    exportFormat === 'csv'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-sm font-medium">CSV</p>
                  <p className="text-xs text-gray-500 mt-1">For spreadsheets</p>
                </button>
                
                <button
                  onClick={() => setExportFormat('json')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    exportFormat === 'json'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm font-medium">JSON</p>
                  <p className="text-xs text-gray-500 mt-1">For developers</p>
                </button>
                
                <button
                  onClick={() => setExportFormat('text')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    exportFormat === 'text'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm font-medium">Text</p>
                  <p className="text-xs text-gray-500 mt-1">Plain text list</p>
                </button>
              </div>
            </div>

            {/* Export Options */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Include Fields</h2>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="rounded border-gray-300 text-primary-600 mr-3"
                  />
                  <div>
                    <p className="font-medium text-sm">Name</p>
                    <p className="text-xs text-gray-500">Member display names (always included)</p>
                  </div>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeEmail}
                    onChange={(e) => setIncludeEmail(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 mr-3"
                  />
                  <div>
                    <p className="font-medium text-sm">Email Address</p>
                    <p className="text-xs text-gray-500">Member email addresses</p>
                  </div>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeRole}
                    onChange={(e) => setIncludeRole(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 mr-3"
                  />
                  <div>
                    <p className="font-medium text-sm">Role</p>
                    <p className="text-xs text-gray-500">Admin or member status</p>
                  </div>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeJoinDate}
                    onChange={(e) => setIncludeJoinDate(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 mr-3"
                  />
                  <div>
                    <p className="font-medium text-sm">Join Date</p>
                    <p className="text-xs text-gray-500">When members joined the band</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Preview */}
            {exportData && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Preview</h2>
                <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto">
                  {exportData}
                </pre>
              </div>
            )}

            {/* Export Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCopy}
                className="btn-secondary"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy to Clipboard
                  </>
                )}
              </button>
              <button
                onClick={handleExport}
                className="btn-primary"
                disabled={!members || members.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Download {exportFormat.toUpperCase()}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Export Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    Total Members
                  </div>
                  <span className="font-medium">{members?.length || 0}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Shield className="h-4 w-4 mr-2" />
                    Admins
                  </div>
                  <span className="font-medium">
                    {members?.filter(m => m.role === 'admin').length || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <FileText className="h-4 w-4 mr-2" />
                    Format
                  </div>
                  <span className="font-medium uppercase">{exportFormat}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Export Date
                  </div>
                  <span className="font-medium">{format(new Date(), 'MMM d')}</span>
                </div>
              </div>
            </div>

            <div className="card bg-blue-50 border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Privacy Notice</h3>
              <p className="text-xs text-blue-700">
                Member data should be handled in accordance with privacy regulations. 
                Only share exported data with authorized individuals and delete files when no longer needed.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}