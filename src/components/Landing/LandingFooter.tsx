'use client';
import React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { InstagramIcon, LinkedinIcon, YoutubeIcon, MailIcon } from 'lucide-react';
import Image from 'next/image';
import { useSafeTranslations } from '@/hooks/useSafeTranslations';

interface FooterLink {
	title: string;
	href: string;
	icon?: React.ComponentType<{ className?: string }>;
}

interface FooterSection {
	label: string;
	links: FooterLink[];
}

export function LandingFooter() {
    const { t } = useSafeTranslations('footer');

    const footerLinks: FooterSection[] = [
        {
            label: t('product.label'),
            links: [
                { title: t('product.links.features'), href: '#how' },
                { title: t('product.links.pricing'), href: '#pricing' },
                { title: t('product.links.demo'), href: '#demo' },
                { title: t('product.links.integration'), href: '/' },
            ],
        },
        {
            label: t('company.label'),
            links: [
                { title: t('company.links.about'), href: '/about' },
                { title: t('company.links.careers'), href: 'mailto:talent@brikiapp.com' },
                { title: t('company.links.privacy'), href: '/privacy' },
                { title: t('company.links.terms'), href: '/terms' },
            ],
        },
        {
            label: t('resources.label'),
            links: [
                { title: t('resources.links.help'), href: '/help' },
                { title: t('resources.links.contact'), href: 'mailto:contact@brikiapp.com' },
                { title: t('resources.links.blog'), href: '/blog' },
                { title: t('resources.links.documentation'), href: '/docs' },
            ],
        },
        {
            label: t('social.label'),
            links: [
                { title: t('social.links.linkedin'), href: 'https://www.linkedin.com/company/brikiapp/', icon: LinkedinIcon },
                { title: t('social.links.email'), href: 'mailto:contact@brikiapp.com', icon: MailIcon },
                { title: t('social.links.instagram'), href: '#', icon: InstagramIcon },
                { title: t('social.links.youtube'), href: '#', icon: YoutubeIcon },
            ],
        },
    ];
	return (
		<footer className="md:rounded-t-6xl relative w-full flex flex-col items-center justify-center rounded-t-4xl border-t bg-white px-6 pt-12 pb-32 lg:pt-16 lg:pb-40">
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
						© {new Date().getFullYear()} Briki. {t('rights')}
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

