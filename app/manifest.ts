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
        sizes: '642x642', // Original dimensions from public/Logo.png (642px x 642px)
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  }
}
