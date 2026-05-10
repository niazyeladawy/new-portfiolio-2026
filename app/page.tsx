'use client';

import Hero from './components/Hero';
import About from './components/About';
import StackCards from './components/StackCards';
import Contact from './components/Contact';

const Home = () => {
  return (
    <>
      <Hero startAnimation />
      <About />
      <StackCards />
      <Contact />
    </>
  );
};

export default Home;
