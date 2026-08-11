'use client';

import Hero from './components/Hero';
import About from './components/About';
import ProjectsCarousel3D from './components/ProjectsCarousel3D';
import Contact from './components/Contact';

/*
  Panel order is also the colour order: lightblue → ivory → red → yellow. Each
  full-bleed block is its own ground, and the transitions between them are
  domes rather than shadows. Olive is held back for the nav — its toggle is
  fixed over every one of these panels, so the one colour it cannot share is
  the one under it.

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
