import { useEffect, useRef, useState } from 'react'

export default function ImageViewer({ images = [], altPrefix = 'Listing image', compact = false }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const touchStartX = useRef(null)

  const safeImages = Array.isArray(images) ? images.filter(Boolean) : []

  useEffect(() => {
    setActiveIndex(0)
  }, [safeImages.length])

  if (!safeImages.length) {
    return null
  }

  const goToPrevious = () => {
    setActiveIndex((current) => (current === 0 ? safeImages.length - 1 : current - 1))
  }

  const goToNext = () => {
    setActiveIndex((current) => (current === safeImages.length - 1 ? 0 : current + 1))
  }

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX
  }

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return

    const delta = touchStartX.current - event.changedTouches[0].clientX

    if (delta > 50) {
      goToNext()
    } else if (delta < -50) {
      goToPrevious()
    }

    touchStartX.current = null
  }

  return (
    <div className={`image-viewer ${compact ? 'compact' : ''}`}>
      <div className="image-viewer-main" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <img src={safeImages[activeIndex]} alt={`${altPrefix} ${activeIndex + 1}`} />

        {safeImages.length > 1 ? (
          <div className="image-viewer-nav">
            <button type="button" className="ghost-btn small" onClick={goToPrevious}>
              ←
            </button>
            <span>
              {activeIndex + 1}/{safeImages.length}
            </span>
            <button type="button" className="ghost-btn small" onClick={goToNext}>
              →
            </button>
          </div>
        ) : null}
      </div>

      {safeImages.length > 1 ? (
        <div className="image-viewer-thumbs">
          {safeImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              className={`image-viewer-thumb ${index === activeIndex ? 'active' : ''}`}
              onClick={() => setActiveIndex(index)}
            >
              <img src={image} alt={`${altPrefix} ${index + 1}`} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
