/* External dependencies */
import React from 'react'
import { createRoot } from 'react-dom/client'

/* Internal dependencies */
import App from './components/App'

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container)

root.render(<App />)
