import { OrbitingCircles } from "./OrbitingCircles";

export function Frameworks() {
  // Skills you already have locally (SVG and PNG)
  const localSkills = [
    { name: "auth0", ext: "svg" },
    { name: "blazor", ext: "svg" },
    { name: "cplusplus", ext: "svg" },
    { name: "csharp", ext: "svg" },
    { name: "css3", ext: "svg" },
    { name: "dotnet", ext: "svg" },
    { name: "dotnetcore", ext: "svg" },
    { name: "git", ext: "svg" },
    { name: "html5", ext: "svg" },
    { name: "javascript", ext: "svg" },
    { name: "microsoft", ext: "svg" },
    { name: "react", ext: "svg" },
    { name: "sqlite", ext: "svg" },
    { name: "tailwindcss", ext: "svg" },
    { name: "vitejs", ext: "svg" },
    { name: "wordpress", ext: "svg" },
  ];

  // New skills from CDN
  const cdnSkills = [
    { name: "Python", icon: "python" },
    { name: "Java", icon: "openjdk" },
    { name: "C", icon: "c" },
    { name: "Node.js", icon: "nodedotjs" },
    { name: "Express", icon: "express" },
    { name: "MongoDB", icon: "mongodb" },
    { name: "Docker", icon: "docker" },
    { name: "Unreal Engine", icon: "unrealengine" },
    { name: "PyTorch", icon: "pytorch" },
    { name: "TensorFlow", icon: "tensorflow" },
    { name: "FastAPI", icon: "fastapi" },
  ];

  return (
    <div className="relative flex h-[15rem] w-full flex-col items-center justify-center">
      {/* Outer circle - local logos */}
      <OrbitingCircles iconSize={40} radius={120}>
        {localSkills.map((skill, index) => (
          <Icon key={index} src={`assets/logos/${skill.name}.${skill.ext}`} />
        ))}
      </OrbitingCircles>
      
      {/* Inner circle - CDN logos */}
      <OrbitingCircles iconSize={30} radius={75} reverse speed={1.5}>
        {cdnSkills.map((skill, index) => (
          <IconCDN key={index} name={skill.name} icon={skill.icon} />
        ))}
      </OrbitingCircles>
    </div>
  );
}

const Icon = ({ src }: { src: string }) => (
  <img 
    src={src} 
    className="duration-200 rounded-sm hover:scale-110" 
    alt="Tech stack icon"
  />
);

const IconCDN = ({ name, icon }: { name: string; icon: string }) => (
  <img 
    src={`https://cdn.simpleicons.org/${icon}/white`}
    className="duration-200 rounded-sm hover:scale-110 bg-white/10 p-1" 
    alt={name}
  />
);