const fs = require('fs')
const path = require('path')

// Create directory structure
const directories = [
  'public/images/logos/robokorda',
  'public/images/logos/schools/demo-high-school',
  'public/images/logos/schools/example-primary',
  'public/images/logos/schools/example-secondary',
  'public/images/avatars/teachers',
  'public/images/avatars/students'
]

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

// Create Robokorda logo SVG
const robokordaLogo = `<svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="40" rx="8" fill="url(#gradient)"/>
  <defs>
    <linearGradient id="gradient" x1="0" y1="0" x2="120" y2="40">
      <stop stop-color="#3B82F6"/>
      <stop offset="1" stop-color="#8B5CF6"/>
    </linearGradient>
  </defs>
  <text x="20" y="28" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white">ROBOKORDA</text>
</svg>`

// Create school logo SVG
const schoolLogo = `<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="48" fill="#3B82F6" stroke="#1D4ED8" stroke-width="4"/>
  <path d="M50 20 L70 40 L80 30 L60 10 L50 20 Z" fill="white"/>
  <path d="M20 40 L40 60 L50 50 L30 30 L20 40 Z" fill="white"/>
  <path d="M50 50 L70 70 L80 60 L60 40 L50 50 Z" fill="white"/>
  <text x="50" y="85" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="white">DHS</text>
</svg>`

// Write SVG files
fs.writeFileSync('public/images/logos/robokorda/logo.svg', robokordaLogo)
fs.writeFileSync('public/images/logos/schools/demo-high-school/logo.svg', schoolLogo)

// Create PNG versions (placeholder - you'll need to replace with actual PNGs)
console.log('Logo directories created successfully!')
console.log('Please place your actual logo files in:')
console.log('- public/images/logos/robokorda/logo.png')
console.log('- public/images/logos/robokorda/logo-white.png')
console.log('- public/images/logos/schools/demo-high-school/logo.png')