/* ===================== GhostWare Desktop — preload bridge =====================
   Exposes a safe, typed API to the renderer via contextBridge (contextIsolation on).
   All ipcRenderer calls are whitelisted here — the renderer never touches Node directly.

   Channels:
     Window controls   gw:minimize / gw:maximize / gw:close / gw:maximized
     Network           gw:getJSON
     System info       gw:getSystemInfo
     Window sizing     gw:getWindowSize / gw:setWindowSize
     Startup           gw:isAutoStartEnabled / gw:enableAutoStart
     Connections       gw:getConnections / gw:addConnection / gw:removeConnection
     Push events       connection-update / system-info / show-connections / gw:maximized
   ============================================================================= */
const { contextBridge, ipcRenderer } = require('electron');

/* ---- helpers ---- */
// One-way listener helper: returns a cleanup function so callers can unsubscribe.
function on(channel, cb) {
  const handler = (_event, ...args) => cb(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

/* ---- window controls ---- */
contextBridge.exposeInMainWorld('gwWindow', {
  minimize:    () => ipcRenderer.send('gw:minimize'),
  maximize:    () => ipcRenderer.send('gw:maximize'),
  close:       () => ipcRenderer.send('gw:close'),
  onMaximized: (cb) => on('gw:maximized', cb),
});

/* ---- network (main-process fetch, no CORS, real IP) ---- */
contextBridge.exposeInMainWorld('gwNet', {
  getJSON:              (url)    => ipcRenderer.invoke('gw:getJSON', url),
  discordUser:          (userId) => ipcRenderer.invoke('gw:discordUser', userId),
  saveDiscordBotToken:  (token)  => ipcRenderer.invoke('gw:saveDiscordBotToken', token),
});

/* ---- unified electronAPI surface used by connections.js, sizecontrol.js etc. ---- */
contextBridge.exposeInMainWorld('electronAPI', {

  // ---- system info ----
  getSystemInfo: () => ipcRenderer.invoke('gw:getSystemInfo'),

  // ---- window sizing ----
  getWindowSize: ()             => ipcRenderer.invoke('gw:getWindowSize'),
  setWindowSize: (width, height) => ipcRenderer.invoke('gw:setWindowSize', width, height),

  // ---- startup management ----
  isAutoStartEnabled: () => ipcRenderer.invoke('gw:isAutoStartEnabled'),
  enableAutoStart:    () => ipcRenderer.invoke('gw:enableAutoStart'),

  // ---- connection tracking ----
  getConnections:   ()     => ipcRenderer.invoke('gw:getConnections'),
  addConnection:    (data) => ipcRenderer.invoke('gw:addConnection', data),
  removeConnection: (id)   => ipcRenderer.invoke('gw:removeConnection', id),
  setUserKey:       (email)=> ipcRenderer.invoke('gw:setUserKey', email),

  // ---- token tracking ----
  getTokens:    ()   => ipcRenderer.invoke('gw:getTokens'),
  removeToken:  (id) => ipcRenderer.invoke('gw:removeToken', id),

  // ---- Discord info (stub — main process queries local RPC socket if present) ----
  getDiscordInfo: () => ipcRenderer.invoke('gw:getDiscordInfo'),

  // ---- file builder ----
  buildExe: (opts) => ipcRenderer.invoke('gw:buildExe', opts),
  buildJar: (opts) => ipcRenderer.invoke('gw:buildJar', opts),

  // ---- relay topic ----
  getRelayTopic: () => ipcRenderer.invoke('gw:getRelayTopic'),

  // ---- push event subscriptions (renderer registers handlers once) ----
  // Each returns an unsubscribe function.
  onConnectionUpdate: (cb) => on('connection-update', cb),
  onTokenUpdate:      (cb) => on('token-update',      cb),
  onSystemInfo:       (cb) => on('system-info',       cb),
  onShowConnections:  (cb) => on('show-connections',  cb),
  onWindowResize:     (cb) => on('window-resize',     cb),
});
