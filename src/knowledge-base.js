/**
 * Knowledge base for auto-answering support questions.
 * Sourced from https://www.hackberry.se/
 */

export const COMPANY_INFO = {
  name: "Hackberry",
  type: "Swedish full-service digital agency",
  location: "Gårdsvägen 8, 169 70 Solna, Sweden",
  website: "www.hackberry.se",
  description: "Hackberry designs and develops digital products including apps, websites, and backend systems.",

  services: [
    "UX/UI Design",
    "Mobile App Development",
    "Web Development",
    "Backend Development",
    "Full-stack Solutions",
    "Individual Consulting Services",
  ],

  techStack: ["React", "Flutter", "Node.js", "Python", "Java", "Google Cloud Platform (GCP)", "Amazon Web Services (AWS)"],

  values: {
    smartTech: "Technology should serve your business needs — today and tomorrow.",
    awesomePeople: "Skilled and engaged professionals creating real user value.",
    realImpact: "Building important digital solutions with Sweden as our base.",
  },

  clients: [
    "SL", "Ragn Sells", "Ahlsells", "Kronans Apotek", "Tibber",
    "IKEA", "Tre", "EasyPark", "Pokémon (Polarium)", "Hub Ocean",
  ],

  projects: [
    "Polarium", "Ballers App", "Tibber Installer", "Hub Ocean",
    "PlayReplay", "EsterCare", "Seniora", "Claire", "Evify",
    "Sun4Energy", "Karo Pharma",
  ],

  team: "A small full-service agency with integrated strategy, design, development, and infrastructure teams. Individual consultants available upon request.",
};

/**
 * Common Q&A pairs for auto-answering.
 */
export const FAQ = [
  {
    keywords: ["what do you do", "what does hackberry do", "services", "what do you offer", "help with"],
    answer: "Hackberry is a Swedish full-service digital agency based in Solna. We design and develop digital products including apps, websites, and backend systems. Our services include UX/UI Design, Mobile App Development, Web Development, Backend Development, and Full-stack Solutions.",
  },
  {
    keywords: ["tech stack", "technology", "what tech", "frameworks", "languages", "programming"],
    answer: "We work with React, Flutter, Node.js, Python, Java, Google Cloud Platform (GCP), and Amazon Web Services (AWS).",
  },
  {
    keywords: ["location", "where are you", "office", "address", "based"],
    answer: "We're located at Gårdsvägen 8, 169 70 Solna, Sweden.",
  },
  {
    keywords: ["contact", "reach you", "get in touch", "email", "phone"],
    answer: "You can reach us through our website at www.hackberry.se or visit us at Gårdsvägen 8, 169 70 Solna, Sweden.",
  },
  {
    keywords: ["clients", "customers", "who do you work with", "portfolio", "worked with"],
    answer: "We've worked with clients including SL, Ragn Sells, Ahlsells, Kronans Apotek, Tibber, IKEA, Tre, EasyPark, and more across sectors including energy, healthcare, and sports tech.",
  },
  {
    keywords: ["team", "how many", "size", "people", "employees", "consultants"],
    answer: "Hackberry is a small full-service agency with integrated strategy, design, development, and infrastructure teams. We also offer individual consulting services upon request.",
  },
  {
    keywords: ["app", "mobile", "ios", "android", "mobile app"],
    answer: "Yes, we develop mobile apps using React Native and Flutter for both iOS and Android. Some of our notable app projects include Ballers App, Tibber Installer, and EsterCare.",
  },
  {
    keywords: ["web", "website", "frontend", "next.js", "react"],
    answer: "We build modern web applications using React and related technologies. Our web development covers everything from marketing sites to complex web applications.",
  },
  {
    keywords: ["backend", "api", "server", "cloud", "infrastructure"],
    answer: "We build robust backend systems using Node.js, Python, and Java, deployed on Google Cloud Platform (GCP) and Amazon Web Services (AWS).",
  },
  {
    keywords: ["consulting", "consultant", "hire", "freelance"],
    answer: "We offer individual consulting services. Our consultants are skilled professionals with expertise across strategy, design, development, and infrastructure. Contact us to discuss your needs.",
  },
  {
    keywords: ["design", "ux", "ui", "user experience", "user interface"],
    answer: "Our UX/UI design team creates user-centered digital experiences. We integrate strategy and design with development to deliver products that provide real user value.",
  },
  {
    keywords: ["price", "cost", "pricing", "budget", "how much", "quote"],
    answer: "Pricing varies depending on the project scope and requirements. We'd be happy to discuss your specific needs and provide a tailored estimate. Please reach out to us through www.hackberry.se.",
  },
];

/**
 * Try to find an auto-answer from the knowledge base.
 * Returns the answer string or null if no match.
 */
export function findAnswer(message) {
  const lower = message.toLowerCase();

  for (const qa of FAQ) {
    const match = qa.keywords.some((kw) => lower.includes(kw));
    if (match) return qa.answer;
  }

  return null;
}
