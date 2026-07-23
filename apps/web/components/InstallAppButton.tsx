'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export function InstallAppButton() {
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallEvent(e);
    }
    function handleInstalled() {
      setInstalled(true);
      setInstallEvent(null);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  // Nothing to show once installed, or if the browser hasn't offered the
  // prompt yet (iOS Safari never fires beforeinstallprompt at all — there,
  // installing is manual via the Share sheet's "Add to Home Screen", which
  // this button can't trigger programmatically).
  if (installed || !installEvent) return null;

  async function handleClick() {
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 text-sm text-clinical-dark hover:text-clinical font-medium transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      Install app
    </button>
  );
}
