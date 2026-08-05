/**
 * Real-Time WebSocket Client Client using STOMP and SockJS
 * =======================================================
 * Manages client connection, subscription, and custom callbacks
 * for real-time stock updates, order notifications, and cart syncing.
 */

import { Client } from '@stomp/stompjs'
import SockJS from './sockjs-shim'

let stompClient = null
let connectionPromise = null
const messageListeners = new Set()
const connectionListeners = new Set()

/**
 * Retrieves the authentication token from local storage.
 * Used for secure STOMP websocket establishment.
 */
function getToken() {
  return localStorage.getItem('token')
}

/**
 * Returns the websocket endpoint dynamically based on browser hostname.
 * Vite configuration proxies '/ws' to backend in dev mode.
 * In production, uses the current hostname so mobile devices can connect.
 */
function getSocketUrl() {
  if (window.location.port === '5173') return '/ws'
  const host = window.location.hostname
  return `http://${host}:8090/ws`
}

/**
 * Initializes and activates the STOMP/SockJS client connection.
 * Caches connection instance to prevent duplicate connections.
 */
export function initSocket({ url, onConnect } = {}) {
  if (stompClient && stompClient.connected) {
    onConnect?.()
    return stompClient
  }

  if (!connectionPromise) {
    connectionPromise = new Promise((resolve, reject) => {
      const token = getToken()
      const wsUrl = url || getSocketUrl()
      
      stompClient = new Client({
        // Fallback transports array for environments blocking native WebSockets
        webSocketFactory: () => new SockJS(wsUrl, null, { transports: ['websocket', 'xhr-streaming', 'xhr-polling'] }),
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        debug: (str) => console.log('[STOMP]', str),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: (frame) => {
          console.log('[STOMP] Connected:', frame)
          connectionListeners.forEach(cb => cb(true))
          
          // Automatically subscribe to updates channel
          stompClient.subscribe('/topic/updates', (message) => {
            try {
              const payload = JSON.parse(message.body)
              messageListeners.forEach((cb) => cb(payload))
            } catch (e) {
              messageListeners.forEach((cb) => cb(message.body))
            }
          })
          
          onConnect?.()
          resolve(stompClient)
        },
        onDisconnect: (frame) => {
          console.log('[STOMP] Disconnected:', frame)
          connectionListeners.forEach(cb => cb(false))
        },
        onStompError: (frame) => {
          console.error('[STOMP] Error:', frame.headers['message'], frame.body)
        },
      })
      
      stompClient.activate()
    })
  }

  connectionPromise.then(() => {
    if (stompClient?.connected) onConnect?.()
  }).catch(err => {
    console.error('[STOMP] Connection failed:', err)
    connectionListeners.forEach(cb => cb(false))
  })

  return stompClient
}

/**
 * Registers callback hooks for incoming raw websocket messages.
 */
export function addMessageListener(listener) {
  messageListeners.add(listener)
  return () => messageListeners.delete(listener)
}

/**
 * Registers callback hooks for network connectivity changes.
 * Invokes immediately with current state.
 */
export function addConnectionListener(listener) {
  connectionListeners.add(listener)
  if (stompClient) {
    listener(stompClient.connected)
  }
  return () => connectionListeners.delete(listener)
}

/**
 * Subscribes to a given destination topic.
 * Automatically queues subscription if socket is not yet connected.
 */
export function subscribe(destination, callback) {
  if (!stompClient?.connected) {
    console.warn('[STOMP] Not connected, queueing subscription')
    const offConn = addConnectionListener((connected) => {
      if (connected) {
        offConn()
        subscribe(destination, callback)
      }
    })
    return offConn
  }
  
  const sub = stompClient.subscribe(destination, (message) => {
    try {
      const payload = JSON.parse(message.body)
      callback(payload)
    } catch (e) {
      callback(message.body)
    }
  })
  
  return () => sub.unsubscribe()
}

/**
 * Publishes a JSON payload to a given destination.
 */
export function publish(destination, body) {
  if (!stompClient?.connected) {
    console.warn('[STOMP] Not connected, cannot publish')
    return false
  }
  stompClient.publish({ destination, body: JSON.stringify(body) })
  return true
}

/**
 * Deactivates and cleanly tears down the active socket connection.
 */
export function disconnect() {
  if (stompClient) {
    stompClient.deactivate()
    stompClient = null
    connectionPromise = null
    connectionListeners.forEach(cb => cb(false))
  }
}

/**
 * Synchronously checks if socket is online and connected.
 */
export function isConnected() {
  return stompClient?.connected ?? false
}

/**
 * Helper to subscribe to cart synchronization updates.
 */
export function subscribeToCartUpdates(callback) {
  return subscribe('/user/queue/cart', callback)
}

/**
 * Helper to publish cart actions.
 */
export function publishCartAction(action, payload) {
  return publish('/app/cart', { action, payload })
}