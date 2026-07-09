/**
 * preload.js — Aura Secure Preload Bridge
 *
 * This script runs in a privileged Node.js context but exposes only a narrow,
 * explicitly-defined API to the renderer via contextBridge. The renderer has
 * NO access to Node.js, require(), or any Electron internals beyond what is
 * listed here. This satisfies Electron security best practices and the
 * Microsoft Store App Certification requirements.
 *
 * Security model:
 *   - contextIsolation: true  (default Electron 12+)
 *   - nodeIntegration: false  (enforced on all windows)
 *   - sandbox: true           (enforced on all windows)
 */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('auraApi', {
    /**
     * Register a callback that fires when the main process sends a status update.
     * @param {(message: string) => void} callback
     */
    onStatusUpdate: (callback) => {
        ipcRenderer.on('status-update', (_event, message) => callback(message));
    },

    /**
     * Register a callback that fires when the main process encounters a fatal error.
     * @param {(errorText: string) => void} callback
     */
    onStatusError: (callback) => {
        ipcRenderer.on('status-error', (_event, errorText) => callback(errorText));
    },

    /**
     * Register a callback that fires when model download progress is reported.
     * @param {(data: { model: string, percent: number, status: string }) => void} callback
     */
    onPullProgress: (callback) => {
        ipcRenderer.on('pull-progress', (_event, data) => callback(data));
    },

    /**
     * Tell the main process to exit the application cleanly.
     */
    exitApp: () => {
        ipcRenderer.send('exit-app');
    },
});
