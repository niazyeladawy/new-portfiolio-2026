import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
	title: 'Niazy Eladawy | Senior Frontend Developer',
	description:
		"Senior Frontend Developer with 4.5+ years of experience building high-performance, scalable web applications for leading global brands including Nissan, Ford, Infiniti, and Lincoln. Skilled in React, Next.js, Vue.js, and Nuxt.js, with hands-on expertise in developing immersive 3D web experiences using Babylon.js and Three.js.",
	openGraph: {
		type: 'website',
		url: 'https://www.niazyeladawy.com/',
		title: 'Niazy Eladawy | Senior Frontend Developer Portfolio',
		description:
			"Senior Frontend Developer with 4.5+ years of experience building high-performance, scalable web applications for leading global brands including Nissan, Ford, Infiniti, and Lincoln.",
		images: [
			{
				url: 'https://www.niazyeladawy.com/og-image.png',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Niazy Eladawy | Senior Frontend Developer Portfolio',
		description:
			"Senior Frontend Developer skilled in React, Next.js, Vue.js, and Nuxt.js, with expertise in 3D web experiences using Babylon.js and Three.js.",
		images: ['https://www.niazyeladawy.com/og-image.png'],
	},
	icons: {
		icon: [
			{
				url: '/dark/favicon.ico',
				sizes: '16x16',
				type: 'image/png',
				media: '(prefers-color-scheme: dark)',
			},
			{
				url: '/dark/favicon.ico',
				sizes: '32x32',
				type: 'image/png',
				media: '(prefers-color-scheme: dark)',
			},
			{
				url: '/light/favicoc.ico',
				sizes: '16x16',
				type: 'image/png',
				media: '(prefers-color-scheme: light)',
			},
			{
				url: '/light/favicoc.ico',
				sizes: '32x32',
				type: 'image/png',
				media: '(prefers-color-scheme: light)',
			},
		],
		apple: [
			{
				url: '/dark/apple-touch-icon.png',
				sizes: '180x180',
				media: '(prefers-color-scheme: dark)',
			},
			{
				url: '/light/apple-touch-icon.png',
				sizes: '180x180',
				media: '(prefers-color-scheme: light)',
			},
		],
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang='en'>
			<head>
				{/* Google Fonts */}
				<link
					rel='preconnect'
					href='https://fonts.googleapis.com'
				/>
				<link
					rel='preconnect'
					href='https://fonts.gstatic.com'
					crossOrigin='anonymous'
				/>
				<link
					href='https://fonts.googleapis.com/css2?family=Fugaz+One&display=swap'
					rel='stylesheet'
				/>
				<link
					href='https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap'
					rel='stylesheet'
				/>
			</head>
			<body>{children}</body>
		</html>
	);
}
