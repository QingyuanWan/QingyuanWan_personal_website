import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../utils/gsap';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface EducationItem {
  dates: string;
  school: string;
  details: string;
}

interface InternshipItem {
  title: string;
  org: string;
  dates: string;
  bullets: string[];
}

interface ProjectItem {
  name: string;
  dates: string;
  bullets: string[];
}

interface SectionCardsProps {
  type: 'education' | 'internships' | 'projects';
  items: EducationItem[] | InternshipItem[] | ProjectItem[];
}

export function SectionCards({ type, items }: SectionCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      if (!reducedMotion) {
        gsap.from('.section-card', {
          y: 24,
          opacity: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 80%',
          },
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  const renderEducation = (item: EducationItem, index: number) => (
    <div key={index} className="section-card">
      <div className="dates">{item.dates}</div>
      <h3>{item.school}</h3>
      <div className="org">{item.details}</div>
    </div>
  );

  const renderInternship = (item: InternshipItem, index: number) => (
    <div key={index} className="section-card">
      <h3>{item.title}</h3>
      <div className="org">{item.org}</div>
      <div className="dates">{item.dates}</div>
      <ul>
        {item.bullets.map((bullet, i) => (
          <li key={i}>{bullet}</li>
        ))}
      </ul>
    </div>
  );

  const renderProject = (item: ProjectItem, index: number) => (
    <div key={index} className="section-card">
      <h3>{item.name}</h3>
      <div className="dates">{item.dates}</div>
      <ul>
        {item.bullets.map((bullet, i) => (
          <li key={i}>{bullet}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <div ref={containerRef}>
      {type === 'education' &&
        (items as EducationItem[]).map((item, i) => renderEducation(item, i))}
      {type === 'internships' &&
        (items as InternshipItem[]).map((item, i) => renderInternship(item, i))}
      {type === 'projects' &&
        (items as ProjectItem[]).map((item, i) => renderProject(item, i))}
    </div>
  );
}
