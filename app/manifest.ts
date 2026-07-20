import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Embark LMS',
    short_name: 'Embark',
    description: 'Online learning management system for AI courses by Embark AI Institute',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3d5a80',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      },
      {
        src: '/Logo.png',
        sizes: '512x512', // Updated to match the new 512x512 hexagon Logo.png
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  }
}
