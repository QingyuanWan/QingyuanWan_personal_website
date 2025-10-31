import Marquee from "../components/Marquee";
import { reviews } from "../constants";

const firstRow = reviews.slice(0, reviews.length / 2);
const secondRow = reviews.slice(reviews.length / 2);

interface ReviewCardProps {
  img: string;
  name: string;
  username: string;
  body: string;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ img, name, username, body }) => {
  return (
    <figure
      style={{
        position: 'relative',
        height: '100%',
        width: '16rem',
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1rem',
        background: 'linear-gradient(to right, #1f1e39, #282b4b)',
        transition: 'all 0.3s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(to right, #5c33cc, #7a57db)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'linear-gradient(to right, #1f1e39, #282b4b)';
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
        <img
          style={{ borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)' }}
          width="32"
          height="32"
          alt=""
          src={img}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <figcaption style={{ fontSize: '0.875rem', fontWeight: '500', color: 'white' }}>
            {name}
          </figcaption>
          <p style={{ fontSize: '0.75rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.4)' }}>
            {username}
          </p>
        </div>
      </div>
      <blockquote style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
        {body}
      </blockquote>
    </figure>
  );
};

export function TestimonialPage() {
  return (
    <div style={{ marginTop: '6.25rem', padding: '0 1.25rem', position: 'relative' }}>
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
        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '2rem', color: '#fff' }}>
          Hear From My Clients
        </h2>
        <div style={{ 
          position: 'relative', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: '100%', 
          marginTop: '3rem', 
          overflow: 'hidden',
          minHeight: '400px',
          gap: '1rem'
        }}>
          <Marquee pauseOnHover className="[--duration:20s]">
            {firstRow.map((review) => (
              <ReviewCard key={review.username} {...review} />
            ))}
          </Marquee>
          <Marquee reverse pauseOnHover className="[--duration:20s]">
            {secondRow.map((review) => (
              <ReviewCard key={review.username} {...review} />
            ))}
          </Marquee>
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: '25%',
            pointerEvents: 'none',
            background: 'linear-gradient(to right, #030412, transparent)'
          }}></div>
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: '25%',
            pointerEvents: 'none',
            background: 'linear-gradient(to left, #030412, transparent)'
          }}></div>
        </div>
      </div>
    </div>
  );
}