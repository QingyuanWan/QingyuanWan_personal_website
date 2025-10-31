import React, { useState } from "react";
import ProjectDetails from "./ProjectDetails";

interface Tag {
  id: number;
  name: string;
  path: string;
}

interface ProjectProps {
  id: number;
  title: string;
  description: string;
  subDescription: string[];
  href: string;
  logo: string;
  image: string;
  tags: Tag[];
  setPreview: (image: string | null) => void;
}

const Project = ({ title, description, subDescription, href, image, tags, setPreview }: ProjectProps) => {
  const [isHidden, setIsHidden] = useState(false);

  return (
    <>
      <div 
        style={{
          minHeight: '200px',
          padding: '2rem 0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
        onMouseEnter={() => setPreview(image)}
        onMouseLeave={() => setPreview(null)}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '1.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#FF9F1C', fontFamily: "'Orbitron', sans-serif" }}>
            {title}
          </p>
          <p style={{ fontSize: '1rem', color: '#ffffff', marginBottom: '1rem', lineHeight: '1.6', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
            {description}
          </p>
          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {tags.map((tag) => (
              <span 
                key={tag.id}
                style={{ 
                  color: '#d6995c', 
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  fontFamily: "'Orbitron', sans-serif"
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={() => setIsHidden(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              color: '#FF9F1C',
              fontSize: '1.125rem',
              fontWeight: '600',
              transition: 'transform 0.2s',
              fontFamily: "'Orbitron', sans-serif"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Read More
            <img src="assets/arrow-right.svg" style={{ width: '1.25rem' }} alt="arrow" />
          </button>
        </div>
        
        <div 
          style={{
            background: 'linear-gradient(to right, transparent, #374151, transparent)',
            height: '1px',
            width: '100%'
          }}
        />
      </div>

      {isHidden && (
        <ProjectDetails
          title={title}
          description={description}
          subDescription={subDescription}
          image={image}
          tags={tags}
          href={href}
          closeModal={() => setIsHidden(false)}
        />
      )}
    </>
  );
};

export default Project;