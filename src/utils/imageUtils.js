export function compressImage(dataUrl, maxPx = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (e) {
        resolve(dataUrl) // fall back to original if compression fails
      }
    }
    img.onerror = () => resolve(dataUrl) // fall back to original on load error
    img.src = dataUrl
  })
}
