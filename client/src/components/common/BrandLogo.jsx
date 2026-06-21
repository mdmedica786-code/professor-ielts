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
import markImg from '../../assets/bandlogic-mark.png';
import wordmarkImg from '../../assets/bandlogic-logo-transparent.png';

export function BrandLogo({ size = 36, className = '' }) {
  return (
    <img
      src={markImg}
      alt="BandLogic"
      className={`block object-contain flex-shrink-0 ${className}`}
      style={{ width: size, height: 'auto' }}
      draggable={false}
    />
  );
}

export function BrandWordmark({ height = 28, className = '' }) {
  return (
    <img
      src={wordmarkImg}
      alt="BandLogic"
      className={`block object-contain ${className}`}
      style={{ height, width: 'auto' }}
      draggable={false}
    />
  );
}

// Default export matches the most common use site.
export default BrandLogo;
