import config from "@/config/config.json";
import type { Testimonial } from "@/config/types";

export const testimonialsSectionConfig = {
  title: config.testimonials.title,
  seeMoreLabel: "View all",
};

export const testimonialsConfig = config.testimonials.items as Testimonial[];
