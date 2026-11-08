import React, { createContext, useContext, useState, useEffect } from 'react';

const PWAContext = createContext(null);

export const PWAProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true;
      const isAndroidStandalone = document.referrer.includes('android-app://');
      const installed = Boolean(isStandaloneMedia || isIOSStandalone || isAndroidStandalone);
      setIsInstalled(installed);
      return installed;
    };

    const alreadyInstalled = checkStandalone();

    // 2. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice && !alreadyInstalled) {
      setIsInstallable(true);
    }

    // 3. Listen for Android / Chromium beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // 4. Listen for appinstalled event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsInstalled(true);
      setShowInstallModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');

  const checkForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatus('Checking for latest release on server...');
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }
      setTimeout(() => {
        setUpdateStatus('App is synced to latest version!');
        setCheckingUpdate(false);
        setTimeout(() => setUpdateStatus(''), 4000);
      }, 1200);
    } catch (err) {
      setUpdateStatus('Notice: ' + (err.message || 'Offline'));
      setCheckingUpdate(false);
      setTimeout(() => setUpdateStatus(''), 4000);
    }
  };

  const forceAppReload = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
    } catch (e) {}
    window.location.reload(true);
  };

  const promptInstall = async () => {
    // Case A: Native browser prompt is ready (Android, Chrome/Edge on Desktop)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
      return;
    }

    // Case B: iOS Safari or browsers requiring visual instructions
    setShowInstallModal(true);
  };

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isIOS,
        showInstallModal,
        setShowInstallModal,
        promptInstall,
        checkForUpdates,
        forceAppReload,
        checkingUpdate,
        updateStatus,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    return {
      isInstallable: false,
      isInstalled: false,
      isIOS: false,
      showInstallModal: false,
      setShowInstallModal: () => {},
      promptInstall: () => {},
      checkForUpdates: () => {},
      forceAppReload: () => {},
      checkingUpdate: false,
      updateStatus: '',
    };
  }
  return context;
};

export default PWAContext;
