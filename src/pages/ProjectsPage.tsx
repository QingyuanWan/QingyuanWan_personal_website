import { useState } from "react";
import Project from "../components/Project";
import { myProjects } from "../constants";
import { motion, useMotionValue, useSpring } from "motion/react";
import { DotPanel } from "../components/DotPanel";

export function ProjectsPage() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { damping: 10, stiffness: 50 });
  const springY = useSpring(y, { damping: 10, stiffness: 50 });

  const handleMouseMove = (e: React.MouseEvent) => {
    x.set(e.clientX + 20);
    y.set(e.clientY + 20);
  };

  const [preview, setPreview] = useState<string | null>(null);

  return (
    <DotPanel
      style={{ minHeight: '100vh' }}
      backgroundColor="#030412"
      dotColor="#FF9F1C"
      cursorColor="#a824b9a2"
      dotSpacing={40}
    >
      <section
        onMouseMove={handleMouseMove}
        className="relative c-space section-spacing"
        id="projects"
      >
        <h2 className="text-heading">My Selected Projects</h2>
        <div className="bg-gradient-to-r from-transparent via-neutral-700 to-transparent mt-12 h-[1px] w-full" style={{ marginBottom: '2em' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5em' }}>
          {myProjects.map((project) => (
            <Project key={project.id} {...project} setPreview={setPreview} />
          ))}
        </div>
        {preview && (
          <motion.img
            className="fixed top-0 left-0 z-50 object-cover h-56 rounded-lg shadow-lg pointer-events-none w-80"
            src={preview}
            style={{ x: springX, y: springY }}
            alt="Project preview"
          />
        )}
      </section>
    </DotPanel>
  );
}