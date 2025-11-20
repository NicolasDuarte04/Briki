'use client';
import React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { InstagramIcon, LinkedinIcon, YoutubeIcon, MailIcon } from 'lucide-react';
import Image from 'next/image';

interface FooterLink {
	title: string;
	href: string;
	icon?: React.ComponentType<{ className?: string }>;
}

interface FooterSection {
	label: string;
	links: FooterLink[];
}

const footerLinks: FooterSection[] = [
	{
		label: 'Product',
		links: [
			{ title: 'Features', href: '#features' },
			{ title: 'Pricing', href: '#pricing' },
			{ title: 'Demo', href: '#demo' },
			{ title: 'Integration', href: '/' },
		],
	},
	{
		label: 'Company',
		links: [
			{ title: 'About Us', href: '/about' },
			{ title: 'Careers', href: 'mailto:talent@brikiapp.com' },
			{ title: 'Privacy Policy', href: '/privacy' },
			{ title: 'Terms of Services', href: '/terms' },
		],
	},
	{
		label: 'Resources',
		links: [
			{ title: 'Help Center', href: '/help' },
			{ title: 'Contact', href: 'mailto:contact@brikiapp.com' },
			{ title: 'Blog', href: '/blog' },
			{ title: 'Documentation', href: '/docs' },
		],
	},
	{
		label: 'Social Links',
		links: [
			{ title: 'LinkedIn', href: 'https://www.linkedin.com/company/brikiapp/', icon: LinkedinIcon },
			{ title: 'Email', href: 'mailto:contact@brikiapp.com', icon: MailIcon },
			{ title: 'Instagram', href: '#', icon: InstagramIcon },
			{ title: 'YouTube', href: '#', icon: YoutubeIcon },
		],
	},
];

type FooterProps = {
	className?: string;
};

export function Footer({ className }: FooterProps) {
	return (
		<footer className={`md:rounded-t-6xl relative w-full flex flex-col items-center justify-center rounded-t-4xl border-t bg-white px-6 py-12 lg:py-16 ${className || ''}`}>
			<div className="bg-foreground/20 absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur" />

			<div className="grid w-full max-w-6xl mx-auto gap-8 xl:grid-cols-3 xl:gap-8">
				<AnimatedContainer className="space-y-4">
					<div className="flex items-center gap-2">
						<Image
							src="/brand/briki-logo-2.png"
							alt="Briki logo"
							width={32}
							height={32}
							className="w-8 h-8"
							priority
						/>
						<span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent select-none font-inter">
							Briki
						</span>
					</div>
					<p className="text-muted-foreground mt-8 text-sm md:mt-0">
						© {new Date().getFullYear()} Briki. All rights reserved.
					</p>
				</AnimatedContainer>

				<div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2 xl:mt-0">
					{footerLinks.map((section, index) => (
						<AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
							<div className="mb-10 md:mb-0">
								<h3 className="text-xs font-semibold text-foreground mb-4">{section.label}</h3>
								<ul className="text-muted-foreground mt-4 space-y-2 text-sm">
									{section.links.map((link) => (
										<li key={link.title}>
											<a
												href={link.href}
												className="hover:text-foreground inline-flex items-center transition-all duration-300"
												target={link.href.startsWith('http') ? '_blank' : undefined}
												rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
											>
												{link.icon && <link.icon className="me-1 size-4" />}
												{link.title}
											</a>
										</li>
									))}
								</ul>
							</div>
						</AnimatedContainer>
					))}
				</div>
			</div>
		</footer>
	);
}

type ViewAnimationProps = {
	delay?: number;
	className?: string;
	children: ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
	const shouldReduceMotion = useReducedMotion();

	if (shouldReduceMotion) {
		return <div className={className}>{children}</div>;
	}

	return (
		<div className={className}>
			<motion.div
				initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
				whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
				viewport={{ once: true }}
				transition={{ delay, duration: 0.8 }}
			>
				{children}
			</motion.div>
		</div>
	);
}

export default Footer;
