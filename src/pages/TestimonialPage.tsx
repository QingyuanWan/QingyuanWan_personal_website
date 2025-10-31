import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Marquee from "../components/Marquee";
import { contactInfo } from "../constants";

// Duplicate contact info to create continuous scrolling effect
const firstRow = [...contactInfo, ...contactInfo];
// For reverse row, start with different order to show content immediately
const secondRow = [...contactInfo.slice(2), ...contactInfo.slice(0, 2), ...contactInfo];

interface ContactCardProps {
  name: string;
  href: string;
  icon: string;
  label: string;
  description: string;
}

const ContactCard: React.FC<ContactCardProps> = ({ name, href, icon, label, description }) => {
  const [copied, setCopied] = useState(false);
  
  const handleClick = () => {
    if (name === "Resume") {
      // For resume, download the file
      const link = document.createElement('a');
      link.href = href;
      link.download = 'Qingyuan_Wan_Resume.pdf';
      link.click();
    } else if (name === "Email") {
      // For email, copy to clipboard
      const emailAddress = href.replace('mailto:', '');
      navigator.clipboard.writeText(emailAddress).then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      });
    } else {
      // For other links, open in new tab
      window.open(href, '_blank');
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative',
        height: '200px',
        width: '280px',
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: '1rem',
        border: '2px solid rgba(255, 159, 28, 0.2)',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #1f1e39 0%, #282b4b 100%)',
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, #5c33cc 0%, #7a57db 100%)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(92, 51, 204, 0.4)';
        e.currentTarget.style.borderColor = 'rgba(255, 159, 28, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, #1f1e39 0%, #282b4b 100%)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
        e.currentTarget.style.borderColor = 'rgba(255, 159, 28, 0.2)';
      }}
    >
      {/* Icon */}
      <div style={{
        width: '60px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        background: 'rgba(255, 159, 28, 0.1)',
        transition: 'all 0.3s',
      }}>
        <img
          src={icon}
          alt={name}
          style={{
            width: '40px',
            height: '40px',
            filter: 'brightness(0) invert(1)',
          }}
        />
      </div>

      {/* Content */}
      <div style={{
        textAlign: 'center',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}>
        <AnimatePresence mode="wait">
          {name === "Email" && copied ? (
            <motion.h3
              key="copied"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#4ade80',
                fontFamily: "'Orbitron', sans-serif",
                margin: 0,
              }}
            >
              Copied!
            </motion.h3>
          ) : (
            <motion.h3
              key="original"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#FF9F1C',
                fontFamily: "'Orbitron', sans-serif",
                margin: 0,
              }}
            >
              {name}
            </motion.h3>
          )}
        </AnimatePresence>
        
        <AnimatePresence mode="wait">
          {name === "Email" && copied ? (
            <motion.p
              key="copied-label"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.9)',
                fontFamily: "'Inter', sans-serif",
                margin: 0,
              }}
            >
              Email copied to clipboard
            </motion.p>
          ) : (
            <motion.p
              key="original-label"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.9)',
                fontFamily: "'Inter', sans-serif",
                margin: 0,
              }}
            >
              {label}
            </motion.p>
          )}
        </AnimatePresence>
        
        <p style={{
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.6)',
          fontFamily: "'Inter', sans-serif",
          margin: 0,
          lineHeight: '1.4',
        }}>
          {description}
        </p>
      </div>
    </div>
  );
};

export function TestimonialPage() {
  return (
    <div style={{ 
      marginTop: '6.25rem', 
      padding: '0 1.25rem', 
      position: 'relative',
      minHeight: '600px',
    }}>
      {/* Stars Background Layer */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          opacity: 0.4,
          zIndex: 0,
          backgroundImage: 'url(/QingyuanWan_personal_website/assets/Stars-Big_1_1_PC.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      {/* Content with higher z-index */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <h2 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          marginBottom: '3rem', 
          color: '#FF9F1C', 
          fontFamily: "'Orbitron', sans-serif",
          textAlign: 'center',
        }}>
          Let's Connect
        </h2>
        
        <div style={{ 
          position: 'relative', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: '100%', 
          overflow: 'hidden',
          gap: '2rem',
        }}>
          {/* First scrolling row */}
          <Marquee pauseOnHover className="[--duration:30s]" repeat={2}>
            {firstRow.map((contact, index) => (
              <ContactCard key={`${contact.name}-${index}`} {...contact} />
            ))}
          </Marquee>
          
          {/* Second scrolling row (reverse) with offset to show immediately */}
          <div style={{ 
            position: 'relative',
            width: '100%',
            animation: 'none', // Disable initial animation to position correctly
          }}>
            <Marquee reverse pauseOnHover className="[--duration:30s]" repeat={2} style={{
              animationDelay: '-15s', // Start animation halfway through to show cards immediately
            }}>
              {secondRow.map((contact, index) => (
                <ContactCard key={`${contact.name}-reverse-${index}`} {...contact} />
              ))}
            </Marquee>
          </div>
          
          {/* Gradient overlays for fade effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: '15%',
            pointerEvents: 'none',
            background: 'linear-gradient(to right, #030412, transparent)',
            zIndex: 2,
          }}></div>
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: '15%',
            pointerEvents: 'none',
            background: 'linear-gradient(to left, #030412, transparent)',
            zIndex: 2,
          }}></div>
        </div>
      </div>
    </div>
  );
}