import { DotPanel } from './DotPanel';
import { SectionCards } from './SectionCards';
import { education, internships, projects } from '../content/data';

export function DotGridCanvas() {
  return (
    <DotPanel
      backgroundColor="#E8E6E0"
      dotColor="#1A1A1A"
      cursorColor="#A855F7"
      dotSpacing={24}
      dotBaseSize={3}
      haloRadius={110}
      haloMaxScale={1.8}
      haloAlphaBoost={0.4}
      cursorSize={6}
      magnetSelector="h2"
      magnetRadius={150}
      magnetStrength={8}
      magnetSmoothing={0.15}
      style={{
        minHeight: '200vh',
        padding: 'var(--space-xl) 0',
        backgroundColor: '#E8E6E0',
      }}
    >
      {/* Content */}
      <div className="container">
        {/* Education */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ color: 'var(--blue)', marginBottom: 'var(--space-sm)' }}>
            Education
          </h2>
          <SectionCards type="education" items={education} />
        </div>

        {/* Internships */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ color: 'var(--orange)', marginBottom: 'var(--space-sm)' }}>
            Internships
          </h2>
          <SectionCards type="internships" items={internships} />
        </div>

        {/* Projects */}
        <div>
          <h2 style={{ color: 'var(--blue)', marginBottom: 'var(--space-sm)' }}>
            Projects
          </h2>
          <SectionCards type="projects" items={projects} />
        </div>
      </div>
    </DotPanel>
  );
}
