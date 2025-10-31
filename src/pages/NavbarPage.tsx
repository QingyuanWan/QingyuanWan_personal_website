import { useState } from "react";
import { motion } from "motion/react";

function Navigation() {
  return (
    <ul className="nav-ul">
      <li className="nav-li">
        <a className="nav-link" href="/">
          Home
        </a>
      </li>
      <li className="nav-li">
        <a className="nav-link" href="#about">
          About
        </a>
      </li>
      <li className="nav-li">
        <a className="nav-link" href="#work">
          Work
        </a>
      </li>
      <li className="nav-li">
        <a className="nav-link" href="#contact">
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
        <a href="/" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#a3a3a3', transition: 'color 300ms', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'} onMouseLeave={(e) => e.currentTarget.style.color = '#a3a3a3'}>
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