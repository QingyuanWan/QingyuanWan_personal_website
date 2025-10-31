import { useState } from "react";
import { motion } from "motion/react";

function Navigation() {
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionClass: string) => {
    e.preventDefault();
    
    if (sectionClass === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    const element = document.querySelector(`.${sectionClass}`);
    if (element) {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 80;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <ul className="nav-ul">
      <li className="nav-li">
        <a 
          className="nav-link" 
          href="/"
          onClick={(e) => handleNavClick(e, 'top')}
        >
          Home
        </a>
      </li>
      <li className="nav-li">
        <a 
          className="nav-link" 
          href="#about"
          onClick={(e) => handleNavClick(e, 'about-section')}
        >
          About
        </a>
      </li>
      <li className="nav-li">
        <a 
          className="nav-link" 
          href="#work"
          onClick={(e) => handleNavClick(e, 'projects-section')}
        >
          Work
        </a>
      </li>
      <li className="nav-li">
        <a 
          className="nav-link" 
          href="#contact"
          onClick={(e) => handleNavClick(e, 'testimonial-section')}
        >
          Contact
        </a>
      </li>
    </ul>
  );
}

export const NavbarPage = () => {
  return (
    <div 
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 20,
        width: '100%',
        backgroundColor: 'rgba(3, 4, 18, 0.4)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        paddingLeft: '1rem',
        paddingRight: '2rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
        <a 
          href="/" 
          style={{ 
            fontSize: '1.25rem', 
            fontWeight: 'bold', 
            color: '#a3a3a3', 
            transition: 'color 300ms', 
            textDecoration: 'none' 
          }} 
          onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'} 
          onMouseLeave={(e) => e.currentTarget.style.color = '#a3a3a3'}
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          QW
        </a>
        <nav style={{ display: 'flex' }}>
          <Navigation />
        </nav>
      </div>
    </div>
  );
};

export default NavbarPage;