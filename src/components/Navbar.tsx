import { useState } from 'react';

/**
 * Navbar - Fixed navigation bar
 *
 * Simple, minimalist navigation with responsive mobile menu
 */

function Navigation() {
  return (
    <ul
      style={{
        display: 'flex',
        listStyle: 'none',
        gap: 'var(--space-lg)',
        padding: 0,
        margin: 0,
      }}
    >
      <li>
        <a
          href="#home"
          style={{
            color: 'var(--text)',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: 500,
            transition: 'color 0.3s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brand)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text)')}
        >
          Home
        </a>
      </li>
      <li>
        <a
          href="#about"
          style={{
            color: 'var(--text)',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: 500,
            transition: 'color 0.3s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brand)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text)')}
        >
          About
        </a>
      </li>
      <li>
        <a
          href="#work"
          style={{
            color: 'var(--text)',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: 500,
            transition: 'color 0.3s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brand)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text)')}
        >
          Work
        </a>
      </li>
      <li>
        <a
          href="#contact"
          style={{
            color: 'var(--text)',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: 500,
            transition: 'color 0.3s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brand)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text)')}
        >
          Contact
        </a>
      </li>
    </ul>
  );
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(var(--bg-rgb), 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 var(--space-md)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px',
          }}
        >
          {/* Logo */}
          <a
            href="/"
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--text)',
              textDecoration: 'none',
              transition: 'color 0.3s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brand)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text)')}
          >
            QW
          </a>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              display: 'none',
              padding: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text)',
            }}
            className="mobile-menu-button"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {isOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>

          {/* Desktop Navigation */}
          <nav className="desktop-nav" style={{ display: 'flex' }}>
            <Navigation />
          </nav>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div
          className="mobile-nav"
          style={{
            display: 'none',
            padding: 'var(--space-md)',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg)',
          }}
        >
          <nav>
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                listStyle: 'none',
                gap: 'var(--space-md)',
                padding: 0,
                margin: 0,
              }}
            >
              <li>
                <a
                  href="#home"
                  onClick={() => setIsOpen(false)}
                  style={{
                    color: 'var(--text)',
                    textDecoration: 'none',
                    fontSize: '18px',
                    fontWeight: 500,
                  }}
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  onClick={() => setIsOpen(false)}
                  style={{
                    color: 'var(--text)',
                    textDecoration: 'none',
                    fontSize: '18px',
                    fontWeight: 500,
                  }}
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#work"
                  onClick={() => setIsOpen(false)}
                  style={{
                    color: 'var(--text)',
                    textDecoration: 'none',
                    fontSize: '18px',
                    fontWeight: 500,
                  }}
                >
                  Work
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  onClick={() => setIsOpen(false)}
                  style={{
                    color: 'var(--text)',
                    textDecoration: 'none',
                    fontSize: '18px',
                    fontWeight: 500,
                  }}
                >
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-button {
            display: block !important;
          }
          .mobile-nav {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
