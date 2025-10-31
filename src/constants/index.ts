export const myProjects = [
  {
    id: 1,
    title: "LLM-based AI Assistant App",
    description:
      "Production-grade AI assistant with FastAPI backend, Electron desktop client, and real-time voice interaction.",
    subDescription: [
      "Architected production stack using FastAPI with vLLM to serve Qwen-2.5-7B (4-bit), enabling tool-calling governed by persona/policy JSON.",
      "Implemented cross-platform desktop client in Electron (Vite/React) with Live2D Cubism 5; avatar gestures and expressions programmatically bound to dialogue state.",
      "Engineered realtime I/O with streaming ASR and low-latency TTS (XTTS/GPT-SoVITS), incorporating multiplexing and back-pressure control.",
      "Containerized services via Docker Compose with end-to-end telemetry (logs/metrics/traces) and CI/CD via GitHub Actions and GHCR.",
    ],
    href: "https://github.com/QingyuanWan",
    logo: "",
    image: "assets/no_preview_fn.png",
    tags: [
      { id: 1, name: "Python", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" },
      { id: 2, name: "FastAPI", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg" },
      { id: 3, name: "React", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" },
      { id: 4, name: "Docker", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" },
    ],
  },
  {
    id: 2,
    title: "Multi-Modal ML for Energy Poverty Analysis",
    description:
      "Research project analyzing energy poverty in Sub-Saharan Africa using satellite imagery and machine learning.",
    subDescription: [
      "Conducted research on energy poverty in Sub-Saharan Africa and developed multi-modal ML model for settlement and electricity detection on satellite imagery.",
      "Trained model using pre-trained ResNet101 as baseline for predicting ground truth labels.",
      "Incorporated settlement detection using U-Net CNN architecture and electricity detection using Random Forest model.",
      "Published research findings and open-sourced codebase on GitHub.",
    ],
    href: "https://github.com/QingyuanWan/energy-poverty-ml-ssa",
    logo: "",
    image: "assets/epms_2.png",
    tags: [
      { id: 1, name: "Python", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" },
      { id: 2, name: "TensorFlow", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg" },
      { id: 3, name: "ResNet", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg" },
      { id: 4, name: "U-Net", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/opencv/opencv-original.svg" },
    ],
  },
  {
    id: 3,
    title: "Python-Based Search Engine",
    description:
      "Custom search engine built from scratch with web crawler, inverted index, and optimized ranking algorithm.",
    subDescription: [
      "Built Python-based search engine from scratch with custom web crawler that indexed all UCI-related webpages within 10 hours.",
      "Implemented inverted index and custom symbolizer with specialized normalization method for efficient tokenization and content mapping.",
      "Designed ranking algorithm and disk-based caching system to deliver relevant search results within 100ms.",
      "Optimized for both speed and low memory usage with efficient data structures.",
    ],
    href: "https://github.com/QingyuanWan/python-searchEngine-onUCI",
    logo: "",
    image: "assets/code-screen.png",
    tags: [
      { id: 1, name: "Python", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" },
      { id: 2, name: "HTML", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" },
      { id: 3, name: "Algorithms", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" },
    ],
  },
  {
    id: 4,
    title: "Deep Learning Stock Prediction (Research)",
    description:
      "LSTM-based stock prediction model with differential privacy, published at CSIC 2023 conference.",
    subDescription: [
      "Developed stock prediction model using LSTM neural networks in team environment supervised by MIT Associate Professor Mark Vogelsberger.",
      "Conducted comprehensive research and applied Differential Privacy methods to enhance model accuracy.",
      "Achieved significant improvements in short-term forecasting accuracy through advanced deep learning techniques.",
      "Co-authored research paper accepted by 2023 5th International Conference on Computer Science and Intelligent Communication (CSIC 2023).",
    ],
    href: "https://github.com/QingyuanWan",
    logo: "",
    image: "assets/code-screen.png",
    tags: [
      { id: 1, name: "Python", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" },
      { id: 2, name: "LSTM", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg" },
      { id: 3, name: "TensorFlow", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg" },
      { id: 4, name: "Research", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" },
    ],
  },
  {
    id: 5,
    title: "Advanced Human Skeletal Recognition (Research)",
    description:
      "CV model for human skeletal recognition integrated as Unreal Engine 5 plugin, developed under UCI supervision.",
    subDescription: [
      "Conducted rigorous testing and validation using UE5-generated datasets under supervision of UCI Ph.D. candidate Saad Manzur and Professor Wayne Hayes.",
      "Rectified skeletal prediction inaccuracies in CV models using UE5's character models for improved accuracy.",
      "Constructed standalone AI system in C++ and integrated as UE5 plugin for real-time skeletal tracking.",
      "Gained expertise in character modeling, retargeting, motion blueprint logic, and Unreal Engine workflow.",
    ],
    href: "",
    logo: "",
    image: "assets/code-screen.png",
    tags: [
      { id: 1, name: "C++", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg" },
      { id: 2, name: "UE5", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/unrealengine/unrealengine-original.svg" },
      { id: 3, name: "CV", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/opencv/opencv-original.svg" },
      { id: 4, name: "Git", path: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg" },
    ],
  },
];



export const experiences = [
  {
    title: "Master's in Computer Science",
    job: "Northeastern University",
    date: "September 2024 - Present",
    contents: [
      "Pursuing advanced coursework in Computer Science.",
    ],
  },

      {
    title: "Backend Developer Intern",
    job: "IpserLab",
    date: "June 2025 – September 2025",
    contents: [
      "Developed Java backend services and APIs for user interactions and multi-format uploads with rigorous validation and logging.",
      "Tuned PostgreSQL data layer with pgAdmin for optimized database performance.",
      "Packaged internal Windows dev tools as self-contained installers to streamline development setup process.",
    ],
  },
    {
    title: "Bachelor's in Computer Science",
    job: "University of California, Irvine",
    date: "October 2020 - June 2024",
    contents: [
      "Completed undergraduate degree in Computer Science.",
    ],
  },

  {
    title: "IoT System Developer Intern",
    job: "Inspur General Software Co., Ltd.",
    date: "July 2023 - October 2023",
    contents: [
      "Diagnosed and resolved back-end system bugs affecting production stability.",
      "Managed and transformed datasets to support accurate load prediction and improve data reliability.",
      "Investigated neural network models (LSTM on TensorFlow, TCN) for photovoltaic power forecasting.",
      "Reduced training time through innovative use of Batch Normalization layers, improving model efficiency.",
    ],
  },

];

export const mySocials = [
  {
    name: "GitHub",
    href: "https://github.com/QingyuanWan",
    icon: "assets/socials/github.svg",
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/qingyuan-wan-b240b2231/",
    icon: "assets/socials/linkedIn.svg",
  },
  {
    name: "Email",
    href: "mailto:2001wanqingyuan@gmail.com",
    icon: "assets/socials/email.svg",
  },
];

export const reviews = [
  {
    name: "Dr. Mark Vogelsberger",
    username: "@MIT Professor",
    body: "Qingyuan demonstrated exceptional research skills in our stock prediction project. His work with LSTM and differential privacy was outstanding.",
    img: "https://robohash.org/mark",
  },
  {
    name: "Prof. Wayne Hayes",
    username: "@UCI CS Department",
    body: "Impressive work on the skeletal recognition system. Qingyuan's integration of CV models with Unreal Engine was technically sophisticated.",
    img: "https://robohash.org/wayne",
  },
  {
    name: "Saad Manzur",
    username: "@UCI Researcher",
    body: "Great collaboration on the UE5 plugin development. Qingyuan quickly mastered complex C++ integration and character modeling workflows.",
    img: "https://robohash.org/saad",
  },
  {
    name: "IpserLab Team Lead",
    username: "@IpserLab",
    body: "Qingyuan's Java backend work was clean and well-tested. He consistently delivered quality code and improved our development tools.",
    img: "https://robohash.org/ipserlab",
  },
  {
    name: "Inspur Supervisor",
    username: "@Inspur General",
    body: "Excellent problem-solving skills. Qingyuan's work on the IoT system and neural network optimization significantly improved our forecasting accuracy.",
    img: "https://robohash.org/inspur",
  },
  {
    name: "Project Collaborator",
    username: "@Energy Research",
    body: "The multi-modal ML approach to energy poverty analysis was innovative. Qingyuan's implementation with ResNet and U-Net was technically solid.",
    img: "https://robohash.org/energy",
  },
];

export const technicalSkills = {
  languages: ["Python", "Java", "C++", "C", "Lisp", "SQL", "JavaScript"],
  webTechnologies: ["React JS", "Node JS", "ExpressJS", "MongoDB", "AWS", "FastAPI"],
  tools: ["Git", "Docker", "Unreal Engine", "PyTorch", "TensorFlow"],
};


export const contactInfo = [
  {
    id: 1,
    name: "GitHub",
    href: "https://github.com/QingyuanWan",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg",
    label: "View my repositories",
    description: "Check out my open-source projects and contributions"
  },
  {
    id: 2,
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/qingyuan-wan-b240b2231/",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linkedin/linkedin-plain.svg",
    label: "Connect professionally",
    description: "Let's connect and grow our professional network"
  },
  {
    id: 3,
    name: "Email",
    href: "mailto:2001wanqingyuan@gmail.com",
    icon: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/gmail.svg",
    label: "2001wanqingyuan@gmail.com",
    description: "Send me an email for opportunities or collaboration"
  },
  {
    id: 4,
    name: "Resume",
    href: "/QingyuanWan_personal_website/assets/resume-wanqingyuan-2025-winter-change-1.pdf",
    icon: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/adobeacrobatreader.svg",
    label: "Download PDF",
    description: "View my complete professional experience and skills"
  },
];