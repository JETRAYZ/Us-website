import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'US Private Space',
    short_name: 'US Space',
    description: 'A private space for the two of us.',
    start_url: '/',
    display: 'standalone',
    background_color: '#141414',
    theme_color: '#141414',
    icons: [
      {
        src: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', // Placeholder or use a proper icon if available
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
