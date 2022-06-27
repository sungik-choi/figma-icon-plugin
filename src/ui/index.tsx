/* External dependencies */
import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  MemoryRouter,
  Routes,
  Route,
} from "react-router-dom";
import {
  BezierProvider,
  LightFoundation,
} from '@channel.io/bezier-react';

/* Internal dependencies */
import IconExtract from './components/IconExtract'
import Home from './components/Home'

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container)

root.render(
  <BezierProvider foundation={LightFoundation}>
    <MemoryRouter>
      <Routes>
        <Route index element={(<Home />)} />
        <Route path="extract" element={(<IconExtract />)} />
      </Routes>
    </MemoryRouter>
  </BezierProvider>
)
