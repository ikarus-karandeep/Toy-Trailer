import { jsPDF } from 'jspdf'

/**
 * Generates and downloads a clean, professional PDF quote for Ikarus Trailers.
 * @param {Object} quote - Quote object containing customer, trailerSummary, quoteData, shareUrl, id, date, grandTotal
 */
export function generateQuotePDF(quote) {
  if (!quote) return

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = 210
  const pageHeight = 297
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = 16

  // Helper to check page break
  const checkPageBreak = (neededHeight = 12) => {
    if (y + neededHeight > pageHeight - 18) {
      doc.addPage()
      y = 18
      return true
    }
    return false
  }

  // Helper for text formatting
  const primaryColor = [218, 99, 75]    // #DA634B
  const darkColor = [28, 28, 28]        // #1C1C1C
  const grayColor = [100, 100, 100]
  const lightGray = [245, 245, 245]

  // 1. Top Banner / Header
  doc.setFillColor(...darkColor)
  doc.rect(margin, y, contentWidth, 24, 'F')

  // Accent bar on left of header
  doc.setFillColor(...primaryColor)
  doc.rect(margin, y, 4, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('CUSTOM TOY TRAILERS', margin + 8, y + 10)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(200, 200, 200)
  doc.text('CUSTOM BUILD SPECIFICATIONS & ITEMIZED QUOTE', margin + 8, y + 16)

  // Quote Ref on Right of Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...primaryColor)
  doc.text(quote.id || 'QUOTE', pageWidth - margin - 8, y + 10, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(180, 180, 180)
  doc.text(`Date: ${quote.date || new Date().toLocaleDateString()}`, pageWidth - margin - 8, y + 16, { align: 'right' })

  y += 28

  // 2. Info Cards (Customer & Trailer Summary)
  const cardWidth = (contentWidth - 6) / 2
  const cardHeight = 32

  // Customer Box
  doc.setFillColor(...lightGray)
  doc.rect(margin, y, cardWidth, cardHeight, 'F')
  doc.setDrawColor(220, 220, 220)
  doc.rect(margin, y, cardWidth, cardHeight, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...primaryColor)
  doc.text('CUSTOMER INFORMATION', margin + 4, y + 6)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...darkColor)
  doc.text(quote.customer?.name || 'Valued Customer', margin + 4, y + 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...grayColor)
  if (quote.customer?.email) {
    doc.text(`Email: ${quote.customer.email}`, margin + 4, y + 17)
  }
  if (quote.customer?.phone) {
    doc.text(`Phone: ${quote.customer.phone}`, margin + 4, y + 22)
  }
  if (quote.customer?.notes) {
    const trimmedNotes = quote.customer.notes.length > 40 ? quote.customer.notes.slice(0, 38) + '...' : quote.customer.notes
    doc.text(`Notes: ${trimmedNotes}`, margin + 4, y + 27)
  }

  // Trailer Summary Box
  const rightCardX = margin + cardWidth + 6
  doc.setFillColor(...lightGray)
  doc.rect(rightCardX, y, cardWidth, cardHeight, 'F')
  doc.setDrawColor(220, 220, 220)
  doc.rect(rightCardX, y, cardWidth, cardHeight, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...primaryColor)
  doc.text('TRAILER CONFIGURATION', rightCardX + 4, y + 6)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...darkColor)
  const trailerTitle = `${quote.trailerSummary?.width || ''} × ${quote.trailerSummary?.length || ''}' ${quote.trailerSummary?.packageId ? `· ${quote.trailerSummary.packageId.toUpperCase()}` : ''}`
  doc.text(trailerTitle, rightCardX + 4, y + 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...grayColor)
  doc.text(`Exterior Color: ${quote.trailerSummary?.color ? quote.trailerSummary.color.toUpperCase() : 'Standard'}`, rightCardX + 4, y + 17)
  doc.text('Status: Active Quote (Valid for 30 Days)', rightCardX + 4, y + 22)
  doc.text('Direct Support: 1-800-555-0199', rightCardX + 4, y + 27)

  y += cardHeight + 8

  // 3. Itemized Breakdown Table
  const categories = quote.quoteData?.categories || []

  categories.forEach((cat) => {
    if (!cat.items || cat.items.length === 0) return

    checkPageBreak(18 + cat.items.length * 6)

    // Category Header
    doc.setFillColor(235, 237, 240)
    doc.rect(margin, y, contentWidth, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...darkColor)
    doc.text(cat.title.toUpperCase(), margin + 3, y + 5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...primaryColor)
    doc.text(`Subtotal: $${(cat.subtotal || 0).toLocaleString()}`, pageWidth - margin - 3, y + 5, { align: 'right' })

    y += 9

    // Line items
    cat.items.forEach((item, index) => {
      checkPageBreak(7)

      // Zebra striping
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, y - 1, contentWidth, 5.5, 'F')
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(50, 50, 50)

      let labelText = item.label || ''
      if (item.qty > 1 && item.unitPrice) {
        labelText += ` (${item.qty} × $${item.unitPrice.toLocaleString()})`
      }
      doc.text(labelText, margin + 4, y + 3)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(30, 30, 30)
      const priceText = item.price != null ? `$${item.price.toLocaleString()}` : 'Included'
      doc.text(priceText, pageWidth - margin - 4, y + 3, { align: 'right' })

      y += 6
    })

    y += 3
  })

  // 4. Totals Summary Box
  checkPageBreak(30)
  y += 2

  doc.setFillColor(...darkColor)
  doc.rect(margin, y, contentWidth, 18, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL ESTIMATED PRICE', margin + 6, y + 11)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...primaryColor)
  const totalVal = quote.totalPrice || quote.quoteData?.grandTotal || 0
  doc.text(`$${totalVal.toLocaleString()}`, pageWidth - margin - 6, y + 12, { align: 'right' })

  y += 24

  // 5. Interactive Configuration Link Notice
  checkPageBreak(25)
  doc.setFillColor(245, 247, 250)
  doc.setDrawColor(218, 99, 75)
  doc.rect(margin, y, contentWidth, 20, 'F')
  doc.rect(margin, y, contentWidth, 20, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...primaryColor)
  doc.text('3D INTERACTIVE BUILD LINK & CUSTOMIZATION', margin + 4, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(70, 70, 70)
  doc.text('To reopen, customize, or review this exact trailer build in the interactive 3D configurator, use this link:', margin + 4, y + 11)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(20, 80, 160)
  const shareLink = quote.shareUrl || quote.configuratorUrl || ''
  const displayLink = shareLink.length > 95 ? shareLink.slice(0, 92) + '...' : shareLink
  doc.textWithLink(displayLink, margin + 4, y + 16, { url: shareLink })

  y += 25

  // 6. Footer on all pages
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(140, 140, 140)
    doc.text(
      'Toy Trailers · Built For Performance & Durability · Toll Free: 1-800-555-0199',
      margin,
      pageHeight - 8
    )
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    )
  }

  // Trigger browser download
  const filename = `Quote-${quote.id || 'Trailer'}.pdf`
  doc.save(filename)
}
