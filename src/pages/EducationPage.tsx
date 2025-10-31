import { ErrorBoundary } from '../components/ErrorBoundary';
import { DotGridCanvas } from '../components/DotGridCanvas';

/**
 * EducationPage - Education, Internships, and Projects section
 *
 * Uses DotGridCanvas component which includes:
 * - Education section
 * - Internships section
 * - Projects section
 *
 * All sections are rendered with interactive dot grid background
 */
export function EducationPage() {
  return (
    <ErrorBoundary>
      <DotGridCanvas />
    </ErrorBoundary>
  );
}
