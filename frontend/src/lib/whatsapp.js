/**
 * WhatsApp Integration Service & Message Formatter
 * ================================================
 * Generates formatted WhatsApp invoices, delivery tracking links,
 * and direct WhatsApp customer/seller communications.
 */

/**
 * Sanitizes phone numbers for WhatsApp API compatibility.
 */
export function cleanPhoneNumber(phone) {
  if (!phone) return ''
  let cleaned = String(phone).replace(/\D/g, '')
  // Default to India country code 91 if 10-digit number without country code
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned
  }
  return cleaned
}

/**
 * Builds an itemized WhatsApp Invoice / Billing receipt message.
 */
export function buildWhatsAppInvoice(order, seller = {}) {
  const orderId = order.id ? `#${order.id.slice(-8).toUpperCase()}` : '#ORD-HYPERKART'
  const shopName = seller.shopName || order.shopName || 'Local Store'
  const dateStr = order.createdAt 
    ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('en-IN')

  let itemsList = ''
  if (order.items && order.items.length > 0) {
    itemsList = order.items.map((item) => {
      const name = item.productName || item.name || 'Item'
      const qty = item.quantity || 1
      const price = item.unitPrice || item.price || 0
      return `• *${name}* x ${qty} — ₹${(price * qty).toFixed(2)}`
    }).join('\n')
  } else {
    itemsList = '• Order Items Summary'
  }

  const deliveryFee = order.deliveryFee ? `₹${Number(order.deliveryFee).toFixed(2)}` : 'FREE'
  const totalAmount = `₹${Number(order.totalAmount || 0).toFixed(2)}`
  const paymentInfo = `${order.paymentStatus || 'PAID'} via ${order.paymentMethod || 'Online UPI'}`
  const address = order.deliveryAddress || 'Customer Address'
  const trackingUrl = `${window.location.origin}/#/orders`

  return `🧾 *HYPERKART COMMERCE INVOICE*
----------------------------------------
*Order:* ${orderId}
*Store:* ${shopName}
*Date:* ${dateStr}

*ITEMIZED RECEIPT:*
${itemsList}

----------------------------------------
*Delivery Fee:* ${deliveryFee}
*Total Paid:* *${totalAmount}*
*Payment Status:* ${paymentInfo}
*Delivery Location:* ${address}

📍 *Live Order Tracking on WhatsApp:*
${trackingUrl}

Thank you for shopping local with ${shopName}! 🛍️`
}

/**
 * Builds a WhatsApp Delivery Tracking Update message.
 */
export function buildWhatsAppTracking(order, driver = {}) {
  const orderId = order.id ? `#${order.id.slice(-8).toUpperCase()}` : '#ORD-HYPERKART'
  const status = (order.status || 'OUT_FOR_DELIVERY').replace(/_/g, ' ')
  const driverName = driver.name || order.driverName || 'Express Rider'
  const trackingUrl = `${window.location.origin}/#/orders`

  return `🚚 *HYPERKART LIVE DELIVERY UPDATE*
----------------------------------------
*Order:* ${orderId}
*Status:* *${status}* 🚴
*Delivery Partner:* ${driverName}
*Target ETA:* ${order.estimatedDeliveryMinutes || 20} Mins

📍 *Track Your Live Delivery on WhatsApp:*
${trackingUrl}

Your driver is on the way with your fresh order!`
}

/**
 * Generates direct WhatsApp web/app link.
 */
export function getWhatsAppUrl(phone, messageText) {
  const cleanPhone = cleanPhoneNumber(phone)
  const encodedText = encodeURIComponent(messageText)
  if (cleanPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`
}

/**
 * Opens WhatsApp sharing in a new browser tab/window.
 */
export function openWhatsAppShare(phone, messageText) {
  const url = getWhatsAppUrl(phone, messageText)
  window.open(url, '_blank', 'noopener,noreferrer')
}
