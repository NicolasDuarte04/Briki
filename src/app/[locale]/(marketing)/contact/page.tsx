import type { Metadata } from "next";
import { LandingContact } from "@/components/Landing/LandingContact";

export const metadata: Metadata = {
  title: "Contact • Briki",
  description: "Get in touch with Briki. Have questions or ready to streamline your brokerage? We're here to help.",
};

export default function ContactPage() {
  return <LandingContact />;
}

