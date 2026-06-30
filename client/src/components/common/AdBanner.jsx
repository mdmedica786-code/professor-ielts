import { useEffect } from 'react';
import useEntitlements from '../../hooks/useEntitlements';
import { showBanner, hideBanner } from '../../services/admob';

/**
 * Global bottom banner. Renders nothing in the DOM — AdMob draws a native banner
 * over the webview. Only shows for non-paying users in the native app; Pro users
 * and ad-removal buyers never see it. Safe no-op on the web.
 */
export default function AdBanner() {
  const { showAds } = useEntitlements();

  useEffect(() => {
    if (showAds) {
      showBanner();
      return () => hideBanner();
    }
    hideBanner();
  }, [showAds]);

  return null;
}
