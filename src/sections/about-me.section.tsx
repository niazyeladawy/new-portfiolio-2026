'use client';

import { SectionTitle } from '../components/section-title.component';

const timeline = [
	{
		title: 'Experience',
		items: [
			{
				title: 'Senior Frontend Developer',
				place: '@Alternative, Dubai, UAE',
				timePeriod: 'Aug 2024 - Present',
				description: (
					<ul>
						<li>
							Led frontend development for enterprise CMS and eCommerce platforms
							for <strong>Ford</strong>, <strong>Lincoln</strong>, and{' '}
							<strong>Nissan</strong> websites, collaborating with designers,
							architects, and PMs to deliver projects on time across 6+ markets.
						</li>
						<li>
							Built scalable, high-performance websites and microsites using{' '}
							<strong>Next.js</strong>, <strong>React.js</strong>,{' '}
							<strong>GSAP</strong>, and microfrontend architecture, improving
							page load speed by 30%+ and SEO visibility by 20%.
						</li>
						<li>
							Developed 3D interactive experiences (e.g., Nissan Magnite
							Configurator) with <strong>Babylon.js</strong>, including AR
							support, multi-angle camera views, and real-time customization,
							boosting user engagement by 40%+.
						</li>
						<li>
							Utilized CI/CD pipelines with Docker and GitHub Actions, reducing
							deployment times from 8 hours to 5 minutes and improving release
							reliability by 90%.
						</li>
						<li>
							Mentored 3+ junior developers, standardized coding practices, and
							implemented modern frontend frameworks, increasing team productivity
							by 25%.
						</li>
					</ul>
				),
			},
			{
				title: 'Frontend Developer',
				place: '@Accura Group, Mansoura, Egypt',
				timePeriod: 'Sep 2022 - Jun 2024',
				description: (
					<ul>
						<li>
							Delivered 15+ responsive web applications, including SaaS
							platforms, e-commerce sites, dashboards, and landing pages,
							ensuring mobile-first design, cross-browser compatibility, and high
							performance.
						</li>
						<li>
							Developed the <strong>Fatoorah SaaS</strong> Invoicing & Stock
							Management Dashboard (fatoorah.ai) using <strong>React.js</strong>{' '}
							and <strong>Redux</strong>, enabling clients to manage products,
							inventory, POS operations, warehouses, buyers, and sellers on a
							multi-tenant platform.
						</li>
						<li>
							Collaborated with designers, backend engineers, and product
							managers to deliver scalable, maintainable, and business-impactful
							frontend solutions, improving load times by 30%+.
						</li>
					</ul>
				),
			},
			{
				title: 'Frontend Developer',
				place: '@Blink, Mansoura, Egypt',
				timePeriod: 'Jun 2021 - Sep 2022',
				description: (
					<ul>
						<li>
							Contributed to frontend UI development using HTML, CSS, JavaScript,
							and React, building responsive and high-performance interfaces.
						</li>
						<li>
							Collaborated closely with designers and backend engineers to
							deliver pixel-perfect, user-friendly, and accessible interfaces
							across web applications.
						</li>
					</ul>
				),
			},
		],
	},
	{
		title: 'Education',
		items: [
			{
				title: "Bachelor's Degree in Computer & Systems Engineering",
				place: 'Mansoura University, Mansoura, Egypt',
				timePeriod: 'Sep 2015 - May 2020',
				description: '',
			},
		],
	},
];

export const AboutMe = () => {
	return (
		<section
			className='about-me container'
			id='about-me'
		>
			<div>
				<SectionTitle
					title='About'
					subTitle='ME'
				/>
			</div>
			<div>
				<div className='intro'>
					<p style={{ marginTop: '20px' }}>
						Hey, I'm Niazy Eladawy, a Senior Frontend Developer based in Dubai,
						UAE.
					</p>
					<p>
						I have <strong>4.5+ years</strong> of experience building
						high-performance, scalable web applications for leading global
						brands including <strong>Nissan</strong>, <strong>Ford</strong>,{' '}
						<strong>Infiniti</strong>, and <strong>Lincoln</strong>.
					</p>
					<p>
						Skilled in <strong>React</strong>, <strong>Next.js</strong>,{' '}
						<strong>Vue.js</strong>, and <strong>Nuxt.js</strong>, with hands-on
						expertise in developing immersive 3D web experiences using{' '}
						<strong>Babylon.js</strong> and <strong>Three.js</strong>. Strong
						focus on clean architecture, maintainability, and delivering
						business-impactful frontend solutions.
					</p>
				</div>
				<div>
					{timeline.map(({ items, title }, idx) => (
						<div
							className='timeline'
							key={idx}
						>
							<h1>{title}</h1>
							{items.map(({ title, place, timePeriod, description }, idx) => (
								<div
									className='timeline-list'
									key={idx}
								>
									<div className='timeline-item'>
										<p className='designation'>{title}</p>
										<p className='place'>
											{place} | {timePeriod}
										</p>
										<div className='timeline-description'>{description}</div>
									</div>
								</div>
							))}
						</div>
					))}
				</div>
			</div>
		</section>
	);
};
