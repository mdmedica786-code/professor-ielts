/**
 * BandLogic brand marks.
 *
 * Renders the official BandLogic logo PNG shipped under /public. Two variants:
 *
 *   <BrandLogo />     — square "BL" chip cropped from the wordmark, used in
 *                       Sidebar / Navbar / SectionPicker hero squares.
 *   <BrandWordmark /> — the full horizontal wordmark, used in headers / print
 *                       templates where there's room for the full lockup.
 *
 * The square chip uses CSS background-image with a calibrated zoom + left
 * anchor — robust across browsers (no <img> transform tricks) and avoids
 * shipping a separate cropped asset.
 */
export function BrandLogo({ size = 36, className = '' }) {
  return (
    <div
      className={`rounded-xl shadow-sm bg-white border border-slate-200/50 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: 'url(/bandlogic-logo.png)',
        // The wordmark is 1024×559. The "BL" mark spans ~27% of the width on
        // the left. To make the mark fill the chip: scale image width so its
        // 27% maps to 100% of the chip → ~370%, then anchor left-center.
        backgroundSize: '370% auto',
        backgroundPosition: '0% 50%',
        backgroundRepeat: 'no-repeat',
      }}
      aria-label="BandLogic"
      role="img"
    />
  );
}

export function BrandWordmark({ height = 28, className = '' }) {
  return (
    <img
      src="/bandlogic-logo.png"
      alt="BandLogic"
      className={`block ${className}`}
      style={{ height, width: 'auto' }}
      draggable={false}
    />
  );
}

// Default export matches the most common use site.
export default BrandLogo;
