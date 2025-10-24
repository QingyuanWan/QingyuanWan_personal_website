export function FlowingBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5BC0F8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3A9FD5" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="whiteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF9F1C" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FFB84D" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Large flowing wave - top */}
        <path
          d="M0,300 Q200,200 400,250 T800,300 Q1000,350 1200,280 T1440,320 L1440,0 L0,0 Z"
          fill="url(#blueGradient)"
          className="flowing-shape-1"
        />

        {/* Bottom wave */}
        <path
          d="M0,450 Q300,380 600,420 T1200,400 L1440,450 L1440,900 L0,900 Z"
          fill="url(#whiteGradient)"
          className="flowing-shape-2"
        />

        {/* Mid-section orange accent */}
        <path
          d="M-200,600 Q200,550 600,580 T1400,620 Q1600,580 1800,600 L1800,900 L-200,900 Z"
          fill="url(#orangeGradient)"
          className="flowing-shape-3"
          style={{ opacity: 0.6 }}
        />

        {/* Floating circle - left */}
        <circle
          cx="20%"
          cy="25%"
          r="250"
          fill="url(#whiteGradient)"
          className="floating-circle-1"
        />

        {/* Floating circle - right */}
        <circle
          cx="80%"
          cy="70%"
          r="200"
          fill="url(#blueGradient)"
          className="floating-circle-2"
          style={{ opacity: 0.4 }}
        />

        {/* Small accent circle */}
        <circle
          cx="60%"
          cy="40%"
          r="150"
          fill="url(#orangeGradient)"
          className="floating-circle-3"
          style={{ opacity: 0.3 }}
        />
      </svg>
    </div>
  );
}
