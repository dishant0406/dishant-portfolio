import config from "@/config/config.json";

export const notFoundConfig = {
  title: "Page not found",
  code: "404",
  label: "Page not found",
  heading: config.notFound.heading,
  description: config.notFound.description,
  moleNote: "This way?",
  foundNote: "Found it!",
  foxNote: "z z z",
  interactions: {
    hiker: "Help the hiker read his map",
    snail: "Say hello to the shy snail",
    mole: "Play peekaboo with the mole",
    fox: "Wake the sleepy fox",
  },
  home: { label: "Back to home", href: "/" },
} as const;
