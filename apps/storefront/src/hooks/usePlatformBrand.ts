import { useState, useEffect } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export interface PlatformBrand {
  platformLogoUrl: string | null;
  platformName: string;
  primaryColor: string;
  isLoading: boolean;
  error: boolean;
}

export function usePlatformBrand(): PlatformBrand {
  const [data, setData] = useState<PlatformBrand>({
    platformLogoUrl: null,
    platformName: 'سوق هاء',
    primaryColor: '#5c9cd5',
    isLoading: true,
    error: false,
  });

  useEffect(() => {
    fetch(`${BASE_URL}/api/brand`)
      .then((res) => res.json())
      .then((json: any) => {
        if (json?.success && json?.data) {
          setData({
            platformLogoUrl: json.data.logoUrl ?? null,
            platformName: json.data.tenantName ?? 'سوق هاء',
            primaryColor: json.data.primaryColor ?? '#5c9cd5',
            isLoading: false,
            error: false,
          });
        } else {
          setData((prev) => ({ ...prev, isLoading: false, error: true }));
        }
      })
      .catch(() => {
        setData((prev) => ({ ...prev, isLoading: false, error: true }));
      });
  }, []);

  return data;
}
