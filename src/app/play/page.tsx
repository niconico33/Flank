'use client';

import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import SinglePlayerGameClient from '../../components/SinglePlayerGameClient';

export default function PlayPage() {
  return (
    <>
      <Navbar />
      <SinglePlayerGameClient />
      <Footer />
    </>
  );
} 