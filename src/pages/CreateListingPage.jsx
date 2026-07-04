import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AvailabilityCalendar from '../components/AvailabilityCalendar'
import ImageViewer from '../components/ImageViewer'
import { supabase } from '../lib/supabase'

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const imageExtensionByType = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
const maxImageBytes = 5 * 1024 * 1024
const maxImageCount = 6

const initialState = {
  title: '',
  description: '',
  category: 'Tools & Hardware',
  mode: 'Borrow + Buy',
  price: '',
  borrowPrice: '',
  deposit: '',
  durationDays: '5',
  ownerName: '',
  imageUrls: [],
  location: '',
  availability: [],
}

export default function CreateListingPage() {
  const [form, setForm] = useState(initialState)
  const [status, setStatus] = useState('')
  const [photoNames, setPhotoNames] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [showPreview, setShowPreview] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const previewUrlsRef = useRef([])
  const navigate = useNavigate()

  useEffect(() => {
    let ignore = false
    const previewUrls = previewUrlsRef.current

    const loadOwner = async () => {
      const { data } = await supabase.auth.getSession()
      const user = data?.session?.user
      if (!ignore && user) {
        const ownerName = user.user_metadata?.username || user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Local listing owner'
        setForm((current) => ({ ...current, ownerName }))
      }
    }

    loadOwner()

    return () => {
      ignore = true
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const calculateDeposit = (priceValue) => {
    const numericPrice = Number(priceValue) || 0
    return numericPrice > 0 ? Math.round(numericPrice * 0.2) : 0
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => {
      const nextForm = { ...current, [name]: value }

      if (name === 'price') {
        nextForm.deposit = String(calculateDeposit(value))
      }

      return nextForm
    })
  }

  const handleImageChange = (event) => {
    const incomingFiles = Array.from(event.target.files || [])
    const remainingSlots = Math.max(0, maxImageCount - selectedFiles.length)
    const files = incomingFiles
      .filter((file) => allowedImageTypes.has(file.type) && file.size <= maxImageBytes)
      .slice(0, remainingSlots)

    if (files.length !== incomingFiles.length) {
      setStatus(`Choose up to ${maxImageCount} JPG, PNG, WebP, or GIF images, no larger than 5 MB each.`)
    } else {
      setStatus('')
    }

    if (!files.length) return

    const objectUrls = files.map((file) => URL.createObjectURL(file))
    previewUrlsRef.current.push(...objectUrls)
    setForm((current) => ({ ...current, imageUrls: [...current.imageUrls, ...objectUrls] }))
    setSelectedFiles((current) => [...current, ...files])
    setPhotoNames((current) => [...current, ...files.map((file) => file.name)])
    event.target.value = ''
  }

  const uploadImages = async (files, userId) => {
    if (!files.length) return { urls: [], paths: [] }

    const uploadedUrls = []
    const uploadedPaths = []

    try {
      for (const file of files) {
        const extension = imageExtensionByType[file.type]
        const fileName = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`
        const { error } = await supabase.storage.from('listings').upload(fileName, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        })

        if (error) throw new Error(`Upload error: ${error.message}`)
        uploadedPaths.push(fileName)

        const { data: publicData } = supabase.storage.from('listings').getPublicUrl(fileName)
        if (!publicData?.publicUrl) throw new Error('Could not generate public URL for uploaded image.')

        uploadedUrls.push(publicData.publicUrl)
      }
    } catch (error) {
      if (uploadedPaths.length) await supabase.storage.from('listings').remove(uploadedPaths)
      throw error
    }

    return { urls: uploadedUrls, paths: uploadedPaths }
  }

  const handleSubmit = async (event) => {
    event?.preventDefault?.()

    setUploadingImages(true)
    setStatus('Uploading images…')

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const activeSession = sessionData.session
      if (!activeSession?.user) throw new Error('Your session expired. Sign in again before publishing a listing.')

      const { urls: uploadedImageUrls, paths: uploadedImagePaths } = await uploadImages(selectedFiles, activeSession.user.id)

      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        mode: form.mode,
        price: Number(form.price) || 0,
        borrow_price: Number(form.borrowPrice) || 0,
        deposit_amount: Number(form.deposit) || 0,
        duration_days: Number(form.durationDays) || 1,
        owner_id: activeSession.user.id,
        owner_name: form.ownerName || 'Local listing owner',
        image_url: uploadedImageUrls[0] || null,
        image_urls: uploadedImageUrls,
        location: form.location || 'Local pickup',
        availability: form.availability,
      }

      const { data, error } = await supabase.from('listings').insert([payload]).select()

      if (error) {
        if (uploadedImagePaths.length) await supabase.storage.from('listings').remove(uploadedImagePaths)
        setStatus(error.message || 'The form is ready, but your Supabase listings table needs to be created first.')
        return
      }

      if (data?.[0]?.id) {
        setStatus('Listing published successfully.')
        navigate(`/listings/${data[0].id}`)
      }
    } catch (error) {
      setStatus(error?.message || 'Image upload failed. Make sure the Supabase storage bucket exists and is public.')
    } finally {
      setUploadingImages(false)
    }
  }

  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Create listing</p>
          <h2>Publish a new borrow or buy opportunity.</h2>
        </div>
        <Link className="text-link" to="/">Back home</Link>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            <span>Title</span>
            <input name="title" value={form.title} onChange={handleChange} minLength="3" maxLength="120" required />
          </label>

          <label>
            <span>Category</span>
            <select name="category" value={form.category} onChange={handleChange}>
              <option>Tools & Hardware</option>
              <option>Electronics</option>
              <option>Vehicles</option>
              <option>Home & Garden</option>
              <option>Fashion & Style</option>
              <option>Sporting Goods</option>
            </select>
          </label>

          <label>
            <span>Listing mode</span>
            <select name="mode" value={form.mode} onChange={handleChange}>
              <option>Borrow only</option>
              <option>Borrow + Buy</option>
              <option>Buy only</option>
            </select>
          </label>

          <label>
            <span>Owner name</span>
            <input name="ownerName" value={form.ownerName} onChange={handleChange} maxLength="120" />
          </label>

          <label>
            <span>Buy price</span>
            <input name="price" type="number" min="0" max="1000000" step="0.01" value={form.price} onChange={handleChange} />
          </label>

          <label>
            <span>Borrow price per day</span>
            <input name="borrowPrice" type="number" min="0" max="1000000" step="0.01" value={form.borrowPrice} onChange={handleChange} />
          </label>

          <label>
            <span>Deposit amount</span>
            <input name="deposit" type="number" min="0" max="1000000" value={form.deposit} readOnly />
            <small className="helper-text">Auto-calculated as 20% of the buy price.</small>
          </label>

          <label>
            <span>Max rental days</span>
            <input name="durationDays" type="number" min="1" max="365" value={form.durationDays} onChange={handleChange} />
          </label>

          <label>
            <span>Photos</span>
            <div className="file-upload">
              <label className="primary-btn file-upload-label">
                <span>Choose files</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleImageChange} />
              </label>
              <span className="file-upload-hint">{photoNames.length ? `${photoNames.length} of ${maxImageCount} file(s) selected` : 'Up to 6 images, 5 MB each'}</span>
            </div>
          </label>

          <label>
            <span>Location</span>
            <input name="location" value={form.location} onChange={handleChange} maxLength="160" placeholder="City or ZIP" />
          </label>
        </div>

        <label>
          <span>Description</span>
          <textarea name="description" value={form.description} onChange={handleChange} rows="5" minLength="10" maxLength="5000" required />
        </label>

        {form.imageUrls.length ? (
          <div className="preview-card">
            <ImageViewer images={form.imageUrls} altPrefix="Selected image" compact />
            <div>
              <h3>Selected gallery</h3>
              <p>Your uploaded images will appear in a swipeable image viewer once the listing is posted.</p>
            </div>
          </div>
        ) : null}

        <AvailabilityCalendar selectedDates={form.availability} onChange={(nextDates) => setForm((current) => ({ ...current, availability: nextDates }))} />

        <div className="form-actions">
          <button className="primary-btn" type="submit" disabled={uploadingImages}>
            {uploadingImages ? 'Uploading…' : 'Publish listing'}
          </button>
          <button className="ghost-btn" type="button" onClick={() => setShowPreview(true)}>Preview listing</button>
        </div>
        {status ? <p className="status-pill">{status}</p> : null}
      </form>

      {showPreview ? (
        <div className="preview-modal" role="dialog" aria-modal="true">
          <div className="preview-modal-card">
            <div className="preview-modal-header">
              <h3>{form.title || 'Your listing preview'}</h3>
              <button className="ghost-btn small" type="button" onClick={() => setShowPreview(false)}>Edit</button>
            </div>

            {form.imageUrls.length ? <ImageViewer images={form.imageUrls} altPrefix="Preview image" /> : null}

            <div className="listing-meta preview-meta">
              <span>Category: {form.category}</span>
              <span>Mode: {form.mode}</span>
              <span>Price: {form.price ? `$${form.price}` : 'Price on request'}</span>
              <span>Deposit: {form.deposit ? `$${form.deposit}` : 'Auto-calculated deposit'}</span>
              <span>Location: {form.location || 'Local pickup'}</span>
            </div>

            <p className="hero-text">{form.description || 'Your description will appear here.'}</p>

            <div className="form-actions">
              <button className="ghost-btn" type="button" onClick={() => setShowPreview(false)}>Edit details</button>
              <button className="primary-btn" type="button" onClick={handleSubmit} disabled={uploadingImages}>
                {uploadingImages ? 'Uploading…' : 'Publish now'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
