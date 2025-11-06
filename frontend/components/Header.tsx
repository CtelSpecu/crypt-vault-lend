"use client";

import { WalletButton } from './WalletButton';
import Image from 'next/image';
import Link from 'next/link';

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image 
              src="/logo.png" 
              alt="CryptVault Lend Logo" 
              width={40} 
              height={40}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">CryptVault Lend</h1>
              <p className="text-xs text-muted-foreground">Private Lending with FHE</p>
            </div>
          </Link>
          
          <WalletButton />
        </div>
      </div>
    </header>
  );
};
