'use client';

import Hero from './components/Hero';
import About from './components/About';
import ProjectsCarousel3D from './components/ProjectsCarousel3D';
import Contact from './components/Contact';

/*
  The WebGL projects drum replaces the stacked cards for now. StackCards is
  kept intact — swap the two lines below to put it back.
*/
// import StackCards from './components/StackCards';

const Home = () => {
  return (
    <>
      <Hero startAnimation />
      <About />
      {/* <StackCards /> */}
      <ProjectsCarousel3D />
      <Contact />
    </>
  );
};

export default Home;
