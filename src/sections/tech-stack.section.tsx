'use client';

import { BiLogoTypescript } from 'react-icons/bi';
import { DiMongodb } from 'react-icons/di';
import {
	FaBootstrap,
	FaCube,
	FaDocker,
	FaNodeJs,
	FaReact,
	FaSass,
	FaVuejs,
} from 'react-icons/fa';
import {
	SiExpress,
	SiFirebase,
	SiGraphql,
	SiJest,
	SiMui,
	SiNuxtdotjs,
	SiRedux,
	SiTailwindcss,
} from 'react-icons/si';
import { TbBrandNextjs } from 'react-icons/tb';
import { VscCode } from 'react-icons/vsc';

import { GlowBox } from '../components/glow-box';
import { SectionTitle } from '../components/section-title.component';

const techs = [
	{
		heading: 'Frontend Frameworks',
		items: [
			{
				title: 'React.js',
				icon: <FaReact color='rgb(97, 219, 251)' />,
				color: 'rgb(97, 219, 251, 0.6)',
			},
			{
				title: 'Next.js',
				icon: <TbBrandNextjs color='rgb(255, 255, 255)' />,
				color: 'rgba(255, 255, 255, 0.4)',
			},
			{
				title: 'Vue.js',
				icon: <FaVuejs color='rgb(65, 184, 131)' />,
				color: 'rgb(65, 184, 131, 0.6)',
			},
			{
				title: 'Nuxt.js',
				icon: <SiNuxtdotjs color='rgb(0, 220, 130)' />,
				color: 'rgb(0, 220, 130, 0.6)',
			},
			{
				title: 'TypeScript',
				icon: <BiLogoTypescript color='rgb(0, 122, 204)' />,
				color: 'rgba(0, 122, 204, 0.6)',
			},
			{
				title: 'Redux',
				icon: <SiRedux color='rgb(118, 74, 188)' />,
				color: 'rgb(118, 74, 188, 0.6)',
			},
		],
	},
	{
		heading: 'UI & Styling',
		items: [
			{
				title: 'Tailwind CSS',
				icon: <SiTailwindcss color='rgb(6, 182, 212)' />,
				color: 'rgb(6, 182, 212, 0.7)',
			},
			{
				title: 'Material UI',
				icon: <SiMui color='rgb(0, 127, 255)' />,
				color: 'rgb(0, 127, 255, 0.6)',
			},
			{
				title: 'Shadcn',
				icon: <VscCode color='rgb(255, 255, 255)' />,
				color: 'rgba(255, 255, 255, 0.4)',
			},
			{
				title: 'Bootstrap',
				icon: <FaBootstrap color='rgb(125, 17, 248)' />,
				color: 'rgb(125, 17, 248, 0.75)',
			},
			{
				title: 'Sass',
				icon: <FaSass color='rgb(204, 102, 153)' />,
				color: 'rgb(204, 102, 153, 0.7)',
			},
		],
	},
	{
		heading: '3D & Interactive Web',
		items: [
			{
				title: 'Babylon.js',
				icon: <FaCube color='rgb(187, 72, 47)' />,
				color: 'rgb(187, 72, 47, 0.7)',
			},
			{
				title: 'Three.js',
				icon: <FaCube color='rgb(255, 255, 255)' />,
				color: 'rgba(255, 255, 255, 0.4)',
			},
		],
	},
	{
		heading: 'Backend & APIs',
		items: [
			{
				title: 'Node.js',
				icon: <FaNodeJs color='rgb(104, 160, 99)' />,
				color: 'rgb(104, 160, 99)',
			},
			{
				title: 'Express.js',
				icon: <SiExpress color='rgba(255, 255, 255)' />,
				color: 'rgba(255, 255, 255, 0.4)',
			},
			{
				title: 'MongoDB',
				icon: <DiMongodb color='rgb(0, 237, 100)' />,
				color: 'rgb(0, 237, 100, 0.7)',
			},
			{
				title: 'GraphQL',
				icon: <SiGraphql color='rgb(229, 53, 171)' />,
				color: 'rgb(229, 53, 171, 0.6)',
			},
			{
				title: 'Firebase',
				icon: <SiFirebase color='rgb(255, 196, 0)' />,
				color: 'rgb(255, 196, 0, 0.6)',
			},
		],
	},
	{
		heading: 'Testing & DevOps',
		items: [
			{
				title: 'Jest',
				icon: <SiJest color='rgb(153, 66, 91)' />,
				color: 'rgb(153, 66, 91, 0.7)',
			},
			{
				title: 'Vitest',
				icon: <VscCode color='rgb(109, 179, 63)' />,
				color: 'rgb(109, 179, 63, 0.7)',
			},
			{
				title: 'Cypress',
				icon: <VscCode color='rgb(255, 255, 255)' />,
				color: 'rgba(255, 255, 255, 0.4)',
			},
			{
				title: 'Playwright',
				icon: <VscCode color='rgb(46, 173, 51)' />,
				color: 'rgb(46, 173, 51, 0.6)',
			},
			{
				title: 'Docker',
				icon: <FaDocker color='rgb(33, 150, 243)' />,
				color: 'rgb(33, 150, 243, 0.6)',
			},
		],
	},
];

export const TechStack = () => {
	return (
		<section
			className='tech-stack'
			id='tech-stack'
		>
			<div className='tech-grid'>
				{techs.map((tech, index) => (
					<div key={index}>
						<p>{tech.heading}</p>
						<div className='tech-row'>
							{tech.items.map((item, index) => (
								<GlowBox
									key={index}
									icon={item.icon}
									color={item.color}
									title={item.title}
								/>
							))}
						</div>
					</div>
				))}
			</div>
			<div>
				<SectionTitle
					title='Tech'
					subTitle='SET'
				/>
			</div>
		</section>
	);
};
