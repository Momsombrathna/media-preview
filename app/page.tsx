'use client'

import { useEffect, useState } from 'react'
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube, FaPlay } from 'react-icons/fa'

interface PreviewData {
  title: string
  description: string
  image?: string
  url: string
  blocked?: boolean
  type?: 'post' | 'story' | 'profile'
  youtubeId?: string
}

interface HistoryItem {
  url: string
  platform: string
  image?: string
  type?: 'post' | 'story' | 'profile'
}

const detectPlatform = (url: string) => {
  if (url.includes("facebook.com")) return "facebook"
  if (url.includes("instagram.com")) return "instagram"
  if (url.includes("tiktok.com")) return "tiktok"
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube"
  return "web"
}

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case "facebook": return <FaFacebook className="text-blue-600" />
    case "instagram": return <FaInstagram className="text-pink-500" />
    case "tiktok": return <FaTiktok className="text-black" />
    case "youtube": return <FaYoutube className="text-red-600" />
    default: return null
  }
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [data, setData] = useState<PreviewData | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('scrapeHistory')
    if (saved) setHistory(JSON.parse(saved))
  }, [])

  const saveHistory = (items: HistoryItem[]) => {
    setHistory(items)
    localStorage.setItem('scrapeHistory', JSON.stringify(items))
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('scrapeHistory')
  }

  const removeHistoryItem = (urlToRemove: string) => {
    const updated = history.filter(item => item.url !== urlToRemove)
    saveHistory(updated)
  }

  const handlePreview = async (target?: string) => {
    const link = (target ?? url).trim()
    if (!link) {
      setError("Please enter a valid URL")
      return
    }

    setLoading(true)
    setError('')
    setData(null)

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link }),
      })

      const result: PreviewData = await res.json()
      if (!res.ok) throw new Error((result as any).error)

      // Detect type automatically
      const type = result.url.includes('youtube') && result.youtubeId
        ? 'post'
        : result.url.includes('story') ? 'story' : 'profile'

      const platform = detectPlatform(link)
      const newItem: HistoryItem = { url: link, platform, image: result.image, type }
      saveHistory([newItem, ...history.filter(h => h.url !== link)].slice(0, 8))

      setData({ ...result, type })
    } catch (e: any) {
      setError(e.message || 'Preview failed')
    } finally {
      setLoading(false)
    }
  }

  const Username = ({ urlLink }: { urlLink: string }) => {
    const username = urlLink.split('/').filter(Boolean).pop()
    return <span>{username}</span>
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 px-4 py-10 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto">

        <h1 className="text-3xl font-bold mb-2">Multi-platform Link Preview</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Facebook • Instagram • TikTok • YouTube
        </p>

        {/* INPUT */}
        <div className="flex gap-2 bg-white dark:bg-gray-800 p-2 rounded-xl shadow mb-3">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Paste URL here..."
            className="flex-1 px-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            disabled={loading}
          />

          <button
            onClick={() => handlePreview()}
            disabled={loading}
            className="relative w-[120px] h-[48px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center"
          >
            <span className={`transition-opacity duration-150 ${loading ? 'opacity-0' : 'opacity-100'}`}>
              Preview
            </span>
            {loading && <span className="absolute animate-spin text-lg">⟳</span>}
          </button>
        </div>

        {/* HISTORY */}
        {history.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-8 items-center">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-full shadow">
                <button onClick={() => handlePreview(h.url)} className="flex items-center gap-2">
                  {getPlatformIcon(h.platform)}
                  {h.image ? (
                    <img src={h.image} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-6 h-6 bg-gray-300 rounded-full" />
                  )}
                  <span className="text-sm font-medium truncate max-w-[120px]"><Username urlLink={h.url} /></span>
                </button>

                <button onClick={() => removeHistoryItem(h.url)} className="text-red-500 hover:text-red-700 text-sm font-bold" title="Remove">
                  ✖
                </button>
              </div>
            ))}

            <button onClick={clearHistory} className="px-3 py-2 rounded-full bg-red-100 dark:bg-red-900 text-red-600 text-sm">
              Clear All
            </button>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* PREVIEW */}
        {data && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden relative">
            {data.image && (
              <div className="relative">
                <img src={data.image} className="w-full h-64 object-cover" referrerPolicy="no-referrer" />
                {/* Play button for post/story */}
                {data.type === 'post' && !data.blocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FaPlay className="text-white text-6xl drop-shadow-lg animate-pulse" />
                  </div>
                )}
              </div>
            )}

            {/* YouTube embed */}
            {data.youtubeId && (
              <iframe
                className="w-full h-64"
                src={`https://www.youtube.com/embed/${data.youtubeId}`}
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            )}

            <div className="p-6">
              <h2 className="text-xl font-bold mb-2">{data.title}</h2>
              {data.description && (
                <p className="text-gray-600 dark:text-gray-300 mb-3">{data.description}</p>
              )}
              {data.blocked && (
                <p className="text-sm text-orange-500">⚠️ Content restricted or private</p>
              )}
              {data.type && (
                <p className="text-xs text-gray-400 mb-1">
                  {data.type.toUpperCase()} • {detectPlatform(data.url).toUpperCase()}
                </p>
              )}
              <a href={data.url} target="_blank" className="text-blue-600 text-sm underline">Open on platform</a>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
