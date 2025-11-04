'use client'

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2,
  Share2,
  X
} from "lucide-react"
import HTMLFlipBook from 'react-pageflip'

interface MagazinePage {
  id: string
  magazine_id: string
  page_number: number
  page_title: string | null
  image_url: string
  page_type: 'cover' | 'content' | 'back_cover'
  sort_order: number
}

interface Magazine {
  id: string
  title: string
  description: string | null
  issue_number: number
  issue_date: string
  status: 'draft' | 'published' | 'archived'
  cover_image_url: string | null
  magazine_pages?: MagazinePage[]
}

interface FlipbookMagazineProps {
  magazine?: Magazine
  onClose?: () => void
}

export function FlipbookMagazine({ magazine, onClose }: FlipbookMagazineProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [displayedPage, setDisplayedPage] = useState(0)
  const flipBookRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isSinglePage, setIsSinglePage] = useState(false)

  // Use real magazine pages from database
  const magazinePages = magazine?.magazine_pages?.sort((a, b) => a.sort_order - b.sort_order) || []

  // Ensure even page count when using a single cover so right-page pairing is stable
  const pagesForFlipbook = (() => {
    const ordered = [...magazinePages]
    if (ordered.length > 0) {
      const needsPadding = ordered.length % 2 !== 0 // make total even
      if (needsPadding) {
        ordered.push({
          id: '__blank__',
          magazine_id: magazine?.id || '',
          page_number: (ordered[ordered.length - 1]?.page_number || 0) + 1,
          page_title: 'Blank',
          image_url: '',
          page_type: 'content',
          sort_order: (ordered[ordered.length - 1]?.sort_order || 0) + 1,
        } as any)
      }
    }
    return ordered
  })()

  const totalPages = pagesForFlipbook.length

  const nextPage = () => {
    if (flipBookRef.current) {
      const nextIdx = Math.min(currentPage + 1, totalPages - 1)
      setDisplayedPage(nextIdx)
      try { flipBookRef.current.pageFlip().update?.() } catch {}
      // Give the engine a tick to prepare the next spread before starting the animation
      requestAnimationFrame(() => {
        try { flipBookRef.current.pageFlip().update?.() } catch {}
        flipBookRef.current.pageFlip().flipNext()
      })
    }
  }

  const prevPage = () => {
    if (flipBookRef.current) {
      const prevIdx = Math.max(currentPage - 1, 0)
      setDisplayedPage(prevIdx)
      try { flipBookRef.current.pageFlip().update?.() } catch {}
      requestAnimationFrame(() => {
        try { flipBookRef.current.pageFlip().update?.() } catch {}
        flipBookRef.current.pageFlip().flipPrev()
      })
    }
  }

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        if (containerRef.current) {
          await containerRef.current.requestFullscreen()
          setIsFullscreen(true)
        }
      } else {
        // Exit fullscreen
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.log('Fullscreen error:', error)
      // Fallback: toggle CSS fullscreen
      setIsFullscreen(!isFullscreen)
    }
  }

  const handlePageChange = (pageIndex: number) => {
    setCurrentPage(pageIndex)
    setDisplayedPage(pageIndex)
  }

  const shareMagazine = async () => {
    try {
      setIsLoading(true)
      const shareData = {
        title: 'Web3 Recap Magazine',
        text: 'Check out the latest Web3 Recap Magazine featuring insights on DeFi, Solana, and the Indonesian Web3 ecosystem!',
        url: window.location.href
      }

      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData)
      } else {
        // Fallback: copy to clipboard
        try {
          await navigator.clipboard.writeText(shareData.url)
          alert('Magazine link copied to clipboard!')
        } catch (clipboardErr) {
          console.log('Error copying to clipboard:', clipboardErr)
          // Fallback: show URL for manual copy
          prompt('Copy this link to share:', shareData.url)
        }
      }
    } catch (err) {
      console.log('Error sharing:', err)
      alert('Failed to share magazine. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        nextPage()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevPage()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (isFullscreen) {
          toggleFullscreen()
        } else {
          onClose?.()
        }
      } else if (e.key === 'F11') {
        e.preventDefault()
        toggleFullscreen()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isFullscreen])

  // Determine single-page mode for mobile and tablet
  useEffect(() => {
    const determineLayout = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      // Treat tablet (<= 1024px) and mobile (<= 768px) as single-page; also force single if portrait
      const single = width <= 1024 || height > width
      setIsSinglePage(single)
    }
    determineLayout()
    window.addEventListener('resize', determineLayout)
    window.addEventListener('orientationchange', determineLayout)
    return () => {
      window.removeEventListener('resize', determineLayout)
      window.removeEventListener('orientationchange', determineLayout)
    }
  }, [])

  return (
    <>
      {/* Magazine CSS */}
      <style jsx global>{`
        body {
          overflow: hidden !important;
        }
        
        html {
          overflow: hidden !important;
        }
        
         .magazine-viewport {
           width: 100vw;
           height: 100vh;
           display: flex;
           align-items: center;
           justify-content: center;
           background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
           overflow: hidden;
           position: fixed;
           top: 0;
           left: 0;
           right: 0;
           bottom: 0;
           z-index: 9990;
         }
         
         .magazine-viewport.fullscreen { z-index: 9999; }
         
         .magazine-container {
           width: min(92%, 1200px);
           height: min(88%, 1000px);
           display: flex;
           align-items: center;
           justify-content: center;
           position: relative;
         }
         
         .magazine-container.fullscreen {
           width: 100vw;
           height: 100vh;
         }
        
        .flipbook-page {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border-radius: 0;
          overflow: hidden;
          position: relative;
          backface-visibility: visible;
          -webkit-backface-visibility: visible;
          transform-style: preserve-3d;
          will-change: transform;
        }
        
        /* Single page styling for covers */
        .flipbook-page.single-page {
          /* Force single page display */
        }
        
        /* Double page styling for content */
        .flipbook-page.double-page {
          /* Standard double page spread */
        }
        
        .page-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          background: transparent;
          backface-visibility: visible;
          -webkit-backface-visibility: visible;
          transform: none;
          will-change: transform;
        }
        
        .magazine-controls {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 100;
          pointer-events: none;
        }
        
        .magazine-controls > * {
          pointer-events: auto;
        }

        /* Centered title overlay */
        .magazine-title {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          font-size: 13px;
          font-weight: 600;
          background: rgba(0,0,0,0.55);
          border: 1px solid rgba(255,255,255,0.2);
          padding: 6px 10px;
          border-radius: 10px;
          line-height: 1;
          pointer-events: none;
        }

        @media (max-width: 1024px) {
          .magazine-controls { top: 10px; left: 10px; right: 10px; }
          .magazine-title { top: 10px; font-size: 12px; padding: 5px 8px; }
        }

        @media (max-width: 768px) {
          .magazine-controls { top: 8px; left: 8px; right: 8px; }
          .magazine-title { top: 8px; font-size: 11px; padding: 4px 7px; }
        }
        
        .navigation-button {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 60px;
          height: 60px;
          background: rgba(0,0,0,0.7);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          z-index: 50;
        }
        
        .navigation-button:hover {
          background: rgba(0,0,0,0.8);
          border-color: rgba(255,255,255,0.6);
          transform: translateY(-50%) scale(1.1);
        }
        
        .navigation-button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          transform: translateY(-50%) scale(0.9);
        }
        
        .navigation-button.prev { left: 20px; }
        .navigation-button.next { right: 20px; }

        /* Tablet */
        @media (max-width: 1024px) {
          .navigation-button { width: 48px; height: 48px; }
          .navigation-button.prev { left: 14px; }
          .navigation-button.next { right: 14px; }
        }

        /* Mobile */
        @media (max-width: 768px) {
          .navigation-button { width: 42px; height: 42px; }
          .navigation-button.prev { left: 10px; }
          .navigation-button.next { right: 10px; }
        }
        
        /* Custom styles for react-pageflip */
        .st-page-flip { box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
        
        .st-page-flip .st-page { background: transparent; border-radius: 0; overflow: hidden; }
        
         .st-page-flip .st-page .st-page-content { width: 100%; height: 100%; padding: 0; margin: 0; background: transparent; }

          /* No extra overrides; use library defaults to manage faces and stacking */
         
         
         
         /* Page number styles */
         .page-number {
           position: absolute;
           bottom: 20px;
           left: 50%;
           transform: translateX(-50%);
           background: rgba(0, 0, 0, 0.8);
           color: white;
           padding: 8px 16px;
           border-radius: 20px;
           font-size: 14px;
           font-weight: 500;
           backdrop-filter: blur(10px);
           border: 1px solid rgba(255, 255, 255, 0.1);
           z-index: 100;
           pointer-events: none;
         }
         
         .page-number.fullscreen {
           bottom: 30px;
           font-size: 16px;
           padding: 10px 20px;
         }
      `}</style>
      
       <div className={`magazine-viewport ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
        {/* Magazine Controls */}
        <div className="magazine-controls">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="bg-black/70 text-white hover:bg-black/90 border-white/30 px-2 h-8"
            >
              <X className="h-4 w-4" />
            </Button>
            {/* Removed left-side page counter for cleaner header */}
          </div>
          
           <div className="flex items-center space-x-2">
             <Button 
               variant="outline" 
               size="sm"
               onClick={toggleFullscreen}
               className="bg-black/70 text-white hover:bg-black/90 border-white/30"
             >
               <Maximize2 className="h-4 w-4" />
             </Button>
             <Button 
               variant="outline" 
               size="sm"
               onClick={shareMagazine}
               disabled={isLoading}
               className="bg-black/70 text-white hover:bg-black/90 border-white/30 disabled:opacity-50"
             >
               <Share2 className="h-4 w-4" />
             </Button>
           </div>
        </div>

        {/* Centered Title */}
        <div className="magazine-title">
          {(magazine?.title || 'Web3 Recap Magazine')}
        </div>

         {/* Magazine Container */}
          <div className={`magazine-container ${isFullscreen ? 'fullscreen' : ''}`}> 
           <HTMLFlipBook
             ref={flipBookRef}
            width={isFullscreen ? (isSinglePage ? 720 : 880) : (isSinglePage ? 420 : 620)}
            height={isFullscreen ? (isSinglePage ? 1024 : 1024) : (isSinglePage ? 720 : 820)}
             size="stretch"
            minWidth={isFullscreen ? (isSinglePage ? 360 : 640) : (isSinglePage ? 300 : 420)}
            maxWidth={isFullscreen ? (isSinglePage ? 980 : 1280) : (isSinglePage ? 520 : 840)}
            minHeight={isFullscreen ? (isSinglePage ? 600 : 860) : (isSinglePage ? 520 : 640)}
            maxHeight={isFullscreen ? (isSinglePage ? 1400 : 1400) : (isSinglePage ? 900 : 1024)}
            maxShadowOpacity={0.5}
            showCover={true}
            mobileScrollSupport={true}
            className="flipbook"
            style={{ perspective: '2000px' }}
            startPage={0}
            drawShadow={false}
            flippingTime={800}
            usePortrait={isSinglePage}
            startZIndex={10}
            autoSize={true}
            clickEventForward={true}
            disableFlipByClick={false}
            swipeDistance={30}
            showPageCorners={true}
            useMouseEvents={true}
            onFlip={(e: any) => {
              // Elevate the flipping page during animation to avoid underlay artifacts
              try {
                const bookEl = (flipBookRef.current?.pageFlip?.().getBookElement?.()) || document.querySelector('.flipbook')
                if (bookEl) {
                  const flipping = bookEl.querySelector('.st-page--flipping') as HTMLElement | null
                  const current = bookEl.querySelector('.st-page--current') as HTMLElement | null
                  if (flipping) flipping.style.zIndex = '1000'
                  if (current) current.style.zIndex = '900'
                }
              } catch {}
              handlePageChange(e.data)
            }}
            onChangeOrientation={() => {
              // Force a re-render to let the library recompute right/left pages
              setTimeout(() => {
                try { flipBookRef.current?.pageFlip?.().update?.(); } catch {}
              }, 0)
            }}
            onChangeState={() => {
              // After state changes, force an update to sync the under-page
              setTimeout(() => {
                try { flipBookRef.current?.pageFlip?.().update?.(); } catch {}
              }, 0)
            }}
           >
          {pagesForFlipbook
            .map((page, idx, arr) => (
            <div key={page.id} className={`flipbook-page ${idx === 0 ? 'hard' : ''} ${idx === arr.length - 1 ? 'hard' : ''} ${page.id === '__blank__' ? 'blank' : ''}`}>
              <img 
                src={page.image_url || (page.id === '__blank__' ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>' : '/logo.png')} 
                alt={page.page_title || `Page ${page.page_number}`}
                className="page-image"
                onError={(e) => {
                  e.currentTarget.src = '/logo.png'
                }}
              />
            </div>
          ))}
          </HTMLFlipBook>
        </div>

        {/* Navigation Buttons */}
        <button
          onClick={prevPage}
          className="navigation-button prev"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        
        <button
          onClick={nextPage}
          className="navigation-button next"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

         {/* Page Number (bottom, subtle) */}
         <div className={`page-number ${isFullscreen ? 'fullscreen' : ''}`}>
           {displayedPage + 1} / {totalPages}
         </div>

         {/* Instructions */}
         <div className="absolute bottom-4 right-4 text-white/60 text-sm max-w-xs">
           Use ← → keys or click buttons to navigate • ESC to {isFullscreen ? 'exit fullscreen' : 'close'} • F11 or button for fullscreen • Click pages to turn
         </div>
      </div>
    </>
  )
}