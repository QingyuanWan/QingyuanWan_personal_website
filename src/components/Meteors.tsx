export const Meteors = ({ number = 20 }: { number?: number }) => {
  const meteors = new Array(number).fill(true);
  
  return (
    <>
      {meteors.map((_, idx) => (
        <span
          key={idx}
          className="animate-meteor-effect"
          style={{
            position: 'absolute',
            top: Math.floor(Math.random() * 100) + "%",
            left: Math.floor(Math.random() * 100) + "%",
            height: '2px',
            width: '2px',
            borderRadius: '9999px',
            background: '#94a3b8',
            boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.1)',
            transform: 'rotate(215deg)',
            animationDelay: Math.random() * 0.6 + 0.2 + "s",
            animationDuration: Math.floor(Math.random() * 8 + 2) + "s",
          }}
        >
          <div 
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              height: '1px',
              width: '50px',
              transform: 'translate(-50%, -50%)',
              background: 'linear-gradient(to right, #94a3b8, transparent)',
              pointerEvents: 'none',
            }}
          />
        </span>
      ))}
    </>
  );
};