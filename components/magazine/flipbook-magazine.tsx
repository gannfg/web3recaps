'use client'

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2,
  Share2,
  X,
  CheckCircle2,
  AlertCircle,
  BookOpen
} from "lucide-react"
import HTMLFlipBook from 'react-pageflip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>("")

  // Use real magazine pages from database
  const magazinePages = magazine?.magazine_pages?.filter(page => page.image_url)?.sort((a, b) => a.sort_order - b.sort_order) || []

  // Ensure even page count when using a single cover so right-page pairing is stable
  const pagesForFlipbook = (() => {
    // Filter out pages with invalid or empty image URLs
    const validPages = magazinePages.filter(page => page.image_url && page.image_url.trim() !== '')
    
    if (validPages.length === 0) {
      return []
    }

    const ordered = [...validPages]
    // Make total even for proper page pairing
    if (ordered.length % 2 !== 0) {
      ordered.push({
        id: '__blank__',
        magazine_id: magazine?.id || '',
        page_number: (ordered[ordered.length - 1]?.page_number || 0) + 1,
        page_title: 'Blank',
        image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg==',
        page_type: 'content',
        sort_order: (ordered[ordered.length - 1]?.sort_order || 0) + 1,
      } as any)
    }
    return ordered
  })()

  const totalPages = pagesForFlipbook.length || 1

  // Function to update page stacking order - must be defined before nextPage/prevPage
  const updatePageStacking = useCallback(() => {
    try {
      const pageFlip = flipBookRef.current?.pageFlip?.()
      if (!pageFlip) return
      
      const bookEl = pageFlip.getBookElement?.() || document.querySelector('.st-page-flip')
      if (!bookEl) return
      
      // Get all pages
      const allPages = bookEl.querySelectorAll('.st-page') as NodeListOf<HTMLElement>
      
      // Reset all pages to base z-index
      allPages.forEach((page) => {
        if (!page.classList.contains('st-page--flipping')) {
          page.style.zIndex = '1'
        }
      })
      
      // Find flipping page and set highest z-index
      const flipping = bookEl.querySelector('.st-page--flipping') as HTMLElement | null
      if (flipping) {
        flipping.style.zIndex = '10000'
        flipping.style.position = 'relative'
        
        // Ensure page halves are also on top
        const halves = flipping.querySelectorAll('.st-page__half') as NodeListOf<HTMLElement>
        halves.forEach((half) => {
          half.style.zIndex = '10001'
        })
      }
      
      // Set current page z-index
      const current = bookEl.querySelector('.st-page--current') as HTMLElement | null
      if (current && !current.classList.contains('st-page--flipping')) {
        current.style.zIndex = '100'
      }
      
      // Set next page z-index (page being revealed)
      const next = bookEl.querySelector('.st-page--next') as HTMLElement | null
      if (next) {
        next.style.zIndex = '200'
      }
    } catch (err) {
      console.error('Error updating page stacking:', err)
    }
  }, [])

  const nextPage = useCallback(() => {
    if (!flipBookRef.current) return
    
    try {
      const pageFlip = flipBookRef.current.pageFlip()
      if (!pageFlip) return
      
      // Check if we can flip to next page
      const canFlip = currentPage < totalPages - 1
      if (canFlip) {
        // Update stacking before flip starts
        requestAnimationFrame(() => {
          updatePageStacking()
          pageFlip.flipNext()
        })
      }
    } catch (error) {
      console.error('Error flipping to next page:', error)
    }
  }, [currentPage, totalPages, updatePageStacking])

  const prevPage = useCallback(() => {
    if (!flipBookRef.current) return
    
    try {
      const pageFlip = flipBookRef.current.pageFlip()
      if (!pageFlip) return
      
      // Check if we can flip to previous page
      const canFlip = currentPage > 0
      if (canFlip) {
        // Update stacking before flip starts
        requestAnimationFrame(() => {
          updatePageStacking()
          pageFlip.flipPrev()
        })
      }
    } catch (error) {
      console.error('Error flipping to previous page:', error)
    }
  }, [currentPage, totalPages, updatePageStacking])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        if (containerRef.current) {
          await containerRef.current.requestFullscreen()
          setIsFullscreen(true)
          
          // Update flipbook after fullscreen change
          setTimeout(() => {
            try {
              const pageFlip = flipBookRef.current?.pageFlip?.()
              if (pageFlip) {
                pageFlip.update()
              }
            } catch (err) {
              console.error('Error updating flipbook after fullscreen:', err)
            }
          }, 200)
        }
      } else {
        // Exit fullscreen
        await document.exitFullscreen()
        setIsFullscreen(false)
        
        // Update flipbook after fullscreen change
        setTimeout(() => {
          try {
            const pageFlip = flipBookRef.current?.pageFlip?.()
            if (pageFlip) {
              pageFlip.update()
            }
          } catch (err) {
            console.error('Error updating flipbook after fullscreen:', err)
          }
        }, 200)
      }
    } catch (error) {
      console.log('Fullscreen error:', error)
      // Fallback: toggle CSS fullscreen
      setIsFullscreen(prev => !prev)
    }
  }, [])

  const handlePageChange = (e: { data: number }) => {
    const newPage = e.data
    setCurrentPage(newPage)
    setDisplayedPage(newPage)
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
          setSuccessDialogOpen(true)
        } catch (clipboardErr) {
          console.log('Error copying to clipboard:', clipboardErr)
          // Fallback: show URL for manual copy
          prompt('Copy this link to share:', shareData.url)
        }
      }
    } catch (err) {
      console.log('Error sharing:', err)
      setErrorMessage('Failed to share magazine. Please try again.')
      setErrorDialogOpen(true)
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
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        if (flipBookRef.current) {
          try {
            const pageFlip = flipBookRef.current.pageFlip()
            if (pageFlip && currentPage < totalPages - 1) {
              pageFlip.flipNext()
            }
          } catch (err) {
            console.error('Error in nextPage keyboard handler:', err)
          }
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (flipBookRef.current) {
          try {
            const pageFlip = flipBookRef.current.pageFlip()
            if (pageFlip && currentPage > 0) {
              pageFlip.flipPrev()
            }
          } catch (err) {
            console.error('Error in prevPage keyboard handler:', err)
          }
        }
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
  }, [currentPage, totalPages, isFullscreen, onClose, toggleFullscreen, nextPage, prevPage])

  // Determine single-page mode for mobile and tablet
  useEffect(() => {
    const determineLayout = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      // Treat tablet (<= 1024px) and mobile (<= 768px) as single-page; also force single if portrait
      const single = width <= 1024 || height > width
      setIsSinglePage(single)
      
      // Update flipbook after layout change
      setTimeout(() => {
        try {
          const pageFlip = flipBookRef.current?.pageFlip?.()
          if (pageFlip) {
            pageFlip.update()
          }
        } catch (err) {
          console.error('Error updating flipbook after layout change:', err)
        }
      }, 100)
    }
    determineLayout()
    window.addEventListener('resize', determineLayout)
    window.addEventListener('orientationchange', determineLayout)
    return () => {
      window.removeEventListener('resize', determineLayout)
      window.removeEventListener('orientationchange', determineLayout)
    }
  }, [])


  // Monitor and fix stacking during flip animations using MutationObserver
  useEffect(() => {
    if (!flipBookRef.current) return
    
    let observer: MutationObserver | null = null
    let childObserver: MutationObserver | null = null
    let rafId: number | null = null
    
    // Wait a bit for flipbook to initialize
    const initTimeout = setTimeout(() => {
      const pageFlip = flipBookRef.current?.pageFlip?.()
      if (!pageFlip) return
      
      const bookEl = pageFlip.getBookElement?.() || document.querySelector('.st-page-flip')
      if (!bookEl) return
      
      // Use MutationObserver to watch for class changes on pages
      observer = new MutationObserver(() => {
        // Throttle updates using requestAnimationFrame
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
        }
        rafId = requestAnimationFrame(() => {
          updatePageStacking()
          rafId = null
        })
      })
      
      // Observe class changes on all pages
      const observePages = () => {
        const allPages = bookEl.querySelectorAll('.st-page') as NodeListOf<Element>
        allPages.forEach((page: Element) => {
          observer?.observe(page, {
            attributes: true,
            attributeFilter: ['class']
          })
        })
      }
      
      // Initial observation
      observePages()
      
      // Also observe the book element for new pages
      observer.observe(bookEl, {
        childList: true,
        subtree: true,
        attributes: false
      })
      
      // Re-observe when new pages are added
      childObserver = new MutationObserver(() => {
        observePages()
      })
      childObserver.observe(bookEl, {
        childList: true,
        subtree: true
      })
      
      // Initial update - schedule after mount to avoid render-time updates
      requestAnimationFrame(() => {
        updatePageStacking()
      })
    }, 600)
    
    return () => {
      clearTimeout(initTimeout)
      if (observer) observer.disconnect()
      if (childObserver) childObserver.disconnect()
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [updatePageStacking, pagesForFlipbook.length])

  // Initialize flipbook and sync page on mount
  useEffect(() => {
    if (flipBookRef.current && pagesForFlipbook.length > 0) {
      // Wait for flipbook to fully initialize
      const initTimeout = setTimeout(() => {
        try {
          const pageFlip = flipBookRef.current?.pageFlip?.()
          if (pageFlip) {
            // Sync the current page with the flipbook's internal state
            pageFlip.update()
            // Get the actual current page from the flipbook
            const actualPage = pageFlip.getCurrentPageIndex?.() ?? 0
            setCurrentPage(actualPage)
            setDisplayedPage(actualPage)
            // Initial stacking update - schedule after render
            requestAnimationFrame(() => {
              updatePageStacking()
            })
          }
        } catch (err) {
          console.error('Error initializing flipbook:', err)
        }
      }, 500)
      
      return () => clearTimeout(initTimeout)
    }
  }, [pagesForFlipbook.length, updatePageStacking])

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
          background: white;
          border-radius: 0;
          overflow: hidden;
          position: relative;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: preserve-3d;
          will-change: transform;
          cursor: pointer;
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
          object-fit: contain;
          display: block;
          background: white;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
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
        .st-page-flip { 
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          position: relative;
          isolation: isolate;
          transform-style: preserve-3d;
        }
        
        .st-page-flip .st-page { 
          background: white; 
          border-radius: 0; 
          overflow: hidden; 
          box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
          position: relative;
          isolation: isolate;
          transform-style: preserve-3d;
        }
        
        .st-page-flip .st-page .st-page-content { 
          width: 100%; 
          height: 100%; 
          padding: 0; 
          margin: 0; 
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          isolation: isolate;
        }
        
        /* Ensure proper stacking - flipping page must be on top */
        .st-page-flip .st-page {
          z-index: 1;
        }
        
        /* Flipping page gets the highest z-index */
        .st-page-flip .st-page--flipping {
          z-index: 10000 !important;
          position: relative;
        }
        
        /* Current page stays visible but below flipping */
        .st-page-flip .st-page--current {
          z-index: 100 !important;
        }
        
        /* Pages that are being revealed should be above static pages but below flipping */
        .st-page-flip .st-page--next {
          z-index: 200 !important;
        }
        
        /* All other pages stay at base level */
        .st-page-flip .st-page:not(.st-page--flipping):not(.st-page--current):not(.st-page--next) {
          z-index: 1 !important;
        }
        
        /* Ensure page faces are properly stacked during flip */
        .st-page-flip .st-page--flipping .st-page__half {
          z-index: 10001 !important;
        }
        
        /* Hide pages that should be completely behind the flipping page */
        .st-page-flip .st-page.st-page--prev {
          z-index: 0 !important;
        }
        
        /* Ensure the flipping page face elements are on top */
        .st-page-flip .st-page--flipping .st-page__half--front,
        .st-page-flip .st-page--flipping .st-page__half--back {
          z-index: 10001 !important;
          position: relative;
        }
        
        /* Force proper stacking context isolation */
        .st-page-flip .st-page--flipping {
          isolation: isolate;
          transform-style: preserve-3d;
        }
        
        /* Ensure flipping page receives pointer events during animation */
        .st-page-flip .st-page--flipping {
          pointer-events: auto;
        }
         
         
         
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
            maxShadowOpacity={0.6}
            showCover={true}
            mobileScrollSupport={true}
            className="flipbook"
            style={{ perspective: '2000px' }}
            startPage={0}
            drawShadow={true}
            flippingTime={1000}
            usePortrait={isSinglePage}
            startZIndex={10}
            autoSize={true}
            clickEventForward={true}
            disableFlipByClick={false}
            swipeDistance={50}
            showPageCorners={true}
            useMouseEvents={true}
            onFlip={(e: any) => {
              // Update page state when flip animation completes
              // react-pageflip passes the page index in e.data
              let newPage = currentPage
              
              if (typeof e.data === 'number') {
                newPage = e.data
              } else if (e.data && typeof e.data === 'object') {
                newPage = e.data.page ?? e.data.pageNumber ?? currentPage
              }
              
              // Ensure page is within bounds
              const validPage = Math.max(0, Math.min(newPage, totalPages - 1))
              
              // Update state
              setCurrentPage(validPage)
              setDisplayedPage(validPage)
              
              // Ensure proper z-index stacking after flip completes
              requestAnimationFrame(() => {
                updatePageStacking()
              })
            }}
            onChangeOrientation={(e: any) => {
              // Force a re-render to let the library recompute right/left pages
              setTimeout(() => {
                try { 
                  const pageFlip = flipBookRef.current?.pageFlip?.()
                  if (pageFlip) {
                    pageFlip.update()
                    // Sync current page after orientation change
                    const currentPageIndex = pageFlip.getCurrentPageIndex?.() ?? currentPage
                    setCurrentPage(currentPageIndex)
                    setDisplayedPage(currentPageIndex)
                  }
                } catch (err) {
                  console.error('Error updating after orientation change:', err)
                }
              }, 100)
            }}
            onChangeState={(e: any) => {
              // After state changes, force an update to sync the under-page
              setTimeout(() => {
                try { 
                  const pageFlip = flipBookRef.current?.pageFlip?.()
                  if (pageFlip) {
                    pageFlip.update()
                    requestAnimationFrame(() => {
                      updatePageStacking()
                    })
                  }
                } catch (err) {
                  console.error('Error updating after state change:', err)
                }
              }, 50)
            }}
           >
          {pagesForFlipbook.length > 0 ? (
            pagesForFlipbook.map((page, idx, arr) => (
              <div key={page.id} className={`flipbook-page ${idx === 0 ? 'hard' : ''} ${idx === arr.length - 1 ? 'hard' : ''} ${page.id === '__blank__' ? 'blank' : ''}`}>
                {page.id === '__blank__' ? (
                  <div className="page-image bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Blank Page</span>
                  </div>
                ) : (
                  <img 
                    src={page.image_url} 
                    alt={page.page_title || `Page ${page.page_number}`}
                    className="page-image"
                    loading="lazy"
                    onError={(e) => {
                      console.error(`Failed to load image for page ${page.page_number}:`, page.image_url)
                      // Use a placeholder instead of trying to load logo.png which might also fail
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2E0YWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBOb3QgQXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='
                      e.currentTarget.alt = `Failed to load: ${page.page_title || `Page ${page.page_number}`}`
                    }}
                  />
                )}
              </div>
            ))
          ) : (
            <div className="flipbook-page hard">
              <div className="page-image bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <div className="text-center p-8">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No pages available</p>
                  <p className="text-gray-400 text-sm mt-2">This magazine has no pages yet.</p>
                </div>
              </div>
            </div>
          )}
          </HTMLFlipBook>
        </div>

        {/* Navigation Buttons */}
        <button
          onClick={prevPage}
          disabled={currentPage <= 0}
          className="navigation-button prev"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        
        <button
          onClick={nextPage}
          disabled={currentPage >= totalPages - 1}
          className="navigation-button next"
          aria-label="Next page"
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

      {/* Success Dialog */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="text-left">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 shadow-lg">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <AlertDialogTitle className="text-xl font-semibold leading-tight">
                  Link copied!
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
                  Magazine link has been copied to your clipboard. You can now share it with others.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-end gap-2 pt-4">
            <AlertDialogAction 
              onClick={() => setSuccessDialogOpen(false)}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-sm"
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="text-left">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 shadow-lg">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <AlertDialogTitle className="text-xl font-semibold leading-tight">
                  Share failed
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
                  {errorMessage || 'An unexpected error occurred. Please try again.'}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-end gap-2 pt-4">
            <AlertDialogAction 
              onClick={() => setErrorDialogOpen(false)}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white shadow-sm"
            >
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}