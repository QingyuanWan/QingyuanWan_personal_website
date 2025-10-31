import { Ripple } from "./ui/ripple";

export function RippleGithub() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <a 
        href="https://github.com/QingyuanWan" 
        target="_blank" 
        rel="noopener noreferrer"
        className="z-10 hover:scale-110 transition-transform duration-300"
      >
        <img 
          src="https://cdn.simpleicons.org/github/white" 
          alt="GitHub" 
          className="w-20 h-20"
        />
      </a>
      <Ripple 
        mainCircleSize={140}
        mainCircleOpacity={0.35}
        numCircles={6}
      />
    </div>
  );
}