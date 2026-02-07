'use client';

import { useEffect, useState } from 'react';

/**
 * Generate a browser fingerprint for anonymous identity
 */
export function useFingerprint(): string | null {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    const generateFingerprint = async () => {
      const components: string[] = [];

      // User Agent
      components.push(`ua:${navigator.userAgent}`);

      // Language
      components.push(`lang:${navigator.language}`);

      // Screen
      components.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}`);

      // Timezone
      components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

      // Platform
      components.push(`platform:${navigator.platform}`);

      // Hardware concurrency
      components.push(`cores:${navigator.hardwareConcurrency}`);

      // Device memory (if available)
      if ('deviceMemory' in navigator) {
        components.push(`memory:${(navigator as Navigator & { deviceMemory?: number }).deviceMemory}`);
      }

      // Touch support
      components.push(`touch:${navigator.maxTouchPoints}`);

      // Canvas fingerprint
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.textBaseline = 'top';
          ctx.font = '14px Arial';
          ctx.fillText('campus-rumor-fp', 2, 2);
          components.push(`canvas:${canvas.toDataURL().slice(-50)}`);
        }
      } catch {
        // Canvas blocked
      }

      // WebGL info
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            components.push(`webgl:${gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)}`);
          }
        }
      } catch {
        // WebGL blocked
      }

      // Generate hash
      const fingerprint = components.join('|');
      
      // Store in session storage for consistency
      sessionStorage.setItem('fp', fingerprint);
      setFingerprint(fingerprint);
    };

    // Check session storage first
    const stored = sessionStorage.getItem('fp');
    if (stored) {
      setFingerprint(stored);
    } else {
      generateFingerprint();
    }
  }, []);

  return fingerprint;
}

/**
 * Hook for making authenticated API calls
 */
export function useAPI() {
  const fingerprint = useFingerprint();

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    if (fingerprint) {
      headers.set('x-fingerprint', fingerprint);
    }
    headers.set('Content-Type', 'application/json');

    return fetch(url, {
      ...options,
      headers,
    });
  };

  return { fetchWithAuth, fingerprint };
}
