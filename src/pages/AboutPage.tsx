import { useRef } from "react";
import { Globe } from "../components/Globe";
import CopyEmailButton from "../components/CopyEmailButton";
import { Frameworks } from "../components/Frameworks";
import { Meteors } from "../components/ui/meteors";
import { RippleGithub } from "../components/ripple_github";

const AboutPage = () => {
  const grid2Container = useRef<HTMLDivElement>(null);
  
  return (
    <section className="c-space section-spacing relative" id="about">
      {/* Stars Background Layer */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage: 'url(/QingyuanWan_personal_website/assets/Stars-Big_1_1_PC.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      {/* Content with higher z-index */}
      <div className="relative z-10">
      <h2 className="text-heading" style={{ marginBottom: '24px' }}>About Me</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6 md:auto-rows-[18rem] mt-12">
          {/* Grid 1 */}
          <div className="flex items-end grid-default-color grid-1">
            <img
              src="assets/coding-pov.png"
              className="absolute scale-[1.75] -right-[5rem] -top-[1rem] md:scale-[3] md:left-50 md:inset-y-10 lg:scale-[2.5]"
              alt="Coding perspective"
            />
            <div className="z-10">
              <p className="headtext">Hi, I'm Qingyuan Wan</p>
              <p className="subtext">
                Over the last 4 years, I developed my frontend and backend dev
                skills to deliver dynamic and software and web applications.
              </p>
            </div>
            <div className="absolute inset-x-0 pointer-events-none -bottom-4 h-1/2 sm:h-1/3 bg-gradient-to-t from-indigo" />
          </div>
          
          {/* Grid 2 */}
          <div className="grid-default-color grid-2">
            <figure className="absolute left-0 top-8 w-full h-full scale-120">
              <RippleGithub />
            </figure>
            <div className="z-10 w-[50%] ml-auto">
              <p className="headtext">GitHub</p>
              <p className="subtext">
                Welcome to check my GitHub
              </p>
            </div>
          </div>
          
          {/* Grid 3 */}
          <div className="grid-black-color grid-3">
            <div className="z-10 w-[50%]">
              <p className="headtext">Time Zone</p>
              <p className="subtext">
                I'm based in Mars, and open to remote work worldwide
              </p>
            </div>
            <figure className="absolute left-[30%] top-[10%]">
              <Globe />
            </figure>
          </div>
          
          {/* Grid 4 */}
          <div className="grid-special-color grid-4">
            <Meteors number={60} />
            <div className="flex flex-col items-center justify-center gap-4 size-full relative z-10">
              <p className="text-center headtext">
                Do you want to start a project together?
              </p>
              <CopyEmailButton />
            </div>
          </div>
          
          {/* Grid 5 */}
          <div className="grid-default-color grid-5">
            <div className="z-10 w-[50%]">
              <p className="headtext">Tech Stack</p>
              <p className="subtext">
                I specialize in a variety of languages, frameworks, and tools that
                allow me to build robust and scalable applications
              </p>
            </div>
            <div className="absolute inset-y-0 md:inset-y-9 w-full h-full start-[50%] md:scale-125">
              <Frameworks />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutPage;