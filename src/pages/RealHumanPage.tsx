import { ErrorBoundary } from '../components/ErrorBoundary';
import { RealHumanSection } from '../components/RealHumanSection';

/**
 * RealHumanPage - Name reveal section with three bands
 *
 * Three-band layout:
 * - Top band: "REAL" with binary texture (left-aligned)
 * - Middle band: "Qingyuan Wan" with dot canvas (centered, follows cursor)
 * - Bottom band: "HUMAN" with binary texture (right-aligned)
 */
export function RealHumanPage() {
  return (
    <ErrorBoundary>
      <RealHumanSection />
    </ErrorBoundary>
  );
}
